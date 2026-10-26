import test from 'node:test';
import assert from 'node:assert/strict';
import { FINISHES, STUDIO, SPACE_BLACK, tierParams, glideTargets, chromeShade } from '../modules/opening-config.js';

test('chromeShade lights the logo like the render: brighter at the top left, a warm bronze bounce toward the bottom', () => {
  const topLeft = chromeShade(0, 1), bottomRight = chromeShade(1, 0), middle = chromeShade(0.5, 0.5);
  assert.equal(topLeft.length, 3);
  assert.ok(topLeft[1] > bottomRight[1] * 1.25, 'the top left is clearly brighter than the bottom right');
  const warmth = (c) => c[0] / c[2];
  assert.ok(warmth(chromeShade(0.5, 0)) > warmth(chromeShade(0.5, 1)) * 1.2, 'the bottom is warmer than the top');
  for (const c of [topLeft, bottomRight, middle]) for (const n of c) assert.ok(n >= 0.4 && n <= 1.5, 'stays a tint, never blown out or black: ' + n);
});

test('STUDIO is a dark room with bright softboxes: chrome needs contrast to read as chrome (a bright even room made flat grey pearls)', () => {
  assert.ok(STUDIO.ambient > 0 && STUDIO.ambient <= 0.2, 'dark room');
  assert.ok(STUDIO.panels.length >= 3, 'several softboxes, so the reflections have shape');
  assert.ok(STUDIO.panels.some((p) => p.intensity >= 6), 'at least one really bright box');
  for (const p of STUDIO.panels) {
    assert.equal(p.pos.length, 3);
    assert.ok(p.pos.every((n) => Number.isFinite(n) && Math.abs(n) < 13), 'inside the room');
    assert.equal(p.size.length, 2);
    assert.ok(p.size.every((n) => n > 0));
    assert.ok(p.intensity > 1, 'brighter than the room, or it is not a light');
    assert.match(p.color, /^#[0-9a-f]{6}$/i);
  }
});

test('FINISHES holds one finish, chrome: a light neutral, fully metal, polished', () => {
  assert.deepEqual(Object.keys(FINISHES), ['chrome']);
  const c = FINISHES.chrome;
  assert.match(c.color, /^#[0-9a-f]{6}$/i);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.color.slice(i, i + 2), 16));
  assert.ok(Math.min(r, g, b) >= 0xc8, 'light, so it reflects the room instead of absorbing it');
  assert.ok(Math.max(r, g, b) - Math.min(r, g, b) <= 24, 'neutral, so the tint comes from what it reflects');
  assert.equal(c.metalness, 1);
  assert.ok(c.roughness <= 0.2, 'polished');
  assert.ok(c.clearcoat >= 0 && c.clearcoat <= 1);
});

test('SPACE_BLACK is the owner-approved space black', () => {
  assert.equal(SPACE_BLACK, '#07070b');
});

test('tierParams: full is the fine 3,400-sphere set, lite is the fat 500-sphere set', () => {
  assert.deepEqual({ ...tierParams('full') }, { k: 0.5, min: 1.6, max: 6, pixelRatioCap: 1.5 });
  assert.deepEqual({ ...tierParams('lite') }, { k: 1.3, min: 4.2, max: 18, pixelRatioCap: 1.5 });
});

test('tierParams falls back to lite for an unknown tier (never the heavy set by accident)', () => {
  assert.deepEqual({ ...tierParams('zzz') }, { ...tierParams('lite') });
});

test('glideTargets scales the letters onto the logo slot and returns the center offsets', () => {
  const t = glideTargets({ x: 100, y: 100, width: 400, height: 200 }, { x: 20, y: 10, width: 100, height: 50 });
  assert.deepEqual({ ...t }, { scale: 0.25, dx: -230, dy: -165 });
});
