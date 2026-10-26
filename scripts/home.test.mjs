import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const html = read('index.html');
const home = html.slice(html.indexOf('id="page-home"'), html.indexOf('id="page-cv"'));
const decode = (s) => s.replace(/&amp;/g, '&');

test('Home has three lens links that open the CV on that lens, numbered 01 to 03', () => {
  const links = [...html.matchAll(/<a class="lens-btn" href="([^"]+)">\s*<span class="n">(\d\d)<\/span>\s*<strong>([^<]+)<\/strong>/g)].map((m) => [m[1], m[2], decode(m[3])]);
  assert.deepEqual(links, [
    ['#cv/chem', '01', 'Chemistry & R&D'],
    ['#cv/ops', '02', 'Operations'],
    ['#cv/cust', '03', 'Customer-Facing'],
  ]);
});

test('Home lens links live in #page-home, before the CV page', () => {
  const homeAt = html.indexOf('id="page-home"'), cv = html.indexOf('id="page-cv"');
  for (const m of html.matchAll(/class="lens-btn"/g)) assert.ok(m.index > homeAt && m.index < cv);
});

test('the lens links are one ordered list: each row has a one-line description and a colored dot', () => {
  const list = home.match(/<ol class="lens-list[^"]*"[^>]*>([\s\S]*?)<\/ol>/);
  assert.ok(list, 'ol.lens-list');
  const rows = [...list[1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1]);
  assert.equal(rows.length, 3);
  const dots = ['dot-chem', 'dot-ops', 'dot-cust'];
  rows.forEach((row, i) => {
    assert.match(row, /<span class="lens-sub">[^<]{10,}<\/span>/, 'row ' + (i + 1) + ' has a description');
    assert.ok(row.includes('<i class="dot ' + dots[i] + '"></i>'), 'row ' + (i + 1) + ' has ' + dots[i]);
  });
});

test('the four stats count up: 5, 30+, 4, and the years since the first job, which is computed so it never goes stale', () => {
  const row = home.match(/<div class="stat-row"[^>]*>([\s\S]*?)<\/section>/);
  assert.ok(row, '.stat-row');
  const stats = [...row[1].matchAll(/<div class="num" (?:data-count="(\d+)"|data-since="(\d{4}-\d{2})")(?: data-suffix="([^"]*)")?>0<\/div><div class="label">([^<]+)<\/div>/g)].map((m) => [m[1] || m[2], m[3] || '', m[4]]);
  assert.deepEqual(stats, [
    ['5', '', 'Countries lived, studied or worked in'],
    ['30', '+', 'Countries visited'],
    ['4', '', 'Languages spoken'],
    ['2019-03', '', 'Years in, still climbing'],
  ]);
  assert.match(read('js/nav.js'), /getAttribute\('data-since'\)[\s\S]*yearsSince\(/, 'the count-up reads the start date');
});

test('the old country marquee, the two buttons and the feature row are gone from Home', () => {
  assert.doesNotMatch(home, /marquee|cta-row|feature-row|(?<![\w-])btn(?![\w-])/);
});

test('css/home.css pins the brief: name size, tracking, phone size, italic gunmetal surname, stat numerals', () => {
  const css = read('css/home.css');
  const name = css.match(/h1\.name\s*\{([^}]*)\}/);
  assert.ok(name, 'h1.name rule');
  assert.match(name[1], /font-family:\s*var\(--font-serif\)/);
  assert.match(name[1], /font-size:\s*clamp\(64px,\s*13\.4vw,\s*178px\)/);
  assert.match(name[1], /line-height:\s*\.84/);
  assert.match(name[1], /letter-spacing:\s*-\.025em/);
  assert.match(css, /@media\s*\(max-width:\s*700px\)\s*\{[^@]*h1\.name\s*\{[^}]*font-size:\s*84px/);
  const em = css.match(/h1\.name em\s*\{([^}]*)\}/);
  assert.ok(em, 'h1.name em rule');
  assert.match(em[1], /font-style:\s*italic/);
  assert.match(em[1], /color:\s*var\(--gunmetal\)/);
  assert.match(css, /\.stat \.num\s*\{[^}]*font-size:\s*clamp\(52px,\s*6vw,\s*64px\)/);
  assert.match(css, /\.dot-cust\s*\{[^}]*var\(--orange\)/);
  assert.match(css, /:root\[data-theme="light"\] \.dot-cust\s*\{[^}]*#d9532a/);
});
