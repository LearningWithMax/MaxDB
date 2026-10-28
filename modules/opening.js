// The opening (Fable's chosen version, as a module). Chrome spheres drift scattered and dim (the gate state), then on start()
// they gather into M, D and B and inflate like balloons filling, hold while a light sweeps across, and release.
// Around Fable's scene: a factory instead of a page script, a gate state that waits for start(), 'release' and
// 'complete' events, sphere tiers for phones, a transparent mode for rendering logo stills, a glide onto the banner
// logo, and dispose(). No photo is faded over the spheres: what you see is the thing.
import * as THREE from 'three';
import gsap from 'gsap';
import { FINISHES, STUDIO, tierParams, glideTargets, chromeShade } from './opening-config.js';

const LW = 6.4, LH = 3.6;                         // logo plane in world units (16:9)
const RELEASE_AT = 3.25;                          // seconds into the timeline: gather 0.3 to 2.3, sweep 2.0 to 3.3, release 3.25 to 4.55
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const backOut = (t, s = 1.9) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);   // overshoot, like a balloon filling
const loadImage = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });

/**
 * @param {{canvas: HTMLCanvasElement, shapeUrl: string, finish?: keyof typeof FINISHES, tier?: 'full'|'lite',
 *          transparent?: boolean, glide?: boolean}} opts
 */
