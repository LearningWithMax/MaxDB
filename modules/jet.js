import * as THREE from "three";

/**
 * MDB jet for the flight globe.
 *  - lofted airfoil wings with a trailing-edge kink and blended teal winglets
 *  - under-wing engines on pylons: rounded inlet lip, fan, spinner, exhaust cone
 *  - fuselage with a drooped nose, upswept tail cone and a wing root fairing
 *  - livery painted into one canvas texture: grey belly, teal cheatline that
 *    sweeps up into the fin, 16 windows a side, cockpit panes, doors, titles
 *  - fin with its own texture: orange, teal leading band, MDB on both faces
 *
 * Nose -Z, tail +Z, up +Y, wings along X. Length 1.0.
 * createJet({ tailLogo, tailLogoAdditive, wingSweep, fuselageLength, colors, textureScale })
 *   tailLogo: an HTMLImageElement, a canvas, or a THREE.Texture with an .image. Transparency is respected; a wide banner
 *   (like the chrome MDB) is fitted to the fin by width. tailLogoAdditive drops black backgrounds (for logos without alpha).
 */
export function createJet(options = {}) {
  const {
    tailLogo = null,
    tailLogoAdditive = false,
    wingSweep = 27,
    fuselageLength = 1,
    colors = {},
    textureScale = 1, // 0.5 halves both livery canvases, plenty when the jet is small on screen
  } = options;

  const C = {
    body: colors.body ?? 0xf6f5f1,
    belly: colors.belly ?? 0xb7bec4,
    orange: colors.orange ?? 0xc73410,
    teal: colors.teal ?? 0x086763,
    dark: colors.dark ?? 0x14181c,
  };
  const hex = (n) => "#" + n.toString(16).padStart(6, "0");
  const TAU = Math.PI * 2;
  const clamp = THREE.MathUtils.clamp;
  const rad = THREE.MathUtils.degToRad;

  const group = new THREE.Group();
  group.name = "MDB_Jet";

  // ------------------------------------------------------------------
  // fuselage profile
  // ------------------------------------------------------------------
  const HALF = 0.5, R = 0.055, NOSE = 0.17, TAIL0 = 0.2, RY = 1.03;

  function radiusAt(z) {
    if (z < -HALF + NOSE) {
      const t = clamp((z + HALF) / NOSE, 0, 1);
      return R * Math.pow(Math.sin((t * Math.PI) / 2), 0.72);
    }
    if (z > TAIL0) {
      const t = clamp((z - TAIL0) / (HALF - TAIL0), 0, 1);
      return R * (1 - 0.9 * Math.pow(t, 1.35));
    }
    return R;
  }
  // nose droops a little, tail cone sweeps up
  function centerAt(z) {
    if (z < -HALF + NOSE) {
      const t = clamp((z + HALF) / NOSE, 0, 1);
      return -0.016 * Math.pow(1 - t, 1.6);
    }
    if (z > TAIL0) {
      const t = clamp((z - TAIL0) / (HALF - TAIL0), 0, 1);
      return 0.034 * t * t;
    }
    return 0;
  }
  const topAt = (z) => centerAt(z) + radiusAt(z) * RY;

  // t goes around the section: 0 belly seam, 0.25 right (+x), 0.5 top, 0.75 left
  function fuselagePoint(z, t) {
    const r = Math.max(radiusAt(z), 0.0004), a = t * TAU;
    return [Math.sin(a) * r, -Math.cos(a) * r * RY + centerAt(z), z];
  }
  function tAt(side, z, y) {
    const ry = Math.max(radiusAt(z), 0.0004) * RY;
    const ang = Math.acos(clamp(-(y - centerAt(z)) / ry, -1, 1));
    return side > 0 ? ang / TAU : 1 - ang / TAU;
  }

  // ------------------------------------------------------------------
  // livery texture (u along the length, v around the section)
  // ------------------------------------------------------------------
  const W = 4096, H = 1408;
  function liveryTexture() {
    const cv = document.createElement("canvas");
    cv.width = Math.round(W * textureScale); cv.height = Math.round(H * textureScale);
    const g = cv.getContext("2d");
    g.scale(textureScale, textureScale);
    const X = (z) => (z + HALF) * W;
    const Y = (t) => (1 - t) * H;
    const P = (side, z, y) => [X(z), Y(tAt(side, z, y))];
    // Q: angle in degrees from the top, toward that side
    const Q = (side, z, deg) => [X(z), Y(side > 0 ? 0.5 - deg / 360 : 0.5 + deg / 360)];
    const poly = (pts, fill, stroke, lw) => {
      g.beginPath();
      pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
      g.closePath();
      if (fill) { g.fillStyle = fill; g.fill(); }
      if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
    };

    g.fillStyle = hex(C.body);
    g.fillRect(0, 0, W, H);

    // grey belly, follows nose and tail curves
    const bellyY = -0.022;
    for (const side of [1, -1]) {
      const pts = [];
      for (let z = -HALF; z <= HALF + 1e-6; z += 0.005) pts.push(P(side, z, bellyY));
      const edge = side > 0 ? H : 0;
      pts.push([W, edge], [0, edge]);
      poly(pts, hex(C.belly));
    }

    // radome
    g.fillStyle = "#c9ccce";
    g.fillRect(0, 0, X(-0.452), H);

    // teal cheatline: straight under the windows, sweeps up into the fin root
    const cheat = (z) => {
      if (z < 0.17) return { y: -0.004, th: 0.0055 };
      const s = THREE.MathUtils.smoothstep(z, 0.17, 0.44);
      return { y: -0.004 + (topAt(z) + 0.01) * s, th: 0.0055 + 0.012 * s };
    };
    for (const side of [1, -1]) {
      const up = [], dn = [];
      for (let z = -0.355; z <= 0.465; z += 0.004) {
        const c = cheat(z);
        up.push(P(side, z, c.y + c.th / 2));
        dn.push(P(side, z, c.y - c.th / 2));
      }
      poly(up.concat(dn.reverse()), hex(C.teal));
    }

    // doors
    g.lineCap = "round";
    for (const side of [1, -1]) {
      for (const zc of [-0.352, 0.232]) {
        poly([P(side, zc - 0.011, -0.02), P(side, zc + 0.011, -0.02), P(side, zc + 0.011, 0.03), P(side, zc - 0.011, 0.03)], null, "#9aa1a6", 2.5);
      }
    }

    // passenger windows
    const winW = 0.0105 * W;
    const winH = (0.013 / (TAU * R * RY)) * H;
    for (const side of [1, -1]) {
      for (let i = 0; i < 16; i++) {
        const z = -0.3 + (0.49 * i) / 15;
        const [x, y] = P(side, z, 0.015);
        const grad = g.createLinearGradient(0, y - winH / 2, 0, y + winH / 2);
        grad.addColorStop(0, "#3b4c5c");
        grad.addColorStop(0.5, "#15202b");
        grad.addColorStop(1, "#0d141b");
        g.fillStyle = grad;
        g.strokeStyle = "#7c848a";
        g.lineWidth = 2;
        g.beginPath();
        g.roundRect(x - winW / 2, y - winH / 2, winW, winH, winW * 0.3);
        g.fill();
        g.stroke();
      }
    }

    // anti-glare patch ahead of the windshield
    poly([Q(1, -0.474, 13), Q(1, -0.423, 17), Q(-1, -0.423, 17), Q(-1, -0.474, 13)], "#2b2e31");

    // cockpit panes
    for (const side of [1, -1]) {
      poly([Q(side, -0.421, 4), Q(side, -0.421, 17), Q(side, -0.397, 19), Q(side, -0.397, 4)], "#0f1a24", "#5a6369", 2.5);
      poly([Q(side, -0.419, 20), Q(side, -0.403, 37), Q(side, -0.386, 35), Q(side, -0.395, 21)], "#0f1a24", "#5a6369", 2.5);
    }

    // titles above the windows
    for (const side of [1, -1]) {
      const [x, y] = P(side, -0.24, 0.036);
      g.save();
      g.translate(x, y);
      g.scale(side > 0 ? -1 : 1, side > 0 ? 1 : -1);
      g.fillStyle = hex(C.teal);
      g.font = "800 72px Inter, system-ui, Arial, sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("MDB", 0, 0);
      g.restore();
    }

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }

  // ------------------------------------------------------------------
  // fin texture: butterfly layout, left half is the +x face, right half the -x face
  // ------------------------------------------------------------------
  function finTexture() {
    const FW = 2048, FH = 1024;
    const cv = document.createElement("canvas");
    cv.width = Math.round(FW * textureScale); cv.height = Math.round(FH * textureScale);
    const g = cv.getContext("2d");
    g.scale(textureScale, textureScale);
    g.fillStyle = hex(C.orange);
    g.fillRect(0, 0, FW, FH);
    // teal band along the leading edge (chord fraction 0..0.13)
    g.fillStyle = hex(C.teal);
    g.fillRect(FW * 0.5 * (1 - 0.13), 0, FW * 0.13, FH);
    // MDB on both faces, centred at chord 0.56, height 0.5
    const halves = [(s) => FW * 0.5 * (1 - s), (s) => FW * (0.5 + 0.5 * s)];
    for (const toX of halves) {
      const cx = toX(0.56), cy = FH * 0.5;
      const img = tailLogo && (tailLogo.image || (tailLogo.width ? tailLogo : null));
      if (img) {
        // fit by width to 58% of the chord, never taller than 60% of the fin height
        let bw = FW * 0.5 * 0.58, bh = (bw * img.height) / img.width;
        if (bh > FH * 0.6) { bh = FH * 0.6; bw = (bh * img.width) / img.height; }
        g.save();
        if (tailLogoAdditive) g.globalCompositeOperation = "lighter";
        g.drawImage(img, cx - bw / 2, cy - bh / 2, bw, bh);
        g.restore();
      } else {
        g.fillStyle = "#ffffff";
        g.font = "900 230px Inter, system-ui, Arial, sans-serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText("MDB", cx, cy);
      }
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }

  // ------------------------------------------------------------------
  // materials
  // ------------------------------------------------------------------
  const materials = {
    fuselage: new THREE.MeshPhysicalMaterial({ map: liveryTexture(), roughness: 0.3, metalness: 0.02, clearcoat: 0.9, clearcoatRoughness: 0.12 }),
    paint: new THREE.MeshPhysicalMaterial({ color: C.body, roughness: 0.3, metalness: 0.02, clearcoat: 0.9, clearcoatRoughness: 0.12 }),
    fin: new THREE.MeshPhysicalMaterial({ map: finTexture(), roughness: 0.34, metalness: 0.02, clearcoat: 0.8, clearcoatRoughness: 0.14 }),
    teal: new THREE.MeshPhysicalMaterial({ color: C.teal, roughness: 0.36, clearcoat: 0.6, clearcoatRoughness: 0.15 }),
    grey: new THREE.MeshPhysicalMaterial({ color: C.belly, roughness: 0.5, metalness: 0.15, clearcoat: 0.3 }),
    dark: new THREE.MeshStandardMaterial({ color: C.dark, roughness: 0.65, metalness: 0.35 }),
  };

  // ------------------------------------------------------------------
  // geometry helpers: one merged mesh per material
  // ------------------------------------------------------------------
  const buckets = new Map();
  function add(geometry, name, transform = null) {
    const g = geometry.clone();
    if (transform) g.applyMatrix4(transform);
    const ni = g.index ? g.toNonIndexed() : g;
    if (!ni.getAttribute("normal")) ni.computeVertexNormals();
    if (!buckets.has(name)) buckets.set(name, []);
    buckets.get(name).push(ni);
    if (ni !== g) g.dispose();
    geometry.dispose();
  }
  function matrix(position, rotation = [0, 0, 0], scale = [1, 1, 1]) {
    return new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      new THREE.Vector3(...scale),
    );
  }
  function merge(geometries) {
    let count = 0;
    for (const g of geometries) count += g.getAttribute("position").count;
    const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), uv = new Float32Array(count * 2);
    let off = 0;
    for (const g of geometries) {
      const c = g.getAttribute("position").count;
      pos.set(g.getAttribute("position").array, off * 3);
      nor.set(g.getAttribute("normal").array, off * 3);
      const u = g.getAttribute("uv");
      if (u) uv.set(u.array, off * 2);
      off += c;
    }
    const m = new THREE.BufferGeometry();
    m.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    m.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    m.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    m.computeBoundingSphere();
    return m;
  }
  function flush() {
    for (const [name, geos] of buckets) {
      const mesh = new THREE.Mesh(merge(geos), materials[name]);
      mesh.name = name;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      for (const g of geos) g.dispose();
    }
    buckets.clear();
  }

  // Loft a grid of rings. Default winding gives normal = d(ring) x d(along); flip for the other way.
  // seam: average normals of the first and last point of each ring (duplicated seam vertex).
  function loft(rings, { flip = false, uvs = null, seam = false } = {}) {
    const n = rings[0].length, m = rings.length;
    const pos = [], uv = [], idx = [];
    for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) {
      pos.push(...rings[i][j]);
      if (uvs) uv.push(...uvs[i][j]);
    }
    for (let i = 0; i < m - 1; i++) for (let j = 0; j < n - 1; j++) {
      const a = i * n + j, b = a + n;
      if (!flip) idx.push(a, a + 1, b, a + 1, b + 1, b);
      else idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    if (uvs) geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    if (seam) {
      const na = geo.getAttribute("normal");
      const v = new THREE.Vector3(), w = new THREE.Vector3();
      for (let i = 0; i < m; i++) {
        const a = i * n, b = i * n + n - 1;
        v.fromBufferAttribute(na, a); w.fromBufferAttribute(na, b);
        v.add(w).normalize();
        na.setXYZ(a, v.x, v.y, v.z); na.setXYZ(b, v.x, v.y, v.z);
      }
    }
    return geo;
  }

  // NACA-style section. Loop of n+1 points [s, h]: TE -> upper -> LE -> lower -> TE. s: 0 LE, 1 TE.
  function airfoil(n, thick, camber = 0.018, p = 0.4) {
    const pts = [];
    for (let k = 0; k <= n; k++) {
      const ang = (k / n) * TAU;
      const s = 0.5 * (1 + Math.cos(ang));
      const yt = 5 * thick * (0.2969 * Math.sqrt(s) - 0.126 * s - 0.3516 * s * s + 0.2843 * s ** 3 - 0.1036 * s ** 4);
      const yc = s < p ? (camber / (p * p)) * (2 * p * s - s * s) : (camber / ((1 - p) ** 2)) * (1 - 2 * p + 2 * p * s - s * s);
      pts.push([s, ang <= Math.PI ? yc + yt : yc - yt]);
    }
    return pts;
  }
  // place a section: P is the leading edge, chord runs along +z, up is the thickness direction
  function station(P, chord, up, prof) {
    return prof.map(([s, h]) => [P[0] + up[0] * h * chord, P[1] + up[1] * h * chord, P[2] + s * chord + up[2] * h * chord]);
  }
  // two extra stations that round off a tip
  function tipRings(P, chord, up, prof, dir, len) {
    return [
      station([P[0] + dir[0] * len * 0.6, P[1] + dir[1] * len * 0.6, P[2] + chord * 0.22], chord * 0.55, up, prof),
      station([P[0] + dir[0] * len, P[1] + dir[1] * len, P[2] + chord * 0.48], chord * 0.06, up, prof),
    ];
  }

  function prism(points, offset) {
    const n = points.length, v = [];
    for (const p of points) v.push(p);
    for (const p of points) v.push([p[0] + offset[0], p[1] + offset[1], p[2] + offset[2]]);
    const tri = [];
    for (let i = 1; i < n - 1; i++) { tri.push(0, i + 1, i); tri.push(n, n + i, n + i + 1); }
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; tri.push(i, j, n + j); tri.push(i, n + j, n + i); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(v.flat(), 3));
    geo.setIndex(tri);
    // flip if inside out
    const pos = geo.getAttribute("position"), idx = geo.index;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    let vol = 0;
    for (let i = 0; i < idx.count; i += 3) {
      a.fromBufferAttribute(pos, idx.getX(i)); b.fromBufferAttribute(pos, idx.getX(i + 1)); c.fromBufferAttribute(pos, idx.getX(i + 2));
      vol += a.dot(b.clone().cross(c)) / 6;
    }
    if (vol < 0) for (let i = 0; i < idx.count; i += 3) { const t = idx.getX(i + 1); idx.setX(i + 1, idx.getX(i + 2)); idx.setX(i + 2, t); }
    geo.computeVertexNormals();
    return geo;
  }

  // ------------------------------------------------------------------
  // 1. fuselage
  // ------------------------------------------------------------------
  {
    const rings = 120, seg = 48;
    const rr = [], uu = [];
    for (let i = 0; i <= rings; i++) {
      const z = -HALF + i / rings;
      const ring = [], ruv = [];
      for (let j = 0; j <= seg; j++) {
        const t = j / seg;
        ring.push(fuselagePoint(z, t));
        ruv.push([z + HALF, t]);
      }
      rr.push(ring); uu.push(ruv);
    }
    add(loft(rr, { uvs: uu, seam: true }), "fuselage");
  }

  // wing root fairing
  add(new THREE.SphereGeometry(1, 28, 18), "grey", matrix([0, -0.028, 0.012], [0, 0, 0], [0.068, 0.04, 0.21]));

  // ------------------------------------------------------------------
  // 2. wings with blended winglets
  // ------------------------------------------------------------------
  const sweep = rad(wingSweep), dihedral = rad(5.5);
  const wingRootY = -0.024, wingRootLE = -0.125, span = 0.43;
  const wingProfile = (x) => airfoil(36, 0.13 - 0.045 * (x / span));
  function wingChord(x) {
    if (x < 0.12) return 0.3 + ((0.215 - 0.3) * x) / 0.12;
    return 0.215 + ((0.082 - 0.215) * (x - 0.12)) / (span - 0.12);
  }
  const wingLE = (x) => wingRootLE + Math.tan(sweep) * x;
  const wingY = (x) => wingRootY + Math.tan(dihedral) * x;

  const tipAnchors = [];
  for (const side of [1, -1]) {
    const main = [];
    for (const x of [0, 0.05, 0.12, 0.2, 0.28, 0.36, span]) {
      main.push(station([x * side, wingY(x), wingLE(x)], wingChord(x), [0, 1, 0], wingProfile(x)));
    }
    // blended winglet: quarter bend then a short straight run, chord shrinking, sweep increasing
    const Rb = 0.022, phiMax = rad(78), steps = 6;
    const wl = [main[main.length - 1]];
    const c0 = wingChord(span), prof = wingProfile(span);
    const pos = (k) => {
      const f = k / steps;
      const phi = phiMax * f;
      return { x: span + Rb * Math.sin(phi), y: wingY(span) + Rb * (1 - Math.cos(phi)), phi, f };
    };
    for (let k = 1; k <= steps; k++) {
      const { x, y, phi, f } = pos(k);
      const chord = c0 * (1 - 0.42 * f);
      wl.push(station([x * side, y, wingLE(span) + 0.028 * f], chord, [-Math.sin(phi) * side, Math.cos(phi), 0], prof));
    }
    // straight run
    const end = pos(steps);
    const dir = [Math.cos(phiMax), Math.sin(phiMax)];
    const up = [-Math.sin(phiMax) * side, Math.cos(phiMax), 0];
    const L = 0.042;
    for (const f of [0.5, 1]) {
      const chord = c0 * 0.58 * (1 - 0.45 * f);
      wl.push(station([(end.x + dir[0] * L * f) * side, end.y + dir[1] * L * f, wingLE(span) + 0.028 + 0.03 * f], chord, up, prof));
    }
    const tipP = [(end.x + dir[0] * L) * side, end.y + dir[1] * L, wingLE(span) + 0.058];
    const tipChord = c0 * 0.32;
    wl.push(...tipRings(tipP, tipChord, up, prof, [dir[0] * side, dir[1], 0], 0.009));

    add(loft(main, { flip: side > 0 }), "paint");
    add(loft(wl, { flip: side > 0 }), "teal");
    tipAnchors.push([tipP[0] + dir[0] * side * 0.008, tipP[1] + dir[1] * 0.008, tipP[2] + tipChord * 0.4]);
  }

  // ------------------------------------------------------------------
  // 3. horizontal stabilizers
  // ------------------------------------------------------------------
  {
    const sSweep = rad(32), sDih = rad(7), sSpan = 0.15;
    const sChord = (x) => 0.115 + ((0.05 - 0.115) * x) / sSpan;
    const prof = airfoil(28, 0.1, 0);
    for (const side of [1, -1]) {
      const rings = [];
      for (const x of [0, 0.04, 0.08, 0.12, sSpan]) {
        rings.push(station([x * side, 0.02 + Math.tan(sDih) * x, 0.355 + Math.tan(sSweep) * x], sChord(x), [0, 1, 0], prof));
      }
      rings.push(...tipRings([sSpan * side, 0.02 + Math.tan(sDih) * sSpan, 0.355 + Math.tan(sSweep) * sSpan], sChord(sSpan), [0, 1, 0], prof, [side, 0, 0], 0.008));
      add(loft(rings, { flip: side > 0 }), "paint");
    }
  }

  // ------------------------------------------------------------------
  // 4. fin (textured)
  // ------------------------------------------------------------------
  const finRootY = 0.03, finTopY = 0.235, finRootLE = 0.262, finTopLE = 0.445;
  const finChord = (f) => 0.215 + (0.06 - 0.215) * f;
  {
    const n = 32, prof = airfoil(n, 0.09, 0);
    const rings = [], uvs = [];
    const uvRing = (v) => prof.map(([s], k) => [k <= n / 2 ? 0.5 * (1 - s) : 0.5 + 0.5 * s, v]);
    for (const f of [0, 0.2, 0.45, 0.72, 1]) {
      const y = finRootY + (finTopY - finRootY) * f;
      rings.push(station([0, y, finRootLE + (finTopLE - finRootLE) * f], finChord(f), [1, 0, 0], prof));
      uvs.push(uvRing(f));
    }
    rings.push(...tipRings([0, finTopY, finTopLE], finChord(1), [1, 0, 0], prof, [0, 1, 0], 0.01));
    uvs.push(uvRing(1), uvRing(1));
    add(loft(rings, { uvs }), "fin");
  }

  // ------------------------------------------------------------------
  // 5. engines under the wings
  // ------------------------------------------------------------------
  const contrailAnchors = [];
  {
    const ex = 0.165, Rn = 0.034, Ln = 0.15;
    const ey = wingY(ex) - 0.054, ez0 = wingLE(ex) - 0.112;
    const profile = [[0, 0.8], [0.008, 0.9], [0.025, 0.965], [0.07, 1], [0.45, 1], [0.7, 0.965], [0.88, 0.88], [1, 0.8]];
    const ringAt = (cx, zf, rf, seg = 32) => {
      const ring = [];
      for (let j = 0; j <= seg; j++) {
        const a = (j / seg) * TAU;
        ring.push([cx + Math.sin(a) * Rn * rf, ey - Math.cos(a) * Rn * rf, ez0 + zf * Ln]);
      }
      return ring;
    };
    for (const side of [1, -1]) {
      const cx = ex * side;
      add(loft(profile.map(([zf, rf]) => ringAt(cx, zf, rf)), { seam: true }), "paint");
      // inner duct, dark, normals inward
      add(loft([[0, 0.8], [0.12, 0.7], [0.3, 0.6]].map(([zf, rf]) => ringAt(cx, zf, rf, 24)), { flip: true, seam: true }), "dark");
      // fan disc and spinner
      add(new THREE.CircleGeometry(Rn * 0.61, 24), "dark", matrix([cx, ey, ez0 + 0.3 * Ln], [0, Math.PI, 0]));
      add(new THREE.ConeGeometry(Rn * 0.17, Ln * 0.11, 16), "grey", matrix([cx, ey, ez0 + 0.3 * Ln - Ln * 0.055], [-Math.PI / 2, 0, 0]));
      // exhaust: dark disc, grey tail cone
      add(new THREE.CircleGeometry(Rn * 0.76, 24), "dark", matrix([cx, ey, ez0 + 0.985 * Ln]));
      add(new THREE.ConeGeometry(Rn * 0.3, Ln * 0.16, 16), "grey", matrix([cx, ey, ez0 + 1.02 * Ln], [Math.PI / 2, 0, 0]));
      // pylon
      const px = cx - 0.006;
      add(prism([
        [px, ey + Rn * 0.4, ez0 + Ln * 0.5],
        [px, ey + Rn * 0.4, ez0 + Ln * 1.0],
        [px, wingY(ex) + 0.004, ez0 + Ln * 1.15],
        [px, wingY(ex) + 0.004, ez0 + Ln * 0.72],
      ], [0.012, 0, 0]), "paint");

      const anchor = new THREE.Object3D();
      anchor.name = side < 0 ? "LeftContrailAnchor" : "RightContrailAnchor";
      anchor.position.set(cx, ey, ez0 + Ln * 1.1);
      group.add(anchor);
      contrailAnchors.push(anchor);
    }
  }

  // ------------------------------------------------------------------
  // 6. lights
  // ------------------------------------------------------------------
  const dummy = new THREE.Object3D();
  const navLights = new THREE.InstancedMesh(new THREE.SphereGeometry(0.005, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), 2);
  navLights.name = "NavigationLights";
  tipAnchors.forEach((p, i) => {
    dummy.position.set(p[0], p[1], p[2]);
    dummy.updateMatrix();
    navLights.setMatrixAt(i, dummy.matrix);
    navLights.setColorAt(i, new THREE.Color(p[0] < 0 ? 0xff2a2a : 0x2aff70));
  });
  navLights.instanceMatrix.needsUpdate = true;
  navLights.instanceColor.needsUpdate = true;
  navLights.frustumCulled = false;
  group.add(navLights);

  const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
  strobe.name = "TailStrobe";
  strobe.position.set(0, finTopY + 0.004, finTopLE + finChord(1) * 0.9);
  group.add(strobe);

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3030, toneMapped: false }));
  beacon.name = "Beacon";
  beacon.position.set(0, -R * RY - 0.002, -0.12);
  group.add(beacon);

  // ------------------------------------------------------------------
  // 7. assembly
  // ------------------------------------------------------------------
  flush();
  group.scale.z = fuselageLength;
  group.userData.contrailAnchors = contrailAnchors;
  group.userData.specifications = { length: fuselageLength, wingspan: (span + 0.045) * 2, wingSweep, windowCount: 32, engineCount: 2 };

  let strobeOn = true, beaconOn = true;
  function update(t) {
    const phase = t % 1.5;
    const s = phase < 0.065 || (phase > 0.16 && phase < 0.225);
    if (s !== strobeOn) { strobe.visible = s; strobeOn = s; }
    const b = (t % 1.0) < 0.12;
    if (b !== beaconOn) { beacon.visible = b; beaconOn = b; }
  }
  return { group, update };
}
