// Pure data and math for the flight globe: the stops, the colors, the timing, and the functions that turn them into
// positions, durations and country shapes. No DOM and no three.js here, so Node tests can import it (scripts/globe-data.test.mjs).

// What kind of stop it is. The marker shape and tone on the globe, and the tag in the list and the card, come from here.
export const KINDS = {
  born:  { label: 'Born',    marker: 'target' },   // ring with a center dot: the start look
  study: { label: 'Studied', marker: 'ring' },     // hollow ring
  work:  { label: 'Worked',  marker: 'dot' },      // filled dot
};
export const kindOf = (stop) => (KINDS[stop.kind] ? stop.kind : 'work');

// The route. Placeholder copy: the owner writes the final wording.
// Shape: { cc, city, country, lat, lon, kind, when, what } with kind 'born' | 'study' | 'work'. Any number of stops works.
export const STOPS = [
  { cc: 'VE', city: 'Caracas', country: 'Venezuela', lat: 10.48, lon: -66.90, kind: 'born', when: 'Born here', what: 'Where the route starts.' },
  { cc: 'FR', city: 'Poitiers', country: 'France', lat: 46.58, lon: 0.34, kind: 'study', when: '2017 to 2019', what: 'Associate degree, analytical and synthetic chemistry.' },
  { cc: 'CZ', city: 'Prague', country: 'Czech Republic', lat: 50.08, lon: 14.44, kind: 'work', when: '2019', what: 'HPLC research internship, Czech Academy of Sciences.' },
  { cc: 'FR', city: 'Bordeaux', country: 'France', lat: 44.84, lon: -0.58, kind: 'study', when: '2019', what: 'Placeholder: the owner writes this line.' },
  { cc: 'FR', city: 'Clermont-Ferrand', country: 'France', lat: 45.78, lon: 3.08, kind: 'work', when: '2019 to 2021', what: 'R&D work-study at Michelin.' },
  { cc: 'IL', city: 'Rehovot', country: 'Israel', lat: 31.89, lon: 34.81, kind: 'work', when: '2021', what: 'Weizmann Institute of Science.' },
  { cc: 'ES', city: 'Madrid', country: 'Spain', lat: 40.42, lon: -3.70, kind: 'study', when: '2021 to 2022', what: "Master's in Chemical Industry Management." },
  { cc: 'VE', city: 'Caracas', country: 'Venezuela', lat: 10.48, lon: -66.90, kind: 'work', when: '2022 to 2023', what: 'Laboratorios Chacao.' },
  { cc: 'ES', city: 'Madrid', country: 'Spain', lat: 40.42, lon: -3.70, kind: 'work', when: '2023 to 2024', what: 'Intelcia.' },
  { cc: 'VE', city: 'Caracas', country: 'Venezuela', lat: 10.48, lon: -66.90, kind: 'work', when: '2024 to 2025', what: 'Avicampo.' },
  { cc: 'IL', city: 'Yashresh', country: 'Israel', lat: 31.87, lon: 34.86, kind: 'work', when: '2025 to 2026', what: 'Cann.Edenn.' },
];

// One color per route country, muted so they sit with the site palette. Everything else on the globe is neutral.
export const COLORS = { VE: '#5fb37c', FR: '#5e8fd8', CZ: '#a083d9', IL: '#e4b24e', ES: '#e86a4c' };
export const NAME_TO_CC = { Venezuela: 'VE', France: 'FR', Czechia: 'CZ', 'Czech Republic': 'CZ', Israel: 'IL', Spain: 'ES' };
export const LABELS = [
  { name: 'Venezuela', lat: 7.0, lon: -66.0 }, { name: 'France', lat: 47.2, lon: 1.6 },
  { name: 'Czechia', lat: 50.4, lon: 15.6 }, { name: 'Spain', lat: 39.3, lon: -4.2 }, { name: 'Israel', lat: 31.0, lon: 35.1 },
];

// The look of the globe itself. Colors only; the module turns them into textures and materials.
export const PALETTE = {
  ocean: ['#0c1726', '#15304b', '#0c1726'],              // top, equator, bottom
  land: ['#78746d', '#7e7a73', '#736f68', '#848079'],   // warm parchment grey, picked per country by a hash
  ice: '#b9c3ca',
  graticule: 'rgba(255,255,255,0.045)',
  equator: 'rgba(255,255,255,0.09)',
  border: 'rgba(12,23,38,0.55)',
  outline: 'rgba(255,255,255,0.7)',
  polar: 'rgba(225,235,245,0.3)',
  atmosphere: '#3fb4c4',
  star: '#f3ece2',
  route: '#ff6a45',
  ahead: '#f3ece2',
  ring: '#f3ece2',                                       // born: the start look
  study: '#bfeee8',                                      // hollow ring, cool tone
  work: '#ffb089',                                       // filled dot, warm tone
  contrail: '#f6f1ea',
};

// Timing. Legs are timed by distance: a short hop takes legMin seconds, the longest leg legMax. Not under 2.5 s, or the
// camera lag turns into the jet leaving the frame. hold is the pause at each stop, lead the quiet start.
export const TIMING = { legMin: 2.5, legMax: 4, hold: 1.2, lead: 0.8, alt0: 0.035, altMax: 0.11, samples: 120 };

