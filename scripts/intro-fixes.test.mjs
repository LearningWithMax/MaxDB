import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadClassic } from './lib/load-classic.mjs';

// Fixes from the final review: stranded gate, hidden tab, background-tab fps, double fade.
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const m = html.match(/\/\*intro:start\*\/([\s\S]*?)\/\*intro:end\*\//);
assert.ok(m, 'inline intro markers');
const { releaseIntroIfStranded } = new Function(m[1] + '\n;return { releaseIntroIfStranded };')();
const { shouldFinishAfterHidden, fpsFromDeltas, prepareIntroDom, chooseGateLook } = loadClassic('js/home-intro.js', ['shouldFinishAfterHidden', 'fpsFromDeltas', 'prepareIntroDom', 'chooseGateLook']);

test('releaseIntroIfStranded: if home-intro.js never ran, the page is shown after load (no black screen)', () => {
  const removed = [];
  releaseIntroIfStranded({}, { classList: { remove: (c) => removed.push(c) } });
  assert.deepEqual(removed, ['intro']);
});

test('releaseIntroIfStranded: leaves the intro alone when home-intro.js is running', () => {
  const removed = [];
  releaseIntroIfStranded({ __intro: { state: 'gate' } }, { classList: { remove: (c) => removed.push(c) } });
  assert.deepEqual(removed, []);
});

test('shouldFinishAfterHidden: a tab hidden for more than 1.5 s during the opening skips to the page (Review Focus 5)', () => {
  assert.equal(shouldFinishAfterHidden({ hiddenMs: 10000, started: true, finished: false }), true);
  assert.equal(shouldFinishAfterHidden({ hiddenMs: 800, started: true, finished: false }), false);
  assert.equal(shouldFinishAfterHidden({ hiddenMs: 10000, started: false, finished: false }), false);
  assert.equal(shouldFinishAfterHidden({ hiddenMs: 10000, started: true, finished: true }), false);
});

test('fpsFromDeltas: steady 60 fps reads as 60, and a long hidden gap in the middle is ignored', () => {
  const steady = Array(60).fill(1000 / 60);
  assert.ok(Math.abs(fpsFromDeltas(steady) - 60) < 0.5);
  const withGap = [...steady.slice(0, 30), 3000, ...steady.slice(30)];
  assert.ok(Math.abs(fpsFromDeltas(withGap) - 60) < 0.5);
});

test('fpsFromDeltas: a genuinely slow gate reads slow, and no usable frames reads unknown (so frost is kept)', () => {
  assert.ok(Math.abs(fpsFromDeltas(Array(20).fill(50)) - 20) < 0.5);
  assert.equal(fpsFromDeltas([]), null);
  assert.equal(fpsFromDeltas([400, 900, 3000]), null);
  assert.equal(chooseGateLook({ backdropFilter: true, fps: fpsFromDeltas([]) }), 'frost');
});

test('prepareIntroDom: every load-time fade on Home is removed so nothing fades in twice', () => {
  const removed = [], calls = [];
  const nodes = [1, 2, 3].map(() => ({ classList: { remove: (c) => removed.push(c) } }));
  prepareIntroDom({ querySelectorAll: (sel) => { calls.push(sel); return nodes; } });
  assert.deepEqual(removed, ['fade-in', 'fade-in', 'fade-in']);
  assert.deepEqual(calls, ['#page-home .fade-in']);
});
