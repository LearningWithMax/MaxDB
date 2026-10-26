import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const html = read('index.html');
const section = html.match(/<section class="previews"[^>]*>([\s\S]*?)<\/section>/);
const articles = section ? [...section[1].matchAll(/<article class="preview ([^"]*)">([\s\S]*?)<\/article>/g)] : [];
const dep = articles.find((a) => /preview-departures/.test(a[1]));
const trip = articles.find((a) => /preview-trip/.test(a[1]));

test('Home has a previews section between the lens list and the stats, with exactly two cards', () => {
  assert.ok(section, 'section.previews');
  assert.equal(articles.length, 2);
  const at = (s) => html.indexOf(s);
  assert.ok(at('class="lens-list') < at('<section class="previews"') && at('<section class="previews"') < at('class="stat-row"'));
});

test('each card is one link: exactly one empty stretched <a class="preview-link"> and no other link', () => {
  for (const a of articles) {
    assert.equal([...a[2].matchAll(/<a\b/g)].length, 1, a[1]);
    assert.match(a[2], /<a class="preview-link" href="#(cv|trip)" aria-label="[^"]{12,}"><\/a>/);
  }
  assert.match(dep[2], /<a class="preview-link" href="#cv"/);
  assert.match(trip[2], /<a class="preview-link" href="#trip"/);
});

test('the walnut sticker is pinned to the departures card, outside its link, and is gone from the hero', () => {
  assert.match(dep[2], /<img class="nutshell-sticker" onclick="openNutshell\(\)" alt="Crack it open" src="img\/nutshell-sticker\.png">/);
  assert.ok(dep[2].indexOf('nutshell-sticker') > dep[2].indexOf('</a>'), 'the sticker comes after the link, so it is not inside it');
  assert.equal([...html.matchAll(/class="nutshell-sticker"/g)].length, 1);
  const hero = html.slice(html.indexOf('<div class="hero">'), html.indexOf('<section class="previews"'));
  assert.doesNotMatch(hero, /nutshell-sticker/);
});

test('captions and call-to-action pills are the approved strings', () => {
  assert.match(dep[2], /<p class="cap">Fig\. 1\. Three of seven jobs\. The whole card opens the CV\.<\/p>/);
  assert.match(dep[2], /<span class="pill pill-cta">open the cv &rarr;<\/span>/);
  assert.match(trip[2], /<p class="cap">Plate 1\. The route, Caracas to Yashresh\.<\/p>/);
  assert.match(trip[2], /<span class="pill pill-cta">follow the route &rarr;<\/span>/);
});

test('the departures card shows three real rows and the "more jobs" line', () => {
  assert.equal([...dep[2].matchAll(/<div class="dep-row">/g)].length, 3);
  assert.match(dep[2], /<div class="dep-more">4 MORE JOBS &middot; OPEN THE CV &rarr;<\/div>/);
});

test('the Trip card has a described, sized, lazy image, and the provisional still is on disk and small', () => {
  const img = trip[2].match(/<img src="img\/trip-preview\.webp" width="1120" height="700" loading="lazy" decoding="async" alt="([^"]{20,})">/);
  assert.ok(img, 'img tag');
  const file = new URL('../img/trip-preview.webp', import.meta.url);
  assert.ok(fs.existsSync(file), 'img/trip-preview.webp exists');
  assert.ok(fs.statSync(file).size <= 90000, 'at most 90000 bytes');
});

test('css: the departures object is the one star (gold outline), tilted -1.1deg and -0.7deg on phones, in the condensed face', () => {
  const css = read('css/home.css');
  const obj = css.match(/\.preview-departures \.preview-object\s*\{([^}]*)\}/);
  assert.ok(obj, '.preview-departures .preview-object');
  assert.match(obj[1], /outline:\s*1\.5px solid var\(--gold\)/);
  assert.match(obj[1], /outline-offset:\s*4px/);
  assert.match(obj[1], /transform:\s*rotate\(-1\.1deg\)/);
  assert.match(obj[1], /font-family:\s*var\(--font-cond\)/);
  assert.match(css, /@media\s*\(max-width:\s*700px\)\s*\{[^@]*\.preview-departures \.preview-object\s*\{[^}]*rotate\(-0\.7deg\)/);
  assert.doesNotMatch(css.match(/\.preview-trip \.preview-object\s*\{([^}]*)\}/)[1], /outline:/, 'one star per screen: the Trip card has no star outline');
});

test('css: the sticker wobbles once after the page shows (never in a loop) and a hover brightens the frame to gold', () => {
  const css = read('css/home.css');
  assert.doesNotMatch(css, /nutshellWobble[^;}]*infinite/);
  assert.match(css, /html:not\(\.intro\) \.preview-departures \.nutshell-sticker\s*\{[^}]*animation:[^;}]*nutshellWobble[^;}]*\s1\b/);
  assert.match(css, /\.preview:hover \.preview-object\s*\{[^}]*border-color:\s*var\(--gold\)/);
});
