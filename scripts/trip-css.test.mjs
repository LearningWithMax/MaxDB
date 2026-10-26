import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const tokens = read('css/tokens.css');
const globe = read('css/globe.css');
const trip = read('css/trip.css');
const block = (source, sel) => {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = source.match(new RegExp('(?:^|[}/])\\s*' + esc + '\\s*\\{([^}]*)\\}'));
  assert.ok(m, 'rule not found: ' + sel);
  return m[1];
};
const rootBlock = block(tokens, ':root');
const lightBlock = block(tokens, ':root[data-theme="light"]');

// The globe's color tokens (the CSS reads these) and the ones that are sizes, layout or set from JavaScript
const COLOR_NAMES = ['bg', 'ink', 'ink-2', 'label-ink', 'mute', 'dim', 'line', 'btn', 'btn-line', 'panel', 'hover', 'accent', 'accent-2', 'accent-soft', 'scrim-strong', 'scrim-mid', 'mono'];
const NOT_TOKENS = ['label-size', 'gap', 'gap-l', 'pad-s', 'legend-w', 'legend-size', 'legend-n-size', 'legend-sub-size', 'tag-size', 'radius', 'card-bottom', 'card-no-size', 'card-city-size', 'card-when-size', 'card-what-size', 'btn-size', 'stop-color'];