const D2R = Math.PI / 180;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Unit-sphere position for a latitude and longitude, same frame as a three.js SphereGeometry with its default UVs.
export function latLonToXYZ(lat, lon, r = 1) {
  const phi = (90 - lat) * D2R, th = (lon + 180) * D2R;
  return [-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th)];
}

export const angleBetween = (a, b) => Math.acos(clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1));

// Point along the great circle from a to b (unit vectors), lifted above the surface by a gentle arc with zero slope at
// both ends, so the jet leaves and lands level.
export function legPoint(a, b, t, timing = TIMING) {
  const ang = angleBetween(a, b), sin = Math.sin(ang) || 1e-6;
  const wa = Math.sin((1 - t) * ang) / sin, wb = Math.sin(t * ang) / sin;
  let x = a[0] * wa + b[0] * wb, y = a[1] * wa + b[1] * wb, z = a[2] * wa + b[2] * wb;
  const n = Math.hypot(x, y, z) || 1;
  const alt = timing.alt0 + timing.altMax * Math.pow(Math.sin(Math.PI * t), 2) * Math.min(1, ang / 1.3);
  const s = (1 + alt) / n;
  return [x * s, y * s, z * s];
}

// Route positions and timing for a list of stops.
export function routeFor(stops, timing = TIMING) {
  const points = stops.map((s) => latLonToXYZ(s.lat, s.lon));
  const legs = points.length - 1;
  const angles = points.slice(0, -1).map((p, i) => angleBetween(p, points[i + 1]));
  const longest = Math.max(...angles, 1e-6);
  const durations = angles.map((a) => timing.legMin + (timing.legMax - timing.legMin) * (a / longest));
  const starts = [];
  let t = timing.lead;
  for (let i = 0; i < legs; i++) { starts.push(t); t += durations[i] + timing.hold; }
  const arrivals = stops.map((_, i) => (i === 0 ? timing.lead : starts[i - 1] + durations[i - 1]));
  const total = legs ? starts[legs - 1] + durations[legs - 1] + timing.hold : timing.lead;
  const pathAt = (g) => {
    g = clamp(g, 0, legs);
    const i = Math.min(legs - 1, Math.floor(g));
    return legPoint(points[i], points[i + 1], g - i, timing);
  };
  return { points, legs, angles, durations, starts, arrivals, total, pathAt };
}

// Sampled positions of the whole route, legs * samples + 1 points, flat [x, y, z, ...].
export function sampleRoute(route, samples = TIMING.samples) {
  const n = route.legs * samples + 1, out = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) { const p = route.pathAt(k / samples); out[k * 3] = p[0]; out[k * 3 + 1] = p[1]; out[k * 3 + 2] = p[2]; }
  return out;
}

// TopoJSON (world-atlas countries) to plain polygons: [{ id, name, polys: [[ring: [[lon, lat], ...]], ...] }].
export function decodeTopo(topo) {
  const [sx, sy] = topo.transform.scale, [tx, ty] = topo.transform.translate;
  const arcs = topo.arcs.map((arc) => { let x = 0, y = 0; return arc.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; }); });
  const ring = (idxs) => {
    const pts = [];
    for (const i of idxs) { const a = i >= 0 ? arcs[i] : arcs[~i].slice().reverse(); for (let k = pts.length ? 1 : 0; k < a.length; k++) pts.push(a[k]); }
    return pts;
  };
  return topo.objects.countries.geometries.map((g) => {
    const polys = g.type === 'Polygon' ? [g.arcs.map(ring)] : g.type === 'MultiPolygon' ? g.arcs.map((p) => p.map(ring)) : [];
    return { id: String(g.id), name: g.properties?.name ?? '', polys };
  });
}

// French Guiana is part of France in the dataset. Move the southern polygons to a nameless entry so only mainland
// France takes the route color. Returns a new list; the input is not changed.
export function splitFrance(countries) {
  const out = countries.map((c) => ({ ...c }));
  const fr = out.find((c) => c.name === 'France');
  if (!fr) return out;
  const south = (poly) => poly[0].every(([, lat]) => lat < 20);
  out.push({ id: 'FRG', name: '', polys: fr.polys.filter(south) });
  fr.polys = fr.polys.filter((p) => !south(p));
  return out;
}

// Even-odd point in polygon, in lon/lat. Rings that cross the date line are handled by testing the point shifted by 360 too.
function inRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function inPoly(lon, lat, poly) {
  if (!inRing(lon, lat, poly[0])) return false;
  for (let h = 1; h < poly.length; h++) if (inRing(lon, lat, poly[h])) return false;
  return true;
}
// The country under a point, or null. countries as from decodeTopo.
export function pickCountry(lat, lon, countries) {
  for (const c of countries) for (const poly of c.polys) {
    if (inPoly(lon, lat, poly) || inPoly(lon + 360, lat, poly) || inPoly(lon - 360, lat, poly)) return c;
  }
  return null;
}

// Deterministic small hash for picking a land shade per country.
export function hashString(s) { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
