// Flight globe: the jet flying the route over the globe, as a mountable window object.
//
//   const globe = await mountGlobe(host, options);   // builds its own canvas and UI inside host
//   globe.play(); globe.pause(); globe.restart(); globe.seekToStop(3);
//   globe.on('ready' | 'stop' | 'complete' | 'error', fn);   // returns an unsubscribe function
//   const still = globe.renderStill({ stop: 9, width: 1120, height: 700 });   // a canvas of that stop, no UI
//   globe.dispose();                                   // removes everything it made
//
// Options (all optional): background, tailLogoUrl, countriesUrl, stops, colors, labels, nameToCc, palette, timing,
// reducedMotion, lite, autoplay, jetScale. Defaults are in globe-data.js.
// It renders only while the host is on screen and the tab is visible, and only one globe lives at a time.
// If WebGL or the country shapes fail it throws a plain Error and leaves no DOM behind, so the page can show its fallback.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import gsap from 'gsap';
import { createJet } from './jet.js';
import { STOPS, KINDS, kindOf, COLORS, NAME_TO_CC, LABELS, PALETTE, TIMING, clamp, latLonToXYZ, routeFor, sampleRoute, decodeTopo, splitFrance, hashString } from './globe-data.js';

let live = null;
const lerp = (a, b, t) => a + (b - a) * t;
const pad2 = (n) => String(n).padStart(2, '0');