test('css/globe.css has no hex color and no color fallback; rgba is only the text shadow', () => {
  assert.doesNotMatch(globe, /#[0-9a-f]{3,8}\b/i);
  for (const m of globe.matchAll(/[^;{}]*rgba?\([^;{}]*/g)) assert.match(m[0], /text-shadow/, m[0].trim());
});

test('every --globe-* color the globe CSS reads is a token: set once in :root, never per theme', () => {
  const read = new Set([...globe.matchAll(/var\(--globe-([a-z0-9-]+)/g)].map((m) => m[1]));
  for (const name of read) if (!NOT_TOKENS.includes(name)) assert.ok(COLOR_NAMES.includes(name), `--globe-${name} is read but is not a known token`);
  for (const name of COLOR_NAMES) {
    assert.match(rootBlock, new RegExp(`--globe-${name}\\s*:`), `--globe-${name} in :root`);
    assert.doesNotMatch(lightBlock, new RegExp(`--globe-${name}\\s*:`), `--globe-${name} must not change with the theme (the globe is dark in both)`);
  }
});

test('the globe tokens point at the dark-object tokens or are fixed values, and the accents are the dark-theme orange and green', () => {
  const val = (n) => (rootBlock.match(new RegExp(`--globe-${n}\\s*:\\s*([^;]+);`)) || [])[1].trim();
  assert.equal(val('bg'), 'var(--board)');
  assert.equal(val('ink'), 'var(--board-ink)');
  assert.equal(val('mute'), 'var(--board-mute)');
  assert.equal(val('line'), 'var(--board-edge)');
  assert.equal(val('mono'), 'var(--font-mono)');
  assert.equal(val('accent'), '#ff7a4d');
  assert.equal(val('accent-2'), '#3fcf8d');
});

test('css/trip.css: no hex color, rgba only in shadows, nothing loops', () => {
  assert.doesNotMatch(trip, /#[0-9a-f]{3,8}\b/i);
  for (const m of trip.matchAll(/[^;{}]*rgba?\([^;{}]*/g)) assert.match(m[0], /box-shadow/, m[0].trim());
  assert.doesNotMatch(trip, /infinite/);
});

test('css/trip.css: the globe shows with the globe, the fallback shows without it', () => {
  assert.match(trip, /#page-trip\[data-globe="off"\] \[data-when="globe"\]\s*\{[^}]*display:\s*none/);
  assert.match(trip, /#page-trip:not\(\[data-globe="off"\]\) \[data-when="fallback"\]\s*\{[^}]*display:\s*none/);
});

test('css/trip.css: the globe sits in the dark frame, the same in both themes, with its loading message', () => {
  const f = block(trip, '.trip-globe-frame');
  assert.match(f, /background:\s*var\(--board\)/);
  assert.match(f, /border:\s*1px solid var\(--board-edge\)/);
  assert.match(f, /border-radius:\s*var\(--r-obj\)/);
  assert.match(f, /aspect-ratio:\s*16\s*\/\s*10/, 'the same ratio as the globe, so the page does not jump when it mounts');
  assert.match(trip, /@media\s*\(max-width:\s*820px\)\s*\{[^@]*\.trip-globe-frame\s*\{[^}]*aspect-ratio:\s*4\s*\/\s*5/);
  assert.match(trip, /:root\[data-theme="light"\] \.trip-globe-frame\s*\{[^}]*box-shadow/);
  assert.match(block(trip, '.trip-globe-msg'), /var\(--font-mono\)/);
  assert.match(trip, /\.trip-globe-msg:empty\s*\{[^}]*display:\s*none/);
});

test('css/trip.css: the site fonts on the globe card and list: serif city, mono tags and dates, sans lines', () => {
  assert.match(trip, /\.globe-card-city\s*\{[^}]*font-family:\s*var\(--font-serif\)/);
  assert.match(trip, /\.globe-card-no,[^{]*\.globe-card-when,[^{]*\.globe-stop-n\s*\{[^}]*font-family:\s*var\(--font-mono\)/);
  assert.match(trip, /\.globe-stop-btn,[^{]*\.globe-card-what\s*\{[^}]*font-family:\s*var\(--font-sans\)/);
});

test('css/trip.css: the album buttons wrap inside their list, and the plain stop list has mono numbers and kind tags', () => {
  assert.match(block(trip, '.trip-album-list'), /flex-wrap:\s*wrap/);
  assert.match(block(trip, '.trip-stops'), /list-style:\s*none/);
  assert.match(block(trip, '.trip-stop-n'), /var\(--font-mono\)/);
  assert.match(block(trip, '.trip-stop-kind'), /var\(--font-mono\)/);
});

// ---- the controls on a wide window (owner, 2026-10-27): the route list sits down the right side, and the slider used to run under it ----
test('css/trip.css: in a wide window the controls end before the route list, so the list is never covered', () => {
  const m = trip.match(/@container \(min-width: 821px\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(m, 'a container rule for the wide window');
  assert.match(m[1], /\.trip-globe \.globe-bar\s*\{[^}]*right:\s*calc\(var\(--globe-legend-w, 236px\) \+ var\(--globe-gap, 14px\) \+ var\(--globe-gap-l, 16px\) \+ var\(--sp-8\)\)/, 'the bar stops left of the list');
  assert.match(globe, /@container \(max-width: 820px\)\s*\{[\s\S]*?\.globe-legend\{[^}]*top:12px/, 'the list is a strip along the top up to 820 px, so the wide rule starts exactly where the list moves to the side');
});

test('css/trip.css: with a mouse the buttons and the slider are a little smaller; touch keeps the 44 px targets', () => {
  const m = trip.match(/@media \(pointer: fine\)\s*\{\s*@container \(min-width: 821px\)\s*\{([\s\S]*?)\n  \}\s*\n\}/);
  assert.ok(m, 'a mouse-only rule for the wide window');
  assert.match(m[1], /\.trip-globe \.globe-play,\s*\.trip-globe \.globe-restart\s*\{[^}]*min-height:\s*36px[^}]*min-width:\s*36px[^}]*padding:\s*6px 12px[^}]*font-size:\s*12px/);
  assert.match(m[1], /\.trip-globe \.globe-scrub\s*\{[^}]*min-height:\s*36px/);
  assert.doesNotMatch(trip.replace(m[0], ''), /\.globe-(play|restart)[^{]*\{[^}]*min-height:\s*3\d/, 'the 36 px size exists only under the mouse-only rule');
});

test('css/trip.css: the route list sits above the globe\'s dark bottom gradient, so its last stops are not dimmed', () => {
  assert.match(block(trip, '.trip-globe .globe-legend'), /z-index:\s*1/);
  assert.match(globe, /root\.append|\.globe-scrim/, 'the gradient is the globe\'s own');
});
