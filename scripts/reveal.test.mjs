import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadClassic } from './lib/load-classic.mjs';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const { REVEAL, revealTimings, GLIDE_HANDOFF } = loadClassic('js/home-intro.js', ['REVEAL', 'revealTimings', 'GLIDE_HANDOFF']);
const timings = (n) => ({ ...revealTimings(n) });          // loaded in another realm: spread so deepEqual compares plain objects

// The release of the spheres, read from the opening itself, so the page can never be torn down while they are still on screen.
const releaseMs = Number(read('modules/opening.js').match(/release: 1, duration: ([\d.]+)/)[1]) * 1000;

test('REVEAL holds the approved numbers (middle pace, 2026-10-28): banner 1200 ms, settle after 700 ms, fades 1050 ms, 100 ms apart', () => {
  assert.deepEqual({ ...REVEAL }, { bannerMs: 1200, settleAfterMs: 700, fadeMs: 1050, staggerMs: 100 });
});

test('revealTimings: eight items settle at 700 ms and finish at 2550 ms', () => {
  assert.deepEqual(timings(8), { settleAt: 700, finishAt: 2550 });
});

test('revealTimings: one item finishes at 1900 ms (the floor, 400 ms after the spheres are gone), and zero items count as one', () => {
  assert.deepEqual(timings(1), { settleAt: 700, finishAt: 1900 });
  assert.deepEqual(timings(0), timings(1));
  assert.deepEqual(timings(-3), timings(1));
});

test('revealTimings: the finish never comes before the last fade ends (no half-faded page), for 1 to 30 items', () => {
  for (let n = 1; n <= 30; n++) {
    const t = timings(n);
    assert.ok(t.finishAt >= t.settleAt + REVEAL.fadeMs + REVEAL.staggerMs * (n - 1), `n=${n}`);
    assert.ok(t.finishAt >= releaseMs + 350, 'and not before the spheres have finished leaving plus 350 ms');
  }
});

test('home-intro.js: the plain float-up is on (no glide), the hero staging is gone, and the release owns the finish', () => {
  const src = read('js/home-intro.js');
  assert.equal(GLIDE_HANDOFF, false);
  assert.doesNotMatch(src, /stageHero|--intro-dy/);
  assert.doesNotMatch(src, /o\.on\('complete'/, 'the complete handler must not schedule its own finish');
  assert.match(src, /revealTimings\(/);
});

test('opening.css: the banner slides in from above, the rest fades in at the settle with the same numbers as REVEAL', () => {
  const css = read('css/opening.css');
  assert.match(css, /html\.intro nav\s*\{[^}]*transform:\s*translateY\(-100%\)/);
  assert.match(css, new RegExp(`html\\.intro\\.intro-release nav\\s*\\{[^}]*transition:\\s*transform\\s+${REVEAL.bannerMs}ms`));
  assert.match(css, /html\.intro \[data-reveal\]\s*\{[^}]*opacity:\s*0/);
  assert.match(css, new RegExp(`html\\.intro\\.intro-settle \\[data-reveal\\]\\s*\\{[^}]*animation:\\s*introFade\\s+1\\.05s\\s+ease\\s+calc\\(var\\(--i,\\s*0\\)\\s*\\*\\s*${REVEAL.staggerMs}ms\\)\\s+both`));
  assert.equal(REVEAL.fadeMs, 1050);
  assert.doesNotMatch(css, /--intro-dy/);
  assert.doesNotMatch(css, /:not\(nav\):not\(#page-home\)/, 'the old catch-all that hid the page until the settle is gone');
});

test('opening.css: the gate buttons use the condensed face and the backgrounds keep the grain (background-color, not the shorthand)', () => {
  const css = read('css/opening.css');
  assert.match(css, /#gate button\s*\{[^}]*font-family:\s*var\(--font-cond\)/);
  assert.match(css, /html\.intro, html\.intro body\s*\{[^}]*background-color:\s*var\(--space\)/);
  assert.match(css, /html\.intro\.intro-release,\s*html\.intro\.intro-release body\s*\{[^}]*background-color:\s*var\(--bg\)/);
});

test('the opening lets go at a middle pace (owner, 2026-10-28): release 1.5 s, spheres thin out as they rise, the curtain lifts over 1.15 s', () => {
  const op = read('modules/opening.js');
  assert.match(op, /tl\.to\(S, \{ release: 1, duration: 1\.5, ease: 'power2\.in' \}, RELEASE_AT\);/);
  assert.match(op, /tl\.to\(\{\}, \{ duration: 0\.01 \}, 4\.8\);/, 'the end marker sits just after the release ends (3.25 + 1.5 = 4.75)');
  assert.match(op, /mat\.opacity = glide \? [^:]+ : 1 - R;/, 'the plain float-up thins out from the first moment');
  assert.doesNotMatch(op, /1 - R \* R/, 'not the old late drop, which kept the spheres solid until the last moment');
  assert.match(read('css/opening.css'), /html\.intro #curtain\s*\{[^}]*transition:\s*opacity\s+1\.15s\s+ease/);
});

test('index.html: every Home block, the footer and the three fixed or top-level extras carry data-reveal', () => {
  const html = read('index.html');
  const wanted = [
    /<p class="kicker[^"]*"[^>]*\bdata-reveal\b/, /<h1 class="name[^"]*"[^>]*\bdata-reveal\b/, /<p class="role-line[^"]*"[^>]*\bdata-reveal\b/,
    /<ol class="lens-list[^"]*"[^>]*\bdata-reveal\b/, /<section class="previews"[^>]*\bdata-reveal\b/, /<section class="projects-band"[^>]*\bdata-reveal\b/, /<div class="stat-row"[^>]*\bdata-reveal\b/,
    /<footer[^>]*\bdata-reveal\b/,
    /<div class="consent-banner"[^>]*\bdata-reveal\b/,
  ];
  for (const re of wanted) assert.match(html, re, String(re));
});
