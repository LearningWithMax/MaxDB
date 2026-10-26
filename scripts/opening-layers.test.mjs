import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('the live opening canvas clears to transparent, so the page shows through during the release and settle', () => {
  const src = read('modules/opening.js');
  assert.match(src, /setClearColor\(0x000000, 0\)/);
  assert.doesNotMatch(src, /SPACE_BLACK/);
});

test('at the release the real page background replaces the space black behind the curtain', () => {
  const css = read('css/opening.css');
  assert.match(css, /html\.intro\.intro-release,\s*html\.intro\.intro-release body\s*\{[^}]*background(?:-color)?:\s*var\(--bg\)/);
});

test('the gate ships styled (plain look) before any script runs', () => {
  assert.match(read('index.html'), /<div id="gate"[^>]*data-look="plain"/);
});
