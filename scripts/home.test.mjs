import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const html = read('index.html');
const home = html.slice(html.indexOf('id="page-home"'), html.indexOf('id="page-cv"'));
const decode = (s) => s.replace(/&amp;/g, '&');

test('Home has three big buttons under the name: CV, Projects and Trip, numbered 01 to 03 (owner, 2026-11-06)', () => {
  const links = [...home.matchAll(/<a class="cta-btn" href="([^"]+)">\s*<span class="n">(\d\d)<\/span>\s*<strong>([^<]+)<\/strong>\s*<span class="cta-sub">([^<]+)<\/span>/g)].map((m) => [m[1], m[2], decode(m[3]), decode(m[4])]);
  assert.deepEqual(links, [
    ['#cv', '01', 'CV', 'Every job, the skills and the certificates.'],
    ['#projects', '02', 'Projects', 'Web apps I build with AI: a live demo, this site, more in progress.'],
    ['#trip', '03', 'Trip', 'A flight over the globe through the places I lived, studied and worked.'],
  ]);
});

test('the buttons are one ordered list in #page-home, each with an arrow, and no reading link is left', () => {
  const list = home.match(/<ol class="cta-list[^"]*"[^>]*>([\s\S]*?)<\/ol>/);
  assert.ok(list, 'ol.cta-list');
  const rows = [...list[1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1]);
  assert.equal(rows.length, 3);
  rows.forEach((row, i) => assert.match(row, /<span class="cta-arrow" aria-hidden="true">&rarr;<\/span>/, 'row ' + (i + 1) + ' has an arrow'));
  assert.doesNotMatch(html, /lens-list|lens-btn|lens-sub|href="#cv\//);
});

test('the line under the name says the goal (owner, 2026-11-06)', () => {
  assert.match(home, /<p class="role-line[^"]*"[^>]*>Customer success and onboarding, in French, Spanish and English\. Seven jobs across five countries, team lead within months in the latest one, and the go-to person for a team of 35 agents before that\.<\/p>/);
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
  assert.match(css, /\.cta-btn strong\s*\{[^}]*clamp\(32px,[^}]*var\(--font-serif\)/, 'the buttons are bigger than the old 26px reading words');
  assert.doesNotMatch(css, /\.dot-(cust|ops|chem)|lens-/, 'no reading styles are left');
});
