import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseEsModule, checkImportMap } from './lib/rules.mjs';
import { loadClassic } from './lib/load-classic.mjs';

const mapHtml = (imports) => `<head><script type="importmap">${JSON.stringify({ imports })}</script></head>`;

test('parseEsModule returns null for valid module syntax with imports and exports', () => {
  assert.equal(parseEsModule('import a from "x"; export const y = 1;'), null);
});

test('parseEsModule returns an error string containing SyntaxError for broken syntax', () => {
  const err = parseEsModule('export const = ;');
  assert.equal(typeof err, 'string');
  assert.match(err, /SyntaxError/);
});

test('checkImportMap reports a missing local target', () => {
  const msgs = checkImportMap(mapHtml({ three: './vendor/three/three.module.min.js' }), () => false);
  assert.equal(msgs.length, 1);
  assert.match(msgs[0], /vendor\/three\/three\.module\.min\.js/);
});

test('checkImportMap is clean when every target exists', () => {
  assert.deepEqual(checkImportMap(mapHtml({ three: './vendor/three/three.module.min.js' }), () => true), []);
});

test('checkImportMap rejects an absolute path (breaks under /MaxDB/)', () => {
  const msgs = checkImportMap(mapHtml({ x: '/vendor/x.js' }), () => true);
  assert.equal(msgs.length, 1);
  assert.match(msgs[0], /absolute/);
});

test('checkImportMap rejects a remote URL (libraries must be vendored)', () => {
  const msgs = checkImportMap(mapHtml({ x: 'https://cdn.jsdelivr.net/x.js' }), () => true);
  assert.equal(msgs.length, 1);
  assert.match(msgs[0], /remote/);
});

test('checkImportMap is clean when the page has no import map', () => {
  assert.deepEqual(checkImportMap('<head></head>', () => false), []);
});

test('loadClassic returns named top-level bindings of a classic script', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'lc-')), 'a.js');
  fs.writeFileSync(file, 'const A = 1; function f(){ return A; }');
  const { f } = loadClassic(file, ['f']);
  assert.equal(f(), 1);
});

import crypto from 'node:crypto';
import { verifyManifest } from './lib/rules.mjs';
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

test('verifyManifest is clean when every file matches its hash', () => {
  const manifest = { files: { 'vendor/a.js': { sha256: sha('abc') } } };
  assert.deepEqual(verifyManifest(manifest, () => Buffer.from('abc')), []);
});

test('verifyManifest reports a changed file by path', () => {
  const manifest = { files: { 'vendor/a.js': { sha256: sha('abc') } } };
  const msgs = verifyManifest(manifest, () => Buffer.from('abd'));
  assert.equal(msgs.length, 1);
  assert.match(msgs[0], /vendor\/a\.js/);
});

test('verifyManifest reports a missing file', () => {
  const manifest = { files: { 'vendor/a.js': { sha256: sha('abc') } } };
  const msgs = verifyManifest(manifest, () => null);
  assert.equal(msgs.length, 1);
  assert.match(msgs[0], /missing/);
});

import * as rules from './lib/rules.mjs';
test('the lens variant check is gone with the readings (one CV reading, owner 2026-11-06)', () => {
  assert.equal('checkLensVariants' in rules, false);
});

import { findBannedText } from './lib/rules.mjs';
const flagged = (text) => findBannedText('f.html', text);

test('findBannedText: a clean string is clean', () => {
  assert.deepEqual(flagged('Team Lead at Cann.Edenn, an organization in Israel. It is Customer-Facing.'), []);
});

for (const [label, text] of [
  ['em dash', 'a \u2014 b'], ['en dash', '2021 \u2013 2022'], ['&mdash;', 'a &mdash; b'], ['&ndash;', '2021 &ndash; 2022'],
  ['left curly single', '\u2018x'], ['right curly single', 'Master\u2019s'], ['left curly double', '\u201cx'], ['right curly double', 'x\u201d'],
  ['&lsquo;', '&lsquo;x'], ['&rsquo;', 'Master&rsquo;s'], ['&ldquo;', '&ldquo;x'], ['&rdquo;', 'x&rdquo;'],
  ['Technical Sales', 'Technical Sales &amp; Customer Success'], ['Cann.Eden single n', 'Team Lead, Cann.Eden'],
  ['organisation', 'the organisation'], ['colour', 'a colour'], ['centre', 'the centre'], ['programme', 'a programme'],
  ['analysed', 'we analysed it'], ['behaviour', 'behaviour'], ['favourite', 'favourite'], ['realised', 'realised'],
  ['optimised', 'optimised'], ['specialised', 'specialised'],
]) {
  test(`findBannedText flags ${label} and names the file`, () => {
    const msgs = flagged(text);
    assert.ok(msgs.length >= 1, `expected a flag for ${label}`);
    assert.match(msgs[0], /f\.html/);
  });
}