export async function mountGlobe(host, options = {}) {
  const o = {
    background: '#0e0c0b', tailLogoUrl: null, countriesUrl: 'vendor/data/countries-110m.json',
    stops: STOPS, colors: COLORS, nameToCc: NAME_TO_CC, labels: LABELS, palette: PALETTE, timing: TIMING,
    reducedMotion: typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
    lite: false, autoplay: true, jetScale: 0.12,
    ...options,
  };
  if (live) live.dispose();
  const P = o.palette, T = o.timing;

  /* ----------------------------------------------------------------- DOM (detached until everything is ready) */
  const el = (tag, cls, attrs = {}) => { const n = document.createElement(tag); n.className = cls; for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); return n; };
  const root = el('div', 'globe-root');
  const canvas = el('canvas', 'globe-canvas', { 'aria-hidden': 'true' });
  const labelsEl = el('div', 'globe-labels', { 'aria-hidden': 'true' });
  const legend = el('ol', 'globe-legend', { 'aria-label': 'Route' });
  const scrim = el('div', 'globe-scrim', { 'aria-hidden': 'true' });
  const card = el('div', 'globe-card', { 'aria-live': 'polite' });
  const cardNo = el('div', 'globe-card-no'), cardCity = el('div', 'globe-card-city'), cardWhen = el('div', 'globe-card-when'), cardWhat = el('div', 'globe-card-what');
  card.append(cardNo, cardCity, cardWhen, cardWhat);
  const bar = el('div', 'globe-bar');
  const playBtn = el('button', 'globe-play', { type: 'button', 'aria-label': 'Pause the flight' }); playBtn.textContent = 'Pause';
  const restartBtn = el('button', 'globe-restart', { type: 'button', 'aria-label': 'Restart the flight' }); restartBtn.textContent = 'Restart';
  const scrub = el('input', 'globe-scrub', { type: 'range', min: '0', max: '1000', value: '0', 'aria-label': 'Position along the route' });
  bar.append(playBtn, restartBtn, scrub);
  const stopBtns = o.stops.map((s, i) => {
    const kind = kindOf(s);
    const li = el('li', 'globe-stop', { 'data-kind': kind });
    li.style.setProperty('--globe-stop-color', o.colors[s.cc] || P.ring);
    const b = el('button', 'globe-stop-btn', { type: 'button', 'aria-label': `Go to stop ${i + 1}, ${s.city}, ${s.country}` });
    const n = el('span', 'globe-stop-n'); n.textContent = pad2(i + 1);
    const chip = el('span', 'globe-stop-chip');
    const c = el('span', 'globe-stop-c');
    const city = el('b'); city.textContent = s.city;
    const tag = el('span', 'globe-stop-kind'); tag.textContent = KINDS[kind].label;
    const sub = el('span', 'globe-stop-sub'); sub.append(tag, document.createTextNode(`${s.country} · ${s.when}`));
    c.append(city, sub); b.append(n, chip, c); li.append(b); legend.append(li);
    return b;
  });
  const labelObjs = o.labels.map((l) => { const d = el('div', 'globe-label'); d.textContent = l.name; labelsEl.append(d); return { el: d, v: new THREE.Vector3(...latLonToXYZ(l.lat, l.lon, 1.01)) }; });
  root.append(canvas, labelsEl, legend, scrim, card, bar);

  /* ----------------------------------------------------------------- renderer */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    if (!renderer.getContext()) throw new Error('no context');
  } catch (e) {
    throw new Error('globe: WebGL is not available');
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  if (o.background === 'transparent') renderer.setClearColor(0x000000, 0); else renderer.setClearColor(new THREE.Color(o.background), 1);

  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 80);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = keep(pmrem.fromScene(new RoomEnvironment(), 0.04).texture);
  scene.environmentIntensity = 0.45;
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xdfe8f0, 0x2a1d16, 0.55));
  const key = new THREE.DirectionalLight(0xfff1dc, 1.9); scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x2be0d1, 0.6); rim.position.set(-3, 1, -4); scene.add(rim);

  // stars
  {
    const n = o.lite ? 400 : 800, pos = new Float32Array(n * 3), v = new THREE.Vector3();
    for (let i = 0; i < n; i++) { v.randomDirection().multiplyScalar(38 + Math.random() * 30); pos.set([v.x, v.y, v.z], i * 3); }
    const g = keep(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, keep(new THREE.PointsMaterial({ color: P.star, size: 0.13, sizeAttenuation: true, transparent: true, opacity: 0.45, depthWrite: false }))));
  }

  /* ----------------------------------------------------------------- the globe */
  function buildEarthTexture(countries) {
    const W = o.lite ? 1024 : 2048, H = W / 2;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const og = x.createLinearGradient(0, 0, 0, H);
    og.addColorStop(0, P.ocean[0]); og.addColorStop(0.5, P.ocean[1]); og.addColorStop(1, P.ocean[2]);
    x.fillStyle = og; x.fillRect(0, 0, W, H);
    x.lineWidth = W / 2048;
    for (let lon = -180; lon <= 180; lon += 15) { x.strokeStyle = P.graticule; x.beginPath(); x.moveTo((lon + 180) / 360 * W, 0); x.lineTo((lon + 180) / 360 * W, H); x.stroke(); }
    for (let lat = -75; lat <= 75; lat += 15) { x.strokeStyle = lat === 0 ? P.equator : P.graticule; x.beginPath(); x.moveTo(0, (90 - lat) / 180 * H); x.lineTo(W, (90 - lat) / 180 * H); x.stroke(); }
    const trace = (c) => {
      x.beginPath();
      for (const poly of c.polys) for (const r of poly) {
        let prevLon = null;
        r.forEach(([lon, lat], i) => {
          const px = (lon + 180) / 360 * W, py = (90 - lat) / 180 * H;
          if (i === 0 || Math.abs(lon - prevLon) > 180) x.moveTo(px, py); else x.lineTo(px, py);   // a jump over the date line starts a new sub-path
          prevLon = lon;
        });
        x.closePath();
      }
    };
    for (const c of countries) {
      const cc = o.nameToCc[c.name];
      x.fillStyle = cc ? o.colors[cc] : c.id === '010' || c.id === '304' ? P.ice : P.land[hashString(c.id) % P.land.length];
      trace(c); x.fill('evenodd');
    }
    x.lineJoin = 'round';
    x.strokeStyle = P.border; x.lineWidth = 1.2 * (W / 2048); for (const c of countries) { trace(c); x.stroke(); }
    x.strokeStyle = P.outline; x.lineWidth = 2 * (W / 2048); for (const c of countries) if (o.nameToCc[c.name]) { trace(c); x.stroke(); }
    const pg = x.createLinearGradient(0, 0, 0, H);
    pg.addColorStop(0, P.polar); pg.addColorStop(0.08, 'rgba(0,0,0,0)'); pg.addColorStop(0.92, 'rgba(0,0,0,0)'); pg.addColorStop(1, P.polar);
    x.fillStyle = pg; x.fillRect(0, 0, W, H);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return tex;
  }

  let countries;
  try {
    const res = await fetch(o.countriesUrl);
    if (!res.ok) throw new Error(res.status);
    countries = splitFrance(decodeTopo(await res.json()));
  } catch (e) {
    renderer.dispose();
    throw new Error(`globe: could not load the country shapes from ${o.countriesUrl}`);
  }

  const globe = new THREE.Group(); scene.add(globe);
  const earthMat = keep(new THREE.MeshStandardMaterial({ map: keep(buildEarthTexture(countries)), roughness: 0.92, metalness: 0 }));
  globe.add(new THREE.Mesh(keep(new THREE.SphereGeometry(1, o.lite ? 64 : 96, o.lite ? 40 : 64)), earthMat));
  globe.add(new THREE.Mesh(
    keep(new THREE.SphereGeometry(1.06, o.lite ? 32 : 48, o.lite ? 24 : 32)),
    keep(new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color(P.atmosphere) } },
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
      fragmentShader: 'uniform vec3 uColor; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 4.0); gl_FragColor = vec4(uColor, f*0.5); }',
    })),
  ));

  /* ----------------------------------------------------------------- route */
  const route = routeFor(o.stops, T);
  const LEGS = route.legs, SAMPLES = T.samples;
  const Pv = route.points.map((p) => new THREE.Vector3(...p));
  const routeArr = sampleRoute(route, SAMPLES);
  const resolution = new THREE.Vector2(1, 1);
  const routeAhead = new Line2(keep(new LineGeometry().setPositions(routeArr)),
    keep(new LineMaterial({ color: P.ahead, linewidth: 1.4, transparent: true, opacity: 0.32, dashed: true, dashSize: 0.012, gapSize: 0.02, resolution })));
  routeAhead.computeLineDistances();
  globe.add(routeAhead);
  const legLines = [];
  for (let i = 0; i < LEGS; i++) {
    const slice = Array.from(routeArr.subarray(i * SAMPLES * 3, (i * SAMPLES + SAMPLES + 1) * 3));
    const line = new Line2(keep(new LineGeometry().setPositions(slice)), keep(new LineMaterial({ color: P.route, linewidth: 2.6, transparent: true, opacity: 1, resolution })));
    line.geometry.instanceCount = 0;
    globe.add(line); legLines.push(line);
  }
  // stop markers by kind: born is a ring with a center dot (the start look), study a hollow ring in a cool tone,
  // work a filled dot in a warm tone. Shape and tone together, so the kinds read without relying on color alone.
  const markerGeo = {
    ring: keep(new THREE.RingGeometry(0.014, 0.021, 36)),
    dot: keep(new THREE.CircleGeometry(0.017, 36)),
    target: keep(new THREE.RingGeometry(0.015, 0.021, 36)),
    center: keep(new THREE.CircleGeometry(0.007, 24)),
  };
  const tones = { born: P.ring, study: P.study, work: P.work };
  const zUnit = new THREE.Vector3(0, 0, 1);
  const ringMats = o.stops.map((s) => {
    const kind = kindOf(s), shape = KINDS[kind].marker;
    const v = new THREE.Vector3(...latLonToXYZ(s.lat, s.lon, 1.003)), q = new THREE.Quaternion().setFromUnitVectors(zUnit, v.clone().normalize());
    const m = keep(new THREE.MeshBasicMaterial({ color: tones[kind], transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }));
    const r = new THREE.Mesh(markerGeo[shape], m); r.position.copy(v); r.quaternion.copy(q); globe.add(r);
    if (shape === 'target') { const c = new THREE.Mesh(markerGeo.center, m); c.position.copy(v); c.quaternion.copy(q); globe.add(c); }
    return m;
  });
  const pulse = new THREE.Mesh(keep(new THREE.RingGeometry(0.014, 0.017, 40)), keep(new THREE.MeshBasicMaterial({ color: P.route, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })));
  globe.add(pulse);

  /* ----------------------------------------------------------------- contrails */
  class Trail {
    constructor(n) {
      this.n = n; this.count = 0; this.has = false;
      this.pts = new Float32Array(n * 3); this.born = new Float32Array(n);
      this.pos = new Float32Array(n * 6); this.alpha = new Float32Array(n * 2);
      const geo = keep(new THREE.BufferGeometry());
      geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
      const idx = []; for (let i = 0; i < n - 1; i++) { const a = i * 2, b = a + 2; idx.push(a, a + 1, b, a + 1, b + 1, b); }
      geo.setIndex(idx);
      this.mesh = new THREE.Mesh(geo, keep(new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
        uniforms: { uColor: { value: new THREE.Color(P.contrail) } },
        vertexShader: 'attribute float alpha; varying float vA; void main(){ vA = alpha; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
        fragmentShader: 'uniform vec3 uColor; varying float vA; void main(){ gl_FragColor = vec4(uColor, vA); }',
      })));
      this.mesh.frustumCulled = false;
      this.last = new THREE.Vector3();
      this.P = new THREE.Vector3(); this.Q = new THREE.Vector3(); this.dir = new THREE.Vector3(); this.view = new THREE.Vector3(); this.right = new THREE.Vector3();
    }
    reset() { this.count = 0; this.has = false; this.alpha.fill(0); this.mesh.geometry.attributes.alpha.needsUpdate = true; }
    push(p, now) {
      if (this.has) { const d = p.distanceTo(this.last); if (d < 0.0025) return; if (d > 0.12) this.reset(); }
      this.pts.copyWithin(3, 0, (this.n - 1) * 3); this.born.copyWithin(1, 0, this.n - 1);
      this.pts[0] = p.x; this.pts[1] = p.y; this.pts[2] = p.z; this.born[0] = now;
      this.count = Math.min(this.n, this.count + 1); this.last.copy(p); this.has = true;
    }
    update(camPos, now) {
      const { n, pts, pos, alpha, P: Pp, Q, dir, view, right } = this;
      for (let i = 0; i < n; i++) {
        const k = Math.min(i, Math.max(0, this.count - 1));
        Pp.set(pts[k * 3], pts[k * 3 + 1], pts[k * 3 + 2]);
        const j = k > 0 ? k - 1 : Math.min(1, this.count - 1);
        Q.set(pts[j * 3], pts[j * 3 + 1], pts[j * 3 + 2]);
        dir.subVectors(Pp, Q); if (dir.lengthSq() < 1e-10) dir.set(0, 1, 0);
        view.subVectors(camPos, Pp);
        right.crossVectors(dir, view).normalize();
        const f = i / (n - 1), w = 0.0022 + 0.007 * f;
        const age = now - this.born[k];
        const a = i < this.count && this.count > 1 ? 0.5 * (1 - f) * (1 - f) * clamp(1 - age / 2.2, 0, 1) : 0;
        pos[i * 6] = Pp.x + right.x * w; pos[i * 6 + 1] = Pp.y + right.y * w; pos[i * 6 + 2] = Pp.z + right.z * w;
        pos[i * 6 + 3] = Pp.x - right.x * w; pos[i * 6 + 4] = Pp.y - right.y * w; pos[i * 6 + 5] = Pp.z - right.z * w;
        alpha[i * 2] = a; alpha[i * 2 + 1] = a;
      }
      this.mesh.geometry.attributes.position.needsUpdate = true;
      this.mesh.geometry.attributes.alpha.needsUpdate = true;
    }
  }
  const trails = [new Trail(42), new Trail(42)];
  for (const t of trails) scene.add(t.mesh);

  /* ----------------------------------------------------------------- jet */
  const emitter = new Map();
  const emit = (ev, data) => { for (const fn of emitter.get(ev) || []) { try { fn(data); } catch (e) { console.error('globe listener:', e); } } };
  let logoImg = null;
  if (o.tailLogoUrl) {
    try { logoImg = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('tail logo')); im.src = o.tailLogoUrl; }); }
    catch (e) { logoImg = null; queueMicrotask(() => emit('error', new Error(`globe: tail logo failed to load (${o.tailLogoUrl}), flying without it`))); }
  }
  const jet = createJet({ tailLogo: logoImg, textureScale: o.lite ? 0.35 : 0.5 });
  jet.group.traverse((obj) => { if (obj.isMesh) { keep(obj.geometry); keep(obj.material); if (obj.material.map) keep(obj.material.map); } });
  scene.add(jet.group);
  const anchors = jet.group.userData.contrailAnchors;

  /* ----------------------------------------------------------------- timeline */
  const S = { travel: 0 };
  const tl = gsap.timeline({ paused: true });
  for (let i = 0; i < LEGS; i++) tl.to(S, { travel: i + 1, duration: route.durations[i], ease: 'power2.inOut' }, route.starts[i]);
  tl.to({}, { duration: 0.01 }, route.total);
  let completed = false, userPaused = false;
  const setPlayLabel = () => {
    const txt = tl.progress() >= 1 ? 'Replay' : tl.paused() ? 'Play' : 'Pause';
    playBtn.textContent = txt; playBtn.setAttribute('aria-label', txt === 'Pause' ? 'Pause the flight' : txt === 'Play' ? 'Play the flight' : 'Replay the flight');
  };
  tl.eventCallback('onUpdate', () => { scrub.value = String(Math.round(tl.progress() * 1000)); });
  tl.eventCallback('onComplete', () => { completed = true; setPlayLabel(); emit('complete'); });

  /* ----------------------------------------------------------------- frame */
  const camDir = new THREE.Vector3(-0.3, 0.2, 0.9).normalize();
  const pA = new THREE.Vector3(), pB = new THREE.Vector3(), pC = new THREE.Vector3();
  const fwd = new THREE.Vector3(), up = new THREE.Vector3(), right = new THREE.Vector3(), up2 = new THREE.Vector3(), back = new THREE.Vector3();
  const basis = new THREE.Matrix4(), qBase = new THREE.Quaternion(), qRoll = new THREE.Quaternion(), zAxis = new THREE.Vector3(0, 0, -1);
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), wp = new THREE.Vector3();
  const hdg = new THREE.Vector3(0, 0, 1), hT = new THREE.Vector3(), tgt3 = new THREE.Vector3();
  let bank = 0, hasPrev = false, lastCard = -2, yawSm = 0, pitch = 0, lookY = 0, still = -1;
  const MAX_TURN = 2.2;
  const size = { w: 1, h: 1 };
  const setV = (v, p) => v.set(p[0], p[1], p[2]);

  function frame(dt, t) {
    const g = S.travel;
    setV(pA, route.pathAt(g));
    up.copy(pA).normalize();
    const li = clamp(Math.floor(g), 0, LEGS - 1), lt0 = clamp(g - li, 0, 1);
    setV(pB, route.pathAt(li + clamp(lt0 - 0.01, 0, 1))); setV(pC, route.pathAt(li + clamp(lt0 + 0.01, 0, 1)));
    tgt3.copy(pC).sub(pB);
    if (tgt3.lengthSq() < 1e-12) tgt3.copy(hdg);
    tgt3.normalize();
    const climb = clamp(tgt3.dot(up), -0.2, 0.2);
    hT.copy(tgt3).addScaledVector(up, -tgt3.dot(up));
    if (hT.lengthSq() < 1e-10) hT.copy(hdg);
    hT.normalize();
    hdg.addScaledVector(up, -hdg.dot(up));
    if (hdg.lengthSq() < 1e-10 || !hasPrev) hdg.copy(hT);
    hdg.normalize();
    tmp.crossVectors(hdg, hT);
    const turn = Math.atan2(tmp.dot(up), hdg.dot(hT));
    const maxStep = MAX_TURN * dt;
    const da = clamp(turn * (1 - Math.exp(-dt * 4)), -maxStep, maxStep);
    hdg.applyAxisAngle(up, da).normalize();
    yawSm = lerp(yawSm, da / Math.max(dt, 1e-3), 1 - Math.exp(-dt * 6));
    bank = lerp(bank, clamp(yawSm * 0.9, -0.35, 0.35), 1 - Math.exp(-dt * 3));
    pitch = lerp(pitch, climb, 1 - Math.exp(-dt * 4));
    fwd.copy(hdg).multiplyScalar(Math.cos(pitch)).addScaledVector(up, Math.sin(pitch)).normalize();
    right.crossVectors(fwd, up).normalize();
    up2.crossVectors(right, fwd).normalize();
    basis.makeBasis(right, up2, back.copy(fwd).negate());
    qBase.setFromRotationMatrix(basis);
    hasPrev = true;
    qRoll.setFromAxisAngle(zAxis, -bank);
    jet.group.position.copy(pA);
    jet.group.quaternion.copy(qBase).multiply(qRoll);
    jet.group.scale.setScalar(o.jetScale);
    jet.group.updateMatrixWorld(true);
    jet.update(t);

    // camera: north stays up, orbit to the jet, pull back mid-flight
    const leg = Math.min(LEGS - 1, Math.floor(g)), lt = g - leg;
    const ang = route.angles[leg];
    const swoop = Math.pow(Math.sin(Math.PI * lt), 0.9) * Math.min(1, ang / 0.8);
    const D = lerp(4.0, 5.2, swoop);
    tmp2.copy(pA).normalize();
    camDir.lerp(tmp2, 1 - Math.exp(-dt * 5)).normalize();
    camera.position.copy(camDir).multiplyScalar(D);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, lookY, 0);
    camera.updateMatrixWorld(true);
    key.position.copy(camera.position).add(tmp.set(1.4, 1.8, 0.6));
    key.target.position.set(0, 0, 0);

    if (still < 0) for (let i = 0; i < 2; i++) { anchors[i].getWorldPosition(wp); trails[i].push(wp, t); trails[i].update(camera.position, t); }

    legLines.forEach((line, i) => {
      if (still >= 0) { line.geometry.instanceCount = i < still ? SAMPLES : 0; line.material.opacity = 1; }
      else if (g >= i + 1) { line.geometry.instanceCount = SAMPLES; line.material.opacity = 0.32; }
      else if (g > i) { line.geometry.instanceCount = Math.max(1, Math.floor((g - i) * SAMPLES)); line.material.opacity = 1; }
      else line.geometry.instanceCount = 0;
    });
    let near = -1;
    for (let i = 0; i < o.stops.length; i++) {
      const d = Math.abs(g - i);
      ringMats[i].opacity = 0.45 + 0.55 * clamp(1 - d / 0.5, 0, 1);     // resting markers stay readable, the current one is brightest
      if (d < 0.04) near = i;
    }
    const target = Math.min(o.stops.length - 1, Math.ceil(g - 0.04));
    const ph = (t % 1.8) / 1.8;
    pulse.position.copy(Pv[target]).multiplyScalar(1.004);
    pulse.quaternion.setFromUnitVectors(zUnit, Pv[target]);
    pulse.scale.setScalar(1 + ph * 1.8);
    pulse.material.opacity = still >= 0 ? 0 : 0.55 * (1 - ph);

    if (near !== lastCard) {
      lastCard = near;
      if (near >= 0) {
        const s = o.stops[near];
        cardNo.textContent = `Stop ${pad2(near + 1)} of ${o.stops.length}, ${KINDS[kindOf(s)].label}`;
        cardCity.textContent = `${s.city}, ${s.country}`;
        cardWhen.textContent = s.when;
        cardWhat.textContent = s.what;
        emit('stop', { index: near, stop: s });
      }
      card.classList.toggle('is-on', near >= 0);
    }
    stopBtns.forEach((b, i) => {
      b.classList.toggle('is-on', i === Math.round(g) && Math.abs(g - Math.round(g)) < 0.5);
      b.classList.toggle('is-done', i < g - 0.04);
      b.setAttribute('aria-current', i === Math.round(g) && Math.abs(g - Math.round(g)) < 0.5 ? 'step' : 'false');
    });
    tmp2.copy(camera.position).normalize();
    for (const L of labelObjs) {
      const facing = L.v.dot(tmp2) / L.v.length();
      tmp.copy(L.v).project(camera);
      L.el.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * size.w}px,${(-tmp.y * 0.5 + 0.5) * size.h}px) translate(-50%,-210%)`;
      const away = clamp((L.v.distanceTo(pA) - 0.1) / 0.12, 0, 1);
      L.el.style.opacity = String(clamp((facing - 0.35) / 0.25, 0, 1) * away);
    }
  }

  /* ----------------------------------------------------------------- size, visibility, loop */
  function resize(w, h) {
    if (!w || !h) return;
    size.w = w; size.h = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = w / h < 0.8 ? 54 : 34; camera.updateProjectionMatrix();
    lookY = w / h < 0.8 ? -0.55 : 0;
    for (const l of [routeAhead, ...legLines]) l.material.resolution.set(w, h);
  }
  let disposed = false, running = false, onScreen = true, visible = document.visibilityState !== 'hidden', readyEmitted = false;
  let last = performance.now();
  function loop(now) {
    if (disposed) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    frame(dt, now / 1000);
    renderer.render(scene, camera);
    if (!readyEmitted) { readyEmitted = true; emit('ready'); }
  }
  function syncLoop() {
    const should = !disposed && onScreen && visible;
    if (should && !running) { running = true; last = performance.now(); renderer.setAnimationLoop(loop); if (!userPaused && !completed && !o.reducedMotion) tl.play(); }
    else if (!should && running) { running = false; renderer.setAnimationLoop(null); tl.pause(); }
  }
  const ro = new ResizeObserver((entries) => { const r = entries[0].contentRect; resize(Math.round(r.width), Math.round(r.height)); });
  const io = new IntersectionObserver((entries) => { onScreen = entries[0].isIntersecting; syncLoop(); }, { threshold: 0.05 });
  const onVis = () => { visible = document.visibilityState !== 'hidden'; syncLoop(); };
  document.addEventListener('visibilitychange', onVis);

  /* ----------------------------------------------------------------- controls */
  const play = () => { userPaused = false; if (tl.progress() >= 1) { completed = false; tl.restart(); } else tl.play(); setPlayLabel(); };
  const pause = () => { userPaused = true; tl.pause(); setPlayLabel(); };
  const restart = () => { userPaused = false; completed = false; for (const t of trails) t.reset(); tl.restart(); setPlayLabel(); };
  const seekToStop = (i) => { i = clamp(Math.round(i), 0, o.stops.length - 1); userPaused = true; completed = false; for (const t of trails) t.reset(); tl.pause(); tl.time(route.arrivals[i]); setPlayLabel(); };
  playBtn.addEventListener('click', () => (tl.paused() ? play() : pause()));
  restartBtn.addEventListener('click', restart);
  scrub.addEventListener('input', () => { userPaused = true; completed = false; tl.pause(); tl.progress(Number(scrub.value) / 1000); setPlayLabel(); });
  stopBtns.forEach((b, i) => b.addEventListener('click', () => seekToStop(i)));

  function renderStill({ stop = o.stops.length - 1, width = 1120, height = 700 } = {}) {
    if (disposed) throw new Error('globe: disposed');
    stop = clamp(Math.round(stop), 0, o.stops.length - 1);
    const saved = { w: size.w, h: size.h, travel: S.travel, camDir: camDir.clone(), hdg: hdg.clone(), bank, pitch, yawSm, hasPrev, lastCard, pr: renderer.getPixelRatio() };
    still = stop;
    renderer.setPixelRatio(1);
    resize(width, height);
    S.travel = stop; hasPrev = false; bank = 0; pitch = 0; yawSm = 0;
    for (let k = 0; k < 8; k++) frame(0.5, 0);                     // let the camera and heading settle on the stop
    renderer.render(scene, camera);
    const out = document.createElement('canvas'); out.width = width; out.height = height;
    out.getContext('2d').drawImage(renderer.domElement, 0, 0, width, height);
    still = -1;
    renderer.setPixelRatio(saved.pr);
    resize(saved.w, saved.h);
    S.travel = saved.travel; camDir.copy(saved.camDir); hdg.copy(saved.hdg); bank = saved.bank; pitch = saved.pitch; yawSm = saved.yawSm; hasPrev = saved.hasPrev; lastCard = -2;
    for (const t of trails) t.reset();
    frame(0.016, performance.now() / 1000);
    if (running) renderer.render(scene, camera);
    return out;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', onVis);
    renderer.setAnimationLoop(null); tl.kill();
    for (const d of disposables) { try { d.dispose(); } catch (e) {} }
    renderer.dispose();
    try { renderer.forceContextLoss(); } catch (e) {}
    root.remove(); host.classList.remove('globe-host');
    emitter.clear();
    if (live === controller) live = null;
  }

  const controller = {
    play, pause, restart, seekToStop, renderStill, dispose,
    on(ev, fn) { if (!emitter.has(ev)) emitter.set(ev, new Set()); emitter.get(ev).add(fn); return () => emitter.get(ev)?.delete(fn); },
    get state() { return { playing: !tl.paused(), progress: tl.progress(), travel: S.travel, lite: o.lite, stops: o.stops.length }; },
  };

  /* ----------------------------------------------------------------- go */
  host.classList.add('globe-host');
  host.append(root);
  resize(host.clientWidth, host.clientHeight);
  ro.observe(host); io.observe(host);
  if (o.reducedMotion || !o.autoplay) { userPaused = true; tl.time(T.lead); }
  frame(0.016, 0);
  syncLoop();
  setPlayLabel();
  live = controller;
  return controller;
}