export async function createOpening({ canvas, shapeUrl, finish = 'chrome', tier = 'full', transparent = false, glide = false }) {
  const T = tierParams(tier);
  let seed = 4242;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

  /* ---------------------------------------------------------------- renderer */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: transparent });
  let pixelRatio = Math.min(window.devicePixelRatio, T.pixelRatioCap);
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 0);      // always transparent: the curtain behind it is the black, so the page can show through at the release
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 60);
  camera.position.set(0, 0, 9.5);
  // The room the chrome reflects: a dark box with bright softboxes (STUDIO in opening-config.js), blurred into an environment map.
  const studio = new THREE.Scene();
  studio.add(new THREE.Mesh(new THREE.BoxGeometry(26, 26, 26), new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(STUDIO.ambient), side: THREE.BackSide })));
  for (const p of STUDIO.panels) {
    const box = new THREE.Mesh(new THREE.PlaneGeometry(p.size[0], p.size[1]), new THREE.MeshBasicMaterial({ color: new THREE.Color(p.color).multiplyScalar(p.intensity), side: THREE.DoubleSide, toneMapped: false }));
    box.position.set(p.pos[0], p.pos[1], p.pos[2]); box.lookAt(0, 0, 0); studio.add(box);
  }
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(studio, 0.04).texture;
  scene.environmentIntensity = 1.0;
  pm.dispose();
  studio.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  const key = new THREE.DirectionalLight(0xfff1dc, 2.6); key.position.set(-6, 4, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xdfe8ff, 0.8); rim.position.set(-5, 2, -3); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffd2a8, 0.5); fill.position.set(5, -3, 4); scene.add(fill);
  const stage = new THREE.Group(); scene.add(stage);

  /* ------------------------------------------------ sample the letters into spheres */
  // Distance transform of the logo silhouette: big spheres in the middle of a stroke, small ones at the edges,
  // packed greedily with some overlap so the letters read as one bulging surface.
  async function sampleLetters() {
    const im = await loadImage(shapeUrl);
    const W = 640, H = 360, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d', { willReadFrequently: true });
    x.drawImage(im, 0, 0, W, H);
    const d = x.getImageData(0, 0, W, H).data;
    const INF = 1e9, dist = new Float32Array(W * H);
    for (let p = 0; p < W * H; p++) { const o = p * 4; dist[p] = 0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2] > 34 ? INF : 0; }
    // two-pass chamfer (3-4), result in thirds of a pixel
    for (let y = 1; y < H; y++) for (let xx = 1; xx < W - 1; xx++) {
      const p = y * W + xx; if (!dist[p]) continue;
      dist[p] = Math.min(dist[p], dist[p - 1] + 3, dist[p - W] + 3, dist[p - W - 1] + 4, dist[p - W + 1] + 4);
    }
    for (let y = H - 2; y >= 0; y--) for (let xx = W - 2; xx > 0; xx--) {
      const p = y * W + xx; if (!dist[p]) continue;
      dist[p] = Math.min(dist[p], dist[p + 1] + 3, dist[p + W] + 3, dist[p + W - 1] + 4, dist[p + W + 1] + 4);
    }
    const cand = [];
    for (let p = 0; p < W * H; p++) if (dist[p] > 0 && dist[p] < INF) cand.push(p);
    seed = 99;
    cand.sort((a, b) => (dist[b] + rnd() * 6) - (dist[a] + rnd() * 6));     // biggest first, with a little jitter
    const px2w = LW / W;
    const out = [];                                                         // [x, y, z, r] in world units
    const cellSize = 12, gridW = Math.ceil(W / cellSize), grid = new Map();
    for (const p of cand) {
      const cx = p % W, cy = Math.floor(p / W);
      const r = clamp(dist[p] / 3 * T.k, T.min, T.max);
      let ok = true;
      const gx = Math.floor(cx / cellSize), gy = Math.floor(cy / cellSize), reach = Math.ceil((r + 13) / cellSize);
      for (let j = gy - reach; j <= gy + reach && ok; j++) for (let i = gx - reach; i <= gx + reach && ok; i++) {
        const bucket = grid.get(j * gridW + i); if (!bucket) continue;
        for (const q of bucket) { const dx = q[0] - cx, dy = q[1] - cy; if (dx * dx + dy * dy < Math.pow(0.6 * (r + q[2]), 2)) { ok = false; break; } }
      }
      if (!ok) continue;
      const k = gy * gridW + gx; if (!grid.has(k)) grid.set(k, []); grid.get(k).push([cx, cy, r]);
      // the big spheres in the middle of a stroke sit forward, so the letter bulges like a balloon instead of lying flat
      out.push([(cx / W - 0.5) * LW, (0.5 - cy / H) * LH, r * px2w * 0.85 + (rnd() - 0.5) * 0.04, r * px2w]);
    }
    return out;
  }

  /* ------------------------------------------------------------------ build */
  const list = await sampleLetters();
  const N = list.length;
  const chaos = new Float32Array(N * 3), target = new Float32Array(N * 3), radius = new Float32Array(N);
  const delay = new Float32Array(N), swirl = new Float32Array(N * 3), rise = new Float32Array(N * 2), shade = new Float32Array(N);
  const tint = new Float32Array(N * 3);                                   // per-bead red, green, blue lighting multipliers (chromeShade)
  seed = 7;
  for (let i = 0; i < N; i++) {
    const [tx, ty, tz, r] = list[i];
    target.set([tx, ty, tz], i * 3); radius[i] = r;
    const a = rnd() * Math.PI * 2, b = Math.acos(2 * rnd() - 1), rr = Math.cbrt(rnd());
    chaos.set([Math.sin(b) * Math.cos(a) * rr * 3.6, Math.sin(b) * Math.sin(a) * rr * 2.0, Math.cos(b) * rr * 1.2], i * 3);
    swirl.set([(rnd() - 0.5) * 1.6, (rnd() - 0.5) * 1.6, (rnd() - 0.5) * 1.6], i * 3);
    delay[i] = ((tx / LW + 0.5) * 0.5 + rnd() * 0.18) * (0.52 / 0.68);  // a wave from M to B, with jitter; max 0.52 so every sphere lands before the hold
    rise.set([(rnd() - 0.5) * 1.2, 0.8 + rnd() * 1.4], i * 2);
    shade[i] = 0.82 + rnd() * 0.3;
    tint.set(chromeShade(tx / LW + 0.5, ty / LH + 0.5), i * 3);
  }
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.22, clearcoat: 0.4, clearcoatRoughness: 0.2, transparent: true });
  const sphereGeo = new THREE.SphereGeometry(1, 10, 7);
  const spheres = new THREE.InstancedMesh(sphereGeo, mat, N);
  spheres.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
  spheres.frustumCulled = false;
  stage.add(spheres);

  const base = new THREE.Color();
  function setFinish(name) {
    const f = FINISHES[name] || FINISHES.chrome;
    base.set(f.color); mat.metalness = f.metalness; mat.roughness = f.roughness; mat.clearcoat = f.clearcoat;
  }
  setFinish(finish);

  /* ---------------------------------------------------------------- timeline */
  const S = { gather: 0, sweep: 0, release: 0 };
  const handlers = { release: [], complete: [] };
  const emit = (name) => handlers[name].forEach((fn) => { try { fn(); } catch (e) { console.error('opening handler:', e); } });
  let started = false, releaseEmitted = false, completeEmitted = false, disposed = false, baseScale = 1, gliding = false;
  const tl = gsap.timeline({ paused: true });
  tl.to(S, { gather: 1, duration: 2.0, ease: 'none' }, 0.3);
  tl.to(S, { sweep: 1, duration: 1.3, ease: 'power1.inOut' }, 2.0);
  tl.to(S, { release: 1, duration: 1.3, ease: 'power2.in' }, RELEASE_AT);
  tl.to({}, { duration: 0.01 }, 4.6);
  tl.eventCallback('onComplete', () => { if (!completeEmitted) { completeEmitted = true; emit('complete'); } });

  /* ---------------------------------------------------------------- frame */
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e) => { mouse.tx = (e.clientX / innerWidth - 0.5) * 2; mouse.ty = (e.clientY / innerHeight - 0.5) * 2; };
  addEventListener('pointermove', onPointer);

  function update(time) {
    const G = S.gather, R = S.release;
    spheres.visible = R < 0.999;
    if (spheres.visible) {
      for (let i = 0; i < N; i++) {
        const i3 = i * 3;
        const t = clamp((G - delay[i]) / 0.48, 0, 1), e = easeIO(t), sw = Math.sin(Math.PI * t) * 0.55;
        const drift = (1 - e) * 0.18;
        const cx = chaos[i3] + Math.sin(time * 0.5 + i) * drift, cy = chaos[i3 + 1] + Math.cos(time * 0.4 + i * 1.7) * drift, cz = chaos[i3 + 2] + Math.sin(time * 0.6 + i * 0.7) * drift;
        let x = lerp(cx, target[i3], e) + swirl[i3] * sw, y = lerp(cy, target[i3 + 1], e) + swirl[i3 + 1] * sw, z = lerp(cz, target[i3 + 2], e) + swirl[i3 + 2] * sw;
        // inflate on arrival: the last 45% of the trip, with overshoot
        const inf = clamp((t - 0.55) / 0.45, 0, 1);
        let s = radius[i] * lerp(0.28, 1, inf < 1 ? backOut(inf) : 1);
        if (!glide) {                                                       // release: float up like balloons, drifting, shrinking a little
          const rr = R * R;
          y += rise[i * 2 + 1] * rr * 5.5; x += rise[i * 2] * rr * 1.5; z += rr * 1.0;
          s *= 1 - 0.35 * R;
        }
        dummy.position.set(x, y, z); dummy.scale.setScalar(Math.max(s, 0.0001)); dummy.updateMatrix();
        spheres.setMatrixAt(i, dummy.matrix);
        const k = shade[i] * lerp(0.45, 1, e);                             // dim while scattered, full once in place
        col.setRGB(base.r * tint[i3] * k, base.g * tint[i3 + 1] * k, base.b * tint[i3 + 2] * k);
        spheres.setColorAt(i, col);
      }
      spheres.instanceMatrix.needsUpdate = true; spheres.instanceColor.needsUpdate = true;
    }
    mat.opacity = glide ? 1 - clamp((R - 0.8) / 0.2, 0, 1) : 1 - R;    // plain float-up: thins out from the first moment, gone as it ends. With the glide the cloud stays whole, then fades into the logo
    key.position.x = lerp(-7, 7, S.sweep);                                 // the light sweep across the chrome during the hold
    mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;
    if (!gliding) { stage.rotation.y = mouse.x * 0.14; stage.rotation.x = mouse.y * 0.07; }
    if (started && R > 0 && !releaseEmitted) { releaseEmitted = true; emit('release'); }
  }

  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 0.8 ? 52 : 35; camera.updateProjectionMatrix();
    const visH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), visW = visH * camera.aspect;
    baseScale = Math.min((visW * 0.8) / LW, (visH * 0.8) / LH);
    if (!gliding) stage.scale.setScalar(baseScale);
  }
  addEventListener('resize', resize); resize();

  renderer.setAnimationLoop((now) => { if (disposed) return; update(now / 1000); renderer.render(scene, camera); });

  /* ------------------------------------------------------------------- API */
  // On-screen rectangle (CSS px) around the letters, from the sampled sphere extents.
  function letterRect() {
    stage.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < N; i++) { x0 = Math.min(x0, target[i * 3] - radius[i]); x1 = Math.max(x1, target[i * 3] + radius[i]); y0 = Math.min(y0, target[i * 3 + 1] - radius[i]); y1 = Math.max(y1, target[i * 3 + 1] + radius[i]); }
    const r = canvas.getBoundingClientRect(), v = new THREE.Vector3();
    const px = (wx, wy) => { v.set(wx, wy, 0); stage.localToWorld(v); v.project(camera); return [r.left + (v.x * 0.5 + 0.5) * r.width, r.top + (0.5 - v.y * 0.5) * r.height]; };
    const [ax, ay] = px(x0, y1), [bx, by] = px(x1, y0);
    return { x: ax, y: ay, width: bx - ax, height: by - ay };
  }

  return {
    setPixelRatio(r) { pixelRatio = Math.min(r, T.pixelRatioCap); resize(); },
    setFinish,
    start() { started = true; tl.restart(); },
    skipToRelease() { if (started && tl.time() < RELEASE_AT) tl.seek(RELEASE_AT); },
    on(event, fn) { handlers[event].push(fn); },
    holdFrame() { started = true; tl.pause(); tl.time(2.95); update(performance.now() / 1000); renderer.render(scene, camera); },
    // Jump the timeline to `seconds` with events firing, then draw one frame. For tests and stills: it does not need the
    // browser to run animation frames (a hidden tab does not), so the release and complete events can be checked anywhere.
    seek(seconds) { started = true; tl.pause(); tl.seek(seconds, false); update(performance.now() / 1000); renderer.render(scene, camera); },
    letterRect,
    // Move and shrink the whole cloud onto the banner logo slot (Rect in CSS px) over `seconds`.
    glideTo(slot, seconds) {
      const g = glideTargets(letterRect(), slot);
      const upp = (2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / (canvas.clientHeight || innerHeight);
      gliding = true;
      gsap.to(stage.rotation, { x: 0, y: 0, duration: seconds * 0.5, ease: 'power2.out' });
      gsap.to(stage.position, { x: g.dx * upp, y: -g.dy * upp, duration: seconds, ease: 'power3.inOut' });
      gsap.to(stage.scale, { x: baseScale * g.scale, y: baseScale * g.scale, z: baseScale * g.scale, duration: seconds, ease: 'power3.inOut' });
    },
    dispose() {
      disposed = true; tl.kill(); renderer.setAnimationLoop(null);
      removeEventListener('resize', resize); removeEventListener('pointermove', onPointer);
      sphereGeo.dispose(); mat.dispose(); spheres.dispose(); scene.environment && scene.environment.dispose(); renderer.dispose();
    },
    get state() {
      if (!started) return 'gate';
      if (completeEmitted) return 'complete';
      const t = tl.time();
      return t >= RELEASE_AT ? 'release' : t >= 2.3 ? 'hold' : 'gather';
    },
  };
}
