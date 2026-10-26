import test from 'node:test';
import assert from 'node:assert/strict';
import { STOPS, KINDS, kindOf, TIMING, latLonToXYZ, angleBetween, legPoint, routeFor, sampleRoute, decodeTopo, splitFrance, pickCountry } from '../modules/globe-data.js';

const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

test('latLonToXYZ puts the poles on the y axis and the equator at radius 1', () => {
  const [, ny] = latLonToXYZ(90, 0); assert.ok(near(ny, 1));
  const [, sy] = latLonToXYZ(-90, 0); assert.ok(near(sy, -1));
  const p = latLonToXYZ(0, 45); assert.ok(near(Math.hypot(...p), 1)); assert.ok(near(p[1], 0));
  const q = latLonToXYZ(0, 45, 2); assert.ok(near(Math.hypot(...q), 2));
});

test('angleBetween is the great-circle angle', () => {
  assert.ok(near(angleBetween(latLonToXYZ(0, 0), latLonToXYZ(0, 90)), Math.PI / 2));
  assert.ok(near(angleBetween(latLonToXYZ(0, 0), latLonToXYZ(0, 0)), 0));
});

test('legPoint starts and ends on the ground altitude and climbs in between', () => {
  const a = latLonToXYZ(10, -66), b = latLonToXYZ(46, 0);
  const r = (p) => Math.hypot(...p);
  assert.ok(near(r(legPoint(a, b, 0)), 1 + TIMING.alt0, 1e-4));
  assert.ok(near(r(legPoint(a, b, 1)), 1 + TIMING.alt0, 1e-4));
  assert.ok(r(legPoint(a, b, 0.5)) > 1 + TIMING.alt0 + 0.05);
});

test('routeFor times legs by distance within the limits and keeps arrivals in order', () => {
  const r = routeFor(STOPS);
  assert.equal(r.legs, STOPS.length - 1);
  for (const d of r.durations) assert.ok(d >= TIMING.legMin - 1e-9 && d <= TIMING.legMax + 1e-9);
  const longest = r.durations.indexOf(Math.max(...r.durations));
  assert.equal(longest, r.angles.indexOf(Math.max(...r.angles)));
  for (let i = 1; i < r.arrivals.length; i++) assert.ok(r.arrivals[i] > r.arrivals[i - 1]);
  assert.ok(near(r.arrivals[0], TIMING.lead));
  assert.ok(near(r.total, r.starts[r.legs - 1] + r.durations[r.legs - 1] + TIMING.hold));
  const end = r.pathAt(r.legs), last = latLonToXYZ(STOPS.at(-1).lat, STOPS.at(-1).lon, 1 + TIMING.alt0);
  for (let k = 0; k < 3; k++) assert.ok(near(end[k], last[k], 1e-4));
});

test('sampleRoute returns legs * samples + 1 points', () => {
  const r = routeFor(STOPS.slice(0, 3));
  assert.equal(sampleRoute(r, 10).length, (2 * 10 + 1) * 3);
});

// A tiny TopoJSON: one square country from (0,0) to (10,10) with a hole, and a far one.
const topo = {
  transform: { scale: [1, 1], translate: [0, 0] },
  arcs: [
    [[0, 0], [10, 0], [0, 10], [-10, 0], [0, -10]],          // outer square, closed
    [[3, 3], [4, 0], [0, 4], [-4, 0], [0, -4]],              // hole 3..7
    [[100, 20], [5, 0], [0, 5], [-5, 0], [0, -5]],           // far square 100..105 x 20..25
  ],
  objects: { countries: { geometries: [
    { type: 'Polygon', id: 1, arcs: [[0], [1]], properties: { name: 'Square' } },
    { type: 'MultiPolygon', id: 2, arcs: [[[2]]], properties: { name: 'Far' } },
  ] } },
};

test('decodeTopo rebuilds absolute rings from delta-encoded arcs', () => {
  const c = decodeTopo(topo);
  assert.equal(c.length, 2);
  assert.equal(c[0].name, 'Square'); assert.equal(c[0].id, '1');
  assert.deepEqual(c[0].polys[0][0][2], [10, 10]);
  assert.equal(c[1].polys[0][0][0][0], 100);
});

test('pickCountry finds the country under a point, respects holes, returns null at sea', () => {
  const c = decodeTopo(topo);
  assert.equal(pickCountry(1, 1, c).name, 'Square');
  assert.equal(pickCountry(5, 5, c), null);                   // in the hole
  assert.equal(pickCountry(22, 102, c).name, 'Far');
  assert.equal(pickCountry(50, 50, c), null);
});

test('splitFrance moves polygons south of 20 N to a nameless entry and leaves the input alone', () => {
  const countries = [{ id: '250', name: 'France', polys: [[[[0, 45], [5, 45], [5, 50], [0, 50], [0, 45]]], [[[-53, 4], [-52, 4], [-52, 5], [-53, 5], [-53, 4]]]] }];
  const out = splitFrance(countries);
  assert.equal(out.find((c) => c.name === 'France').polys.length, 1);
  assert.equal(out.find((c) => c.id === 'FRG').polys.length, 1);
  assert.equal(countries[0].polys.length, 2);
});

test('every stop has a known kind, Bordeaux sits between Prague and Clermont-Ferrand, 11 stops', () => {
  assert.equal(STOPS.length, 11);
  for (const s of STOPS) assert.ok(KINDS[s.kind], s.city + ' has kind ' + s.kind);
  const i = STOPS.findIndex((s) => s.city === 'Bordeaux');
  assert.equal(STOPS[i - 1].city, 'Prague'); assert.equal(STOPS[i + 1].city, 'Clermont-Ferrand');
  assert.equal(STOPS[0].kind, 'born');
  assert.equal(kindOf({ kind: 'nonsense' }), 'work');
  assert.equal(KINDS.study.label, 'Studied');
});

test('routeFor handles any number of stops', () => {
  for (const n of [2, 5, 11]) { const r = routeFor(STOPS.slice(0, n)); assert.equal(r.legs, n - 1); assert.equal(r.arrivals.length, n); }
});
