// Split-flap CV board (Fable's chosen version, moved onto the CV page). The flip engine (instanced quads, one draw call,
// character wheel, cascade timing) is unchanged. Around it: the jobs are read from the CV page itself (data-board
// attributes, see board-data.js), the four readings follow the site's lens (mdb:lens), and the board hides itself
// when WebGL is missing. The page text below the board is the real CV, so nothing is duplicated for search engines.
import * as THREE from 'three';
import { LENS_ORDER, dotFor, parseJobs, rowsFromDom } from './board-data.js';

const DOTS = '●◑○';                       // full, half, empty: drawn as circles in the atlas
const SEQ = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,-+:&/' + DOTS;
const COLS = { dot: 1, year: 4, place: 12, note: 28 };     // the company column is in the text under the board, not on it
const LENS = {
  all:  { name: 'All',             title: 'ALL PATHS, ONE PERSON', color: '#e8e4da' },
  chem: { name: 'Chemistry & R&D', title: 'CHEMISTRY AND R&D',     color: '#3fcf8d' },
  ops:  { name: 'Operations',      title: 'OPERATIONS',            color: '#4f8dff' },
  cust: { name: 'Customer-Facing', title: 'CUSTOMER-FACING',       color: '#ff7a4d' },
};
const ORDER = LENS_ORDER;
const TITLE_CELLS = 24;
const FONT = '"Roboto Condensed","Arial Narrow","Helvetica Neue",Arial,sans-serif';
const rgb = (hex) => { const c = parseInt(hex.slice(1), 16); return new THREE.Vector3((c >> 16 & 255) / 255, (c >> 8 & 255) / 255, (c & 255) / 255); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const gIndex = (ch) => Math.max(0, SEQ.indexOf(ch));

/* ----------------------------------------------------------------- mount */
export async function mountBoard(host) {
  const noop = { dispose() {} };
  const tabs = host.querySelector('.cv-board-tabs');
  const boardEl = host.querySelector('.cv-board-frame');
  const canvas = host.querySelector('canvas');
  const labelsEl = host.querySelector('.cv-board-labels');

  let JOBS;
  try {
    JOBS = parseJobs(rowsFromDom(document)).map((j) => ({ y: j.year, p: j.place, c: j.company, w: j.weights, n: j.lines }));
  } catch (e) { console.error('board data:', e.message); return noop; }
  if (!JOBS.length) return noop;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return noop; }                              // no WebGL: the board stays hidden, the CV text below is the content
  host.classList.add('on');
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;   // the shader writes sRGB values directly
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, 1, 10, 20000);

  /* ------------------------------------------------------------ glyph atlas */
  const GC = 8, GR = Math.ceil(SEQ.length / GC), GW = 96, GH = 144;
  function makeAtlas() {
    const c = document.createElement('canvas'); c.width = GC * GW; c.height = GR * GH;
    const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.strokeStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `700 ${Math.round(GH * 0.9)}px ${FONT}`;        // the glyph fills its cell
    for (let i = 0; i < SEQ.length; i++) {
      const cx = (i % GC) * GW + GW / 2, cy = Math.floor(i / GC) * GH + GH / 2;
      const d = DOTS.indexOf(SEQ[i]);
      if (d < 0) { x.fillText(SEQ[i], cx, cy + GH * 0.03); continue; }
      const r = GH * 0.19;
      x.lineWidth = 7;
      x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke();
      if (d === 0) { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); }
      if (d === 1) { x.beginPath(); x.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2); x.closePath(); x.fill(); }
    }
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 8; t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
    return t;
  }

  /* ----------------------------------------------------------------- scene */
  const ROW_CELLS = COLS.dot + COLS.year + COLS.place + COLS.note;
  const CELLS = TITLE_CELLS + JOBS.length * ROW_CELLS;
  const PARTS = 4;
  const base = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index; geo.setAttribute('position', base.attributes.position);
  const aCenter = new THREE.InstancedBufferAttribute(new Float32Array(CELLS * PARTS * 3), 3);
  const aData = new THREE.InstancedBufferAttribute(new Float32Array(CELLS * PARTS * 4), 4);   // part, glyph, angle, colorId
  aData.setUsage(THREE.DynamicDrawUsage); aCenter.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aCenter', aCenter); geo.setAttribute('aData', aData);
  geo.instanceCount = CELLS * PARTS;

  const uniforms = {
    uCell: { value: new THREE.Vector2(20, 30) },
    uAtlas: { value: null },
    uGrid: { value: new THREE.Vector2(GC, GR) },
    uLens: { value: rgb(LENS.all.color) },
    uCream: { value: rgb('#bdb7ac') },                      // year and place: a notch dimmer than the line that matters
    uPaper: { value: rgb('#161616') },                      // classic airport: near-black flaps
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      uniform vec2 uCell;
      attribute vec3 aCenter;
      attribute vec4 aData;
      varying vec2 vUv; varying float vShade; varying float vTop; varying float vGlyph; varying float vColor;
      void main(){
        float part = aData.x, ang = aData.z;
        float hw = uCell.x * 0.5 * 0.96, hh = uCell.y * 0.5;
        float t = (position.y + 0.5) * hh * 0.985;            // 0..hh away from the hinge
        bool top = (part < 0.5) || (part > 1.5 && part < 2.5);
        float sgn = top ? 1.0 : -1.0;
        float flap = part > 1.5 ? 1.0 : 0.0;
        float a = flap > 0.5 ? ang : 0.0;
        vec3 p = aCenter;
        p.x += position.x * 2.0 * hw;
        p.y += sgn * (0.6 + t * cos(a));
        p.z += (flap > 0.5 ? 0.8 : 0.0) + t * sin(a);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        vUv = vec2(position.x + 0.5, position.y + 0.5);
        vShade = flap > 0.5 ? (1.0 - 0.6 * abs(sin(a))) : 1.0;
        vTop = top ? 1.0 : 0.0; vGlyph = aData.y; vColor = aData.w;
      }`,
    fragmentShader: `
      uniform sampler2D uAtlas; uniform vec2 uGrid; uniform vec3 uLens; uniform vec3 uCream; uniform vec3 uPaper;
      varying vec2 vUv; varying float vShade; varying float vTop; varying float vGlyph; varying float vColor;
      void main(){
        float gi = floor(vGlyph + 0.5);
        float col = mod(gi, uGrid.x), row = floor(gi / uGrid.x);
        float vloc = vTop > 0.5 ? 0.5 + vUv.y * 0.5 : 0.5 - vUv.y * 0.5;
        vec2 uv = (vec2(col, uGrid.y - 1.0 - row) + vec2(vUv.x, vloc)) / uGrid;
        float a = texture2D(uAtlas, uv).a;
        vec3 ink = vColor > 0.5 ? uLens : uCream;
        vec3 paper = uPaper * mix(1.18, 0.86, vUv.y);
        vec3 c = mix(paper, ink, a) * vShade;
        c *= 1.0 - 0.55 * smoothstep(0.035, 0.0, vUv.y);               // seam at the hinge, kept off the letter
        c *= 1.0 - 0.10 * smoothstep(0.85, 1.0, vUv.y);                // slight roll-off at the outer edge
        gl_FragColor = vec4(c, 1.0);
      }`,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  scene.add(mesh);

  /* ------------------------------------------------------- cell bookkeeping */
  const cells = Array.from({ length: CELLS }, (_, k) => ({ k, ch: ' ', token: 0 }));
  const D = aData.array;
  function writeRest(k, ch, colorId) {
    const g = gIndex(ch);
    for (let p = 0; p < PARTS; p++) {
      const o = (k * PARTS + p) * 4;
      D[o] = p; D[o + 1] = g; D[o + 3] = colorId;
      D[o + 2] = p === 3 ? Math.PI / 2 : 0;           // bottom flap rests edge-on (invisible)
    }
  }
  let idx = 0;
  const titleCells = cells.slice(idx, idx += TITLE_CELLS);
  const rowCells = JOBS.map(() => ({
    dot: cells.slice(idx, idx += COLS.dot),
    year: cells.slice(idx, idx += COLS.year), place: cells.slice(idx, idx += COLS.place),
    note: cells.slice(idx, idx += COLS.note),
  }));
  titleCells.forEach((c) => writeRest(c.k, ' ', 1));
  rowCells.forEach((r) => { r.year.concat(r.place).forEach((c) => writeRest(c.k, ' ', 0)); r.dot.concat(r.note).forEach((c) => writeRest(c.k, ' ', 1)); });

  /* ------------------------------------------------------------ flip engine (unchanged) */
  let needsRender = true;
  const active = new Set();
  let loopOn = false;
  function loop(now) {
    for (const f of active) {
      const p = (now - f.t0) / (f.ms * 2);
      const o = f.k * PARTS * 4;
      if (p < 0.5) {
        const k = p * 2;
        D[o + 2 * 4 + 2] = (Math.PI / 2) * k * k;                          // top flap falls toward the viewer
      } else if (p < 1) {
        const k = (p - 0.5) * 2;
        D[o + 2 * 4 + 2] = Math.PI / 2;
        D[o + 3 * 4 + 2] = (Math.PI / 2) * (1 - (1 - (1 - k) * (1 - k)));   // bottom flap swings down into place
      } else {
        const g = gIndex(f.next);
        D[o + 1 * 4 + 1] = g;
        D[o + 2 * 4 + 1] = g; D[o + 2 * 4 + 2] = 0;
        D[o + 3 * 4 + 2] = Math.PI / 2;
        f.cell.ch = f.next; active.delete(f); f.resolve();
      }
    }
    aData.needsUpdate = true; needsRender = true;
    if (active.size) requestAnimationFrame(loop); else loopOn = false;
  }
  function flipOnce(cell, next, ms) {
    return new Promise((resolve) => {
      const o = cell.k * PARTS * 4, gc = gIndex(cell.ch), gn = gIndex(next);
      D[o + 0 * 4 + 1] = gn;
      D[o + 1 * 4 + 1] = gc;
      D[o + 2 * 4 + 1] = gc;
      D[o + 3 * 4 + 1] = gn;
      active.add({ cell, k: cell.k, next, ms, t0: performance.now(), resolve });
      if (!loopOn) { loopOn = true; requestAnimationFrame(loop); }
    });
  }
  // Reduced motion (and tests): write every pending target at once, no flipping.
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function settle() {
    for (const cell of cells) {
      if (cell.target === undefined) continue;
      cell.token++;
      writeRest(cell.k, cell.target, D[cell.k * PARTS * 4 + 3]);
      cell.ch = cell.target;
    }
    active.clear(); loopOn = false;
    aData.needsUpdate = true; needsRender = true;
    renderer.render(scene, camera);
  }
  async function setChar(cell, target, delay = 0, ms = 58) {
    const token = ++cell.token;
    target = SEQ.includes(target) ? target : ' ';
    cell.target = target;
    if (reduced) return;
    if (delay) await sleep(delay);
    if (cell.token !== token || disposed) return;
    const L = SEQ.length, to = SEQ.indexOf(target);
    let from = SEQ.indexOf(cell.ch);
    if (from === to) return;
    if ((to - from + L) % L > 9) { from = (to - 9 + L) % L; await flipOnce(cell, SEQ[from], ms); }
    while (from !== to) {
      if (cell.token !== token || disposed) return;
      from = (from + 1) % L;
      await flipOnce(cell, SEQ[from], ms);
    }
  }
  function setText(group, text, baseDelay, perCell) {
    group.forEach((c, i) => setChar(c, text[i] ?? ' ', baseDelay + i * perCell + Math.random() * 90));
  }

  /* ----------------------------------------------------------------- layout */
  let stacked = false;
  function layout() {
    const innerW0 = boardEl.clientWidth;
    if (!innerW0) return;                                   // hidden page: the observer calls layout again when it shows
    stacked = innerW0 < 560;                                // decided by the board's own width, not the window
    const pad = stacked ? 12 : 22;
    const innerW = innerW0 - pad * 2;
    // width in cell units: n cells cost 1.12n - 0.12, every gap between groups costs 1
    const units = (n) => 1.08 * n - 0.08;
    const line1 = units(COLS.dot) + 1 + units(COLS.year) + 1 + units(COLS.place);
    const widest = stacked ? Math.max(line1, units(COLS.note)) : line1 + 1 + units(COLS.note);
    const cw = Math.max(7, Math.min(30, innerW / widest));
    const ch = cw * 1.5, gc = cw * 0.08, pitch = cw + gc, G = cw;
    const gw = (n) => n * pitch - gc;
    const cx = aCenter.array;
    const place = (cell, x, y) => { for (let p = 0; p < PARTS; p++) { const o = (cell.k * PARTS + p) * 3; cx[o] = x; cx[o + 1] = -y; cx[o + 2] = 0; } };
    const putGroup = (group, x0, yc) => group.forEach((c, i) => place(c, x0 + i * pitch + cw / 2, yc));
    let y = 0;
    putGroup(titleCells, 0, y + ch / 2);
    y += ch + cw * 1.1;
    const headY = y; y += cw * 0.7 + cw * 0.5;
    const xDot = 0, xYear = xDot + gw(COLS.dot) + G, xPlace = xYear + gw(COLS.year) + G;
    const xNote = stacked ? 0 : xPlace + gw(COLS.place) + G;
    rowCells.forEach((r) => {
      const y1 = y + ch / 2;
      putGroup(r.dot, xDot, y1); putGroup(r.year, xYear, y1); putGroup(r.place, xPlace, y1);
      if (stacked) { putGroup(r.note, xNote, y + ch + cw * 0.25 + ch / 2); y += 2 * ch + cw * 0.25 + cw * 0.85; }
      else { putGroup(r.note, xNote, y1); y += ch + cw * 0.8; }
    });
    const H = Math.ceil(y);
    boardEl.style.setProperty('--pad', pad + 'px');
    canvas.style.width = innerW + 'px'; canvas.style.height = H + 'px';
    renderer.setSize(innerW, H, false);
    camera.aspect = innerW / H; camera.fov = 24; camera.near = 10; camera.far = 20000;
    const dist = (H / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.set(innerW / 2, -H / 2, dist);
    camera.lookAt(innerW / 2, -H / 2, 0);
    camera.updateProjectionMatrix();
    uniforms.uCell.value.set(cw, ch);
    aCenter.needsUpdate = true; needsRender = true;
    labelsEl.style.cssText = `position:absolute;left:${pad}px;top:${pad}px;width:${innerW}px;height:${H}px;pointer-events:none;`;
    labelsEl.innerHTML = '';
    const label = (txt, x, yy) => { const d = document.createElement('div'); d.textContent = txt; d.style.cssText = `position:absolute;left:${x}px;top:${yy}px;color:#6c6c6c;font:700 ${Math.max(8, cw * 0.6)}px/1 Inter,system-ui,sans-serif;letter-spacing:.14em;white-space:nowrap;`; labelsEl.appendChild(d); };
    label('YEAR', xYear, headY); label('PLACE', xPlace, headY);
    if (!stacked) label('WHAT I DID', xNote, headY);
  }
  // The board's page can be hidden (width 0) and shown later, and the window can resize: one observer covers both.
  let lastW = 0, disposed = false;
  const ro = new ResizeObserver(() => { const w = boardEl.clientWidth; if (w && w !== lastW) { lastW = w; layout(); } });
  ro.observe(boardEl);

  /* ------------------------------------------------------------------ logic */
  ORDER.forEach((l) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.l = l; b.textContent = LENS[l].name;
    b.style.setProperty('--lc', LENS[l].color); b.setAttribute('aria-pressed', l === 'all');
    b.onclick = () => { if (window.setLens) window.setLens(l); else show(l); };      // the site lens drives the board and the text below
    tabs.appendChild(b);
  });
  let lens = null;
  function show(next, first = false) {
    lens = next;
    const L = LENS[next];
    uniforms.uLens.value.copy(rgb(L.color)); needsRender = true;
    tabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.l === next));
    setText(titleCells, L.title, 0, 18);
    rowCells.forEach((r, i) => {
      if (first) {
        setText(r.year, JOBS[i].y, 150 + i * 120, 20);
        setText(r.place, JOBS[i].p, 150 + i * 120, 20);
      }
      setText(r.dot, next === 'all' ? ' ' : dotFor(JOBS[i].w[next]), 120 + i * 110, 0);
      setText(r.note, JOBS[i].n[next], 200 + i * 110, 16);
    });
    if (reduced) settle();
  }
  const onLens = (e) => { if (e.detail.lens !== lens) show(e.detail.lens); };
  document.addEventListener('mdb:lens', onLens);

  /* ----------------------------------------------------------------- render */
  function draw() {
    if (disposed) return;
    if (needsRender) { renderer.render(scene, camera); needsRender = false; }
    requestAnimationFrame(draw);
  }
  // Test hook, only with ?test in the address: settle() writes everything at once, text() reads what the board shows.
  if (location.search.includes('test')) {
    const read = (g) => g.map((c) => c.ch).join('').trimEnd();
    window.__board = { show, settle, text: () => ({ title: read(titleCells), rows: rowCells.map((r) => ({ dot: read(r.dot), year: read(r.year), place: read(r.place), note: read(r.note) })) }) };
  }

  /* ------------------------------------------------------------------- boot */
  // Wait for the condensed font so the glyph atlas is drawn with it, then start. Falls back after 2.5 s.
  try { await Promise.race([document.fonts.load(`700 112px ${FONT}`), sleep(2500)]); } catch {}
  uniforms.uAtlas.value = makeAtlas();
  layout();
  requestAnimationFrame(draw);
  show(window.getLens ? window.getLens() : 'all', true);

  return {
    dispose() {
      disposed = true; ro.disconnect(); active.clear();
      document.removeEventListener('mdb:lens', onLens);
      uniforms.uAtlas.value && uniforms.uAtlas.value.dispose();
      geo.dispose(); base.dispose(); material.dispose(); renderer.dispose();
    },
  };
}
