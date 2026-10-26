import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fontCodePoints } from './lib/woff2-cmap.mjs';
import { FONT_REQUIRED, checkFontCoverage } from './lib/rules.mjs';

const root = new URL('../', import.meta.url);
const points = (rel) => fontCodePoints(fs.readFileSync(new URL(rel, root)));
const ASCII_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

test('fontCodePoints reads the real glyph table: Inter has the ASCII letters and digits, and not a Polish L with stroke', () => {
  const inter = points('vendor/fonts/Inter-400-600.woff2');
  for (const ch of ASCII_LETTERS) assert.ok(inter.has(ch.codePointAt(0)), 'Inter has ' + ch);
  assert.ok(!inter.has(0x141), 'U+0141 is not in the Inter text subset (it reads the table instead of saying yes to everything)');
});

test('every vendored face has the glyphs the site sets in it (a latin-ext file has almost no ASCII, and the browser still calls it "loaded")', () => {
  for (const [rel, required] of Object.entries(FONT_REQUIRED)) {
    const have = points(rel);
    const missing = [...required].filter((ch) => !have.has(ch.codePointAt(0)));
    assert.deepEqual(missing, [], `${rel} is missing: ${missing.map((c) => c + ' U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(', ')}`);
  }
});

test('FONT_REQUIRED names the five faces the stylesheets declare, and every file is on disk', () => {
  const faces = fs.readFileSync(new URL('css/fonts.css', root), 'utf8').match(/vendor\/fonts\/[A-Za-z0-9-]+\.woff2/g).sort();
  assert.deepEqual(Object.keys(FONT_REQUIRED).sort(), faces);
  for (const rel of faces) assert.ok(fs.existsSync(new URL(rel, root)), rel);
});

test('checkFontCoverage names the face and each missing character', () => {
  const cov = { 'vendor/fonts/A.woff2': new Set([...'ABC'].map((c) => c.codePointAt(0))) };
  const out = checkFontCoverage(cov, { 'vendor/fonts/A.woff2': 'ABD→' });
  assert.equal(out.length, 1);
  assert.ok(out[0].includes('vendor/fonts/A.woff2') && out[0].includes('D') && out[0].includes('U+2192'), out[0]);
});

test('checkFontCoverage is clean when every required character is there, and flags a face it was not given at all', () => {
  const cov = { 'vendor/fonts/A.woff2': new Set([...'ABC'].map((c) => c.codePointAt(0))) };
  assert.deepEqual(checkFontCoverage(cov, { 'vendor/fonts/A.woff2': 'CAB' }), []);
  assert.ok(checkFontCoverage(cov, { 'vendor/fonts/B.woff2': 'A' }).some((m) => m.includes('vendor/fonts/B.woff2')));
});

// ---- the character set the fonts are cut to, and the guard that keeps site text inside it ----
import { FONT_TEXT, siteExtraChars } from './lib/font-text.mjs';
import { checkSiteGlyphs } from './lib/rules.mjs';

test('FONT_TEXT is printable ASCII plus the few other characters the site shows (© · Á × á ã ç é ñ → ↺ − ✕), nothing speculative', () => {
  const ascii = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('');
  assert.equal(FONT_TEXT.slice(0, 95), ascii);
  assert.deepEqual([...FONT_TEXT.slice(95)].sort(), [...'©·Á×áãçéñ→↺−✕'].sort());
});

test('siteExtraChars decodes entities, ignores emoji and flags, and reports each other character once', () => {
  assert.deepEqual([...siteExtraChars('Caf&eacute; &middot; S&atilde;o &rarr; \u{1F1EA}\u{1F1F8} café')].sort(), ['·', 'ã', 'é', '→']);
});

test('checkSiteGlyphs flags a visible character the fonts do not have, naming the file, and is clean otherwise', () => {
  const out = checkSiteGlyphs({ 'index.html': 'Wroc&lstrok;aw and Gdańsk', 'js/data.js': 'plain' }, FONT_TEXT);
  assert.ok(out.some((m) => m.includes('index.html') && m.includes('U+0144')), out.join(' | '));
  assert.deepEqual(checkSiteGlyphs({ 'index.html': 'Caf&eacute; &rarr; ok' }, FONT_TEXT), []);
});

test('an entity the decoder does not know is flagged, so it can never hide a character from the guard', () => {
  assert.ok(checkSiteGlyphs({ 'index.html': 'a &hellip; b &weirdthing; c' }, FONT_TEXT).some((m) => m.includes('&weirdthing;')));
});

test('the real site text uses only characters the fonts were cut to', () => {
  const texts = { 'index.html': fs.readFileSync(new URL('index.html', root), 'utf8') };
  for (const f of fs.readdirSync(new URL('js/', root))) texts['js/' + f] = fs.readFileSync(new URL('js/' + f, root), 'utf8');
  assert.deepEqual(checkSiteGlyphs(texts, FONT_TEXT), []);
});
