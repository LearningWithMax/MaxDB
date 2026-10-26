import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadClassic } from './lib/load-classic.mjs';

// The inline <head> script decides, before first paint, whether the opening runs. Its pure functions sit between
// markers so the test evaluates exactly what ships.
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const m = html.match(/\/\*intro:start\*\/([\s\S]*?)\/\*intro:end\*\//);
assert.ok(m, 'index.html must contain /*intro:start*/ ... /*intro:end*/');
const { shouldRunIntro, introSeen } = new Function(m[1] + '\n;return { shouldRunIntro, introSeen };')();
const { chooseGateLook } = loadClassic('js/home-intro.js', ['chooseGateLook']);

const base = { hash: '', seen: false, webgl: true, reducedMotion: false, force: false };

test('shouldRunIntro: runs on a first landing at Home', () => {
  assert.equal(shouldRunIntro(base), true);
  assert.equal(shouldRunIntro({ ...base, hash: '#home' }), true);
});

test('shouldRunIntro: not twice in a session', () => {
  assert.equal(shouldRunIntro({ ...base, seen: true }), false);
});

test('shouldRunIntro: a shared deep link skips the opening (Review Focus 4)', () => {
  assert.equal(shouldRunIntro({ ...base, hash: '#cv' }), false);
  assert.equal(shouldRunIntro({ ...base, hash: '#cv/ops' }), false);
  assert.equal(shouldRunIntro({ ...base, hash: '#map' }), false);
  assert.equal(shouldRunIntro({ ...base, hash: '#trip' }), false);
});

test('shouldRunIntro: never with reduced motion or without WebGL', () => {
  assert.equal(shouldRunIntro({ ...base, reducedMotion: true }), false);
  assert.equal(shouldRunIntro({ ...base, webgl: false }), false);
});

test('shouldRunIntro: ?again forces it past the session flag and the hash, but not past reduced motion', () => {
  assert.equal(shouldRunIntro({ ...base, seen: true, force: true }), true);
  assert.equal(shouldRunIntro({ ...base, hash: '#cv', force: true }), true);
  assert.equal(shouldRunIntro({ ...base, force: true, reducedMotion: true }), false);
});

test('introSeen: blocked storage never throws and counts as not seen (Review Focus 2)', () => {
  assert.equal(introSeen({ getItem() { throw new Error('SecurityError'); } }), false);
  assert.equal(introSeen(undefined), false);
  assert.equal(introSeen({ getItem: () => '1' }), true);
  assert.equal(introSeen({ getItem: () => null }), false);
});

test('chooseGateLook: frost only when the browser can blur and the gate runs smoothly', () => {
  assert.equal(chooseGateLook({ backdropFilter: false, fps: 60 }), 'plain');
  assert.equal(chooseGateLook({ backdropFilter: true, fps: 20 }), 'plain');
  assert.equal(chooseGateLook({ backdropFilter: true, fps: null }), 'frost');
  assert.equal(chooseGateLook({ backdropFilter: true, fps: 45 }), 'frost');
  assert.equal(chooseGateLook({ backdropFilter: true, fps: 30 }), 'frost');
});