test('findBannedText no longer flags the listing work: the owner lifted that ban with his choice B (2026-11-06)', () => {
  assert.deepEqual(flagged('Reviewed and approved resale marketplace listings, a listing review before publication.'), []);
});

test('findBannedText does not flag valid American words that share a British stem', () => {
  assert.deepEqual(flagged('a specialist, a realistic plan, optimistic, an analysis, the analyses, Cann.Edenn'), []);
});

for (const word of ['vulcanisation', 'biomineralisation', 'Optimisation', 'standardisations']) {
  test(`findBannedText flags the British -isation ending in ${word}`, () => {
    assert.match(flagged(`thermopress ${word} step`).join(' '), /isation/);
  });
}
test('findBannedText does not flag the American -ization ending', () => {
  assert.deepEqual(flagged('vulcanization, biomineralization, organization'), []);
});

import { checkBoardLines } from './lib/rules.mjs';
const jobTag = (over = {}) => {
  const a = { year: '2025', place: 'Yashresh', company: 'Cann.Edenn', line: 'A', ...over };
  return `<div class="job" data-board ${Object.entries(a).filter(([, v]) => v !== null).map(([k, v]) => `data-${k}="${v}"`).join(' ')}></div>`;
};

test('checkBoardLines is clean for valid jobs and for a page with no board jobs', () => {
  assert.deepEqual(checkBoardLines(jobTag() + jobTag({ company: 'Avicampo' })), []);
  assert.deepEqual(checkBoardLines('<p>none</p>'), []);
});

test('checkBoardLines names the job when a line is over 28 characters', () => {
  const msgs = checkBoardLines(jobTag({ line: 'A'.repeat(29) }));
  assert.equal(msgs.length, 1);
  assert.match(msgs[0], /Cann\.Edenn/);
  assert.match(msgs[0], /too long/);
});

test('checkBoardLines flags a missing line', () => {
  const msgs = checkBoardLines(jobTag({ line: null }));
  assert.equal(msgs.length, 1);
  assert.match(msgs[0], /missing line/);
});

test('checkBoardLines flags a leftover reading attribute (data-line-cust, data-w-ops), so no half-removed reading ships', () => {
  assert.match(checkBoardLines(jobTag({ 'line-cust': 'X' })).join(' '), /old reading attribute/);
  assert.match(checkBoardLines(jobTag({ 'w-ops': '1' })).join(' '), /old reading attribute/);
});

import { checkLogoAssets } from './lib/rules.mjs';
const FULL = [
  'img/logo/chrome-banner.webp',
  'img/logo/favicon-32.png', 'img/logo/favicon-180.png', 'img/og.png',
].map((name) => ({ name, bytes: 12000 }));

test('checkLogoAssets is clean for a complete small set', () => {
  assert.deepEqual(checkLogoAssets(FULL), []);
});

test('checkLogoAssets names a banner webp over 30000 bytes', () => {
  const set = FULL.map((f) => (f.name === 'img/logo/chrome-banner.webp' ? { ...f, bytes: 31000 } : f));
  const msgs = checkLogoAssets(set);
  assert.equal(msgs.length, 1);
  assert.match(msgs[0], /chrome-banner\.webp/);
});

test('checkLogoAssets reports each missing favicon, sharing image and banner', () => {
  const msgs = checkLogoAssets(FULL.filter((f) => !/favicon-180|og\.png|chrome-banner/.test(f.name)));
  assert.equal(msgs.length, 3);
  assert.match(msgs.join(' '), /favicon-180\.png/);
  assert.match(msgs.join(' '), /og\.png/);
  assert.match(msgs.join(' '), /chrome-banner\.webp/);
});

test('checkLogoAssets flags a leftover lens-finish banner still (the logo no longer follows the lens)', () => {
  const msgs = checkLogoAssets([...FULL, { name: 'img/logo/gold-banner.webp', bytes: 9000 }]);
  assert.equal(msgs.length, 1);
  assert.match(msgs[0], /gold-banner\.webp/);
});
