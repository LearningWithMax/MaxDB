import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { checkFonts, checkCssVars, checkViewport } from './lib/rules.mjs';

const face = (file, extra = 'font-display:swap;') => `@font-face{font-family:"X";${extra}src:url("../vendor/fonts/${file}") format("woff2");}`;

test('checkFonts: clean input gives no messages', () => {
  assert.deepEqual(checkFonts({ css: { 'css/fonts.css': face('a.woff2') }, fontBytes: { 'vendor/fonts/a.woff2': 20000 } }), []);
});

test('checkFonts: an outside font URL is flagged with the file name', () => {
  const a = checkFonts({ css: { 'css/base.css': "@import url('https://fonts.googleapis.com/css2?family=Inter');" }, fontBytes: {} });
  assert.ok(a.some((m) => m.includes('fonts.googleapis.com') && m.includes('css/base.css')), a.join(' | '));
  const b = checkFonts({ css: { 'css/x.css': '@font-face{font-display:swap;src:url(https://fonts.gstatic.com/s/a.woff2)}' }, fontBytes: {} });
  assert.ok(b.some((m) => m.includes('fonts.gstatic.com')), b.join(' | '));
});

test('checkFonts: an @font-face without font-display: swap is flagged', () => {
  const out = checkFonts({ css: { 'css/fonts.css': face('a.woff2', '') }, fontBytes: { 'vendor/fonts/a.woff2': 20000 } });
  assert.ok(out.some((m) => /swap/.test(m)), out.join(' | '));
});

test('checkFonts: a src file that is not on disk is flagged by name', () => {
  const out = checkFonts({ css: { 'css/fonts.css': face('missing.woff2') }, fontBytes: { 'vendor/fonts/a.woff2': 20000 } });
  assert.ok(out.some((m) => m.includes('missing.woff2')), out.join(' | '));
});

test('checkFonts: more than 120000 bytes of fonts in total is flagged with the total', () => {
  const out = checkFonts({ css: { 'css/fonts.css': face('a.woff2') }, fontBytes: { 'vendor/fonts/a.woff2': 70000, 'vendor/fonts/b.woff2': 60000 } });
  assert.ok(out.some((m) => /total/i.test(m) && m.includes('130000')), out.join(' | '));
  const edge = checkFonts({ css: { 'css/fonts.css': face('a.woff2') }, fontBytes: { 'vendor/fonts/a.woff2': 120000 } });
  assert.deepEqual(edge, []);
});

test('checkCssVars: a var() with no fallback that no file defines is flagged with its name and file', () => {
  const out = checkCssVars({ 'css/a.css': ':root{--x:1} .a{color:var(--x)} .b{color:var(--y)} .c{color:var(--z, red)}' });
  assert.equal(out.length, 1, out.join(' | '));
  assert.ok(out[0].includes('--y') && out[0].includes('css/a.css'));
});

test('checkCssVars: a variable defined in another file counts as defined', () => {
  assert.deepEqual(checkCssVars({ 'css/tokens.css': ':root{--ink:#000}', 'css/b.css': '.a{color:var(--ink)}' }), []);
});

test('checkViewport: a viewport that blocks zoom is flagged, a plain one and a missing tag are handled', () => {
  const meta = (c) => `<meta name="viewport" content="${c}" />`;
  assert.ok(checkViewport(meta('width=device-width, initial-scale=1.0, maximum-scale=1')).some((m) => /maximum-scale/.test(m)));
  assert.ok(checkViewport(meta('width=device-width, user-scalable=no')).some((m) => /user-scalable/.test(m)));
  assert.deepEqual(checkViewport(meta('width=device-width, initial-scale=1')), []);
  assert.ok(checkViewport('<html></html>').some((m) => /viewport/.test(m)));
});

test('img/grain.png is a 128 by 128 PNG of at most 20000 bytes', () => {
  const buf = fs.readFileSync(new URL('../img/grain.png', import.meta.url));
  assert.deepEqual([...buf.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(buf.readUInt32BE(16), 128);
  assert.equal(buf.readUInt32BE(20), 128);
  assert.ok(buf.length <= 20000, `grain is ${buf.length} bytes`);
});

// ---- checkDeparturesPreview: the Home preview rows are the first three CV jobs, written once ----
import { checkDeparturesPreview } from './lib/rules.mjs';

const JOBS = [
  ['2025', 'YASHRESH', 'CANN.EDENN', 'TEAM LEAD, GREENHOUSES'], ['2024', 'CARACAS', 'AVICAMPO', 'FIELD VISITS, IPPE ATLANTA'],
  ['2023', 'MADRID', 'INTELCIA', 'TEAM GREW FROM 10 TO 35'], ['2022', 'CARACAS', 'CHACAO', 'TECH REP, LAB AND FEED'],
  ['2021', 'REHOVOT', 'WEIZMANN', 'ALGAE CALCITE RESEARCH'], ['2019', 'CLERMONT-FD', 'MICHELIN', 'MOLECULAR MODELING + TESTS'],
  ['2019', 'PRAGUE', 'ICPF', 'HPLC RESEARCH INTERNSHIP'],
];
const jobTag = ([y, p, c, l]) => `<div class="job" data-board data-year="${y}" data-place="${p}" data-company="${c}" data-line-all="${l}" data-line-chem="X">`;
const depRow = ([y, p, c, l]) => `<div class="dep-row"><span class="dep-year">${y}</span><span class="dep-place">${p}</span><span class="dep-company">${c}</span><span class="dep-line">${l}</span></div>`;
const homePage = (rows, more = '4 MORE JOBS &middot; OPEN THE CV &rarr;') => rows.map(depRow).join('') + `<div class="dep-more">${more}</div>` + JOBS.map(jobTag).join('');

test('checkDeparturesPreview: three rows that match the first three jobs, and the right count, are clean', () => {
  assert.deepEqual(checkDeparturesPreview(homePage(JOBS.slice(0, 3))), []);
});

test('checkDeparturesPreview: a changed year names the row and the field', () => {
  const rows = JOBS.slice(0, 3).map((r) => [...r]); rows[0][0] = '2026';
  const out = checkDeparturesPreview(homePage(rows));
  assert.ok(out.some((m) => m.includes('dep-row 1') && /year/.test(m)), out.join(' | '));
});

test('checkDeparturesPreview: swapped rows are flagged on both rows', () => {
  const [a, b, c] = JOBS;
  const out = checkDeparturesPreview(homePage([b, a, c]));
  assert.ok(out.some((m) => m.includes('dep-row 1')) && out.some((m) => m.includes('dep-row 2')), out.join(' | '));
});

test('checkDeparturesPreview: a missing row and a wrong "more jobs" number are flagged', () => {
  assert.ok(checkDeparturesPreview(homePage(JOBS.slice(0, 2))).some((m) => /three rows/.test(m)));
  assert.ok(checkDeparturesPreview(homePage(JOBS.slice(0, 3), '5 MORE JOBS &middot; OPEN THE CV &rarr;')).some((m) => /MORE JOBS/.test(m)));
});

test('checkDeparturesPreview: text with &amp; compares equal to the decoded attribute', () => {
  const j = [['2025', 'A', 'R&D CO', 'LAB &amp; BENCH'], ...JOBS.slice(1)];
  const page = [j[0], j[1], j[2]].map(depRow).join('') + '<div class="dep-more">4 MORE JOBS</div>' + j.map(jobTag).join('');
  assert.deepEqual(checkDeparturesPreview(page), []);
});
