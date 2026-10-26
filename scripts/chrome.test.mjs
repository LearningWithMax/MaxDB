import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const html = read('index.html');
const css = { tokens: read('css/tokens.css'), base: read('css/base.css'), chrome: read('css/chrome.css'), map: read('css/map.css'), widgets: read('css/widgets.css'), home: read('css/home.css'), cv: read('css/cv.css'), story: read('css/story.css') };
// the declarations of the first rule whose selector is exactly `sel`
const rule = (source, sel) => {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = source.match(new RegExp('(?:^|[}/])\\s*' + esc + '\\s*\\{([^}]*)\\}'));
  assert.ok(m, 'rule not found: ' + sel);
  return m[1];
};
const trip = html.slice(html.indexOf('id="page-trip"'), html.indexOf('<div class="nutshell-overlay"'));

test('Trip page header: mono kicker, the title, one plain line, mono instructions', () => {
  const at = ['<p class="kicker">Venezuela &middot; France &middot; Czech Republic &middot; Spain &middot; Israel</p>', "<h1>Where I've been</h1>", 'a lot of stamps in between.</p>', 'class="map-instructions"'].map((s) => { const i = trip.indexOf(s); assert.ok(i >= 0, s); return i; });
  assert.deepEqual(at, [...at].sort((a, b) => a - b));
});

test('Trip page: the map sits in a panel frame with the figure caption under it', () => {
  assert.match(trip, /<p class="cap">Fig\. 2\. Countries lived in, studied in and visited\.<\/p>/);
  assert.ok(trip.indexOf('Fig. 2. Countries lived in') > trip.indexOf('id="mapWrap"'), 'the flat map\'s own caption comes after the map (the globe has its own caption above it)');
  const f = rule(css.map, '.map-svg-wrap');
  assert.match(f, /background:\s*var\(--panel\)/);
  assert.match(f, /border:\s*1px solid var\(--rule\)/);
  assert.match(f, /border-radius:\s*var\(--r-obj\)/);
});

test('map tiers follow the palette: born orange, home teal, study mute, base panel (visit has its own color per theme, tested below)', () => {
  const root = css.tokens.match(/(?:^|[}/])\s*:root\s*\{([^}]*)\}/)[1];
  const want = { '--t-born': 'var(--orange)', '--t-home': 'var(--teal)', '--t-study': 'var(--mute)', '--t-base': 'var(--panel)' };
  for (const [k, v] of Object.entries(want)) assert.match(root, new RegExp(k + '\\s*:\\s*' + v.replace(/[()]/g, '\\$&')), k);
  const light = css.tokens.match(/:root\[data-theme="light"\]\s*\{([^}]*)\}/)[1];
  assert.doesNotMatch(light.replace(/--t-visit\s*:[^;]+;/, ''), /--t-/, 'the other tier tokens follow the theme through the tokens they point at; only --t-visit is set per theme');
});

test('the visitor log lives in the footer, left of the copyright, with email and LinkedIn as mono text links', () => {
  const foot = html.slice(html.indexOf('<footer'), html.indexOf('</footer>'));
  assert.equal([...html.matchAll(/id="vlogWidget"/g)].length, 1);
  assert.ok(foot.includes('id="vlogWidget"'), 'vlogWidget is inside the footer');
  assert.doesNotMatch(foot.match(/<div class="vlog"[^>]*>/)[0], /data-reveal/, 'the footer carries the reveal, not the widget');
  assert.match(foot, /<a href="mailto:duffaud\.max@gmail\.com">email<\/a>/);
  assert.match(foot, /<a href="https:\/\/linkedin\.com\/in\/max-duffaud" target="_blank" rel="noopener">linkedin<\/a>/);
  assert.doesNotMatch(foot, /icon-only-btn|<svg/);
  assert.ok(foot.indexOf('id="vlogWidget"') < foot.indexOf('class="copyright"'));
  assert.match(foot, /<div class="copyright">&copy; 2026 Max Duffaud Bibas <span class="egg" onclick="openStory\(\)">\.<\/span><\/div>/);
});

// The owner's credit line (2026-10-27): plain text after the links, no logo and no link.
test('the footer carries a plain "Built with Claude" line after the links', () => {
  const foot = html.slice(html.indexOf('<footer'), html.indexOf('</footer>'));
  assert.match(foot, />linkedin<\/a>\s*<span class="built-with">Built with Claude<\/span>\s*<\/div>/);
  assert.equal([...foot.matchAll(/Built with Claude/g)].length, 1);
});

test('footer css (chrome.css): a hairline, mono type, the copyright on the right, stacked on phones', () => {
  const f = rule(css.chrome, 'footer');
  assert.match(f, /border-top:\s*1px solid var\(--rule\)/);
  assert.match(f, /var\(--font-mono\)/);
  assert.match(css.chrome, /@media\s*\(max-width:\s*700px\)\s*\{[^@]*footer\s*\{[^}]*flex-direction:\s*column/);
});

test('footer is its own surface, not the bare page: a base plate, fine ridges and a lit top edge, all from tokens, in both themes', () => {
  const f = rule(css.chrome, 'footer');
  assert.match(f, /background-color:\s*var\(--footer-bg\)/);
  assert.match(f, /repeating-linear-gradient\([^;]*var\(--footer-ridge\)/, 'a fine ridge texture');
  assert.match(f, /linear-gradient\([^;]*var\(--footer-sheen\)/, 'a soft light from the top edge');
  assert.match(f, /box-shadow:\s*inset 0 1px 0 var\(--footer-edge\)/, 'a lit edge under the hairline');
  assert.doesNotMatch(f, /#[0-9a-f]{3,8}\b|rgba?\(/i, 'no color written in the rule');
  const dark = rule(css.tokens, ':root'), light = rule(css.tokens, ':root[data-theme="light"]');
  for (const name of ['footer-bg', 'footer-sheen', 'footer-ridge', 'footer-edge']) {
    assert.match(dark, new RegExp('--' + name + ':'), name + ' in dark');
    assert.match(light, new RegExp('--' + name + ':'), name + ' in paper');
  }
  assert.notEqual(dark.match(/--footer-bg:\s*([^;]+);/)[1], dark.match(/--bg:\s*([^;]+);/)[1], 'the plate differs from the page in dark');
  assert.notEqual(light.match(/--footer-bg:\s*([^;]+);/)[1], light.match(/--bg:\s*([^;]+);/)[1], 'the plate differs from the page in paper');
});

test('the footer text keeps AA contrast (4.5) on the worst pixel of the textured plate in both themes, and the links keep 7', () => {
  const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const hexOf = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const rgba = (s) => { const m = s.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/); return { c: [+m[1], +m[2], +m[3]], a: +m[4] }; };
  const over = (base, o) => base.map((v, i) => v * (1 - o.a) + o.c[i] * o.a);
  assert.match(rule(css.chrome, 'footer'), /color:\s*var\(--footer-ink\)/, 'the footer text uses its own token');
  for (const [name, block] of [['dark', rule(css.tokens, ':root')], ['paper', rule(css.tokens, ':root[data-theme="light"]')]]) {
    const get = (v) => { const m = block.match(new RegExp('--' + v + ':\\s*([^;]+);')); assert.ok(m, name + ': --' + v); const x = m[1].trim(); const ref = x.match(/^var\(--([\w-]+)\)$/); return ref ? get(ref[1]) : x; };
    const plate = rgb(get('footer-bg')), ridge = rgba(get('footer-ridge')), sheen = rgba(get('footer-sheen'));
    // every pixel the text can land on: the plate, a ridge row, the top light, both together (the worst case for either theme)
    const backs = [plate, over(plate, ridge), over(plate, sheen), over(over(plate, sheen), ridge)].map(hexOf);
    for (const b of backs) {
      assert.ok(contrastRatio(get('footer-ink'), b) >= 4.5, `${name}: footer-ink ${get('footer-ink')} on ${b} is ${contrastRatio(get('footer-ink'), b).toFixed(2)}`);
      assert.ok(contrastRatio(get('text-2'), b) >= 7, `${name}: the links on ${b}`);
    }
  }
});

test('the Trip page leaves 72px between the last block (the album buttons) and the footer', () => {
  const trip = read('css/trip.css');
  assert.match(rule(trip, '#page-trip'), /padding-bottom:\s*var\(--sp-72\)/);
});

test('widgets.css: the visitor log is a mono pill with a still teal dot, in flow (not fixed), and nothing blinks or pulses', () => {
  assert.doesNotMatch(rule(css.widgets, '.vlog'), /position:\s*fixed/);
  assert.match(rule(css.widgets, '.vlog-tab'), /border-radius:\s*999px/);
  assert.match(rule(css.widgets, '.vlog-tab'), /var\(--font-mono\)/);
  assert.match(rule(css.widgets, '.vlog-dot'), /background:\s*var\(--teal\)/);
  assert.doesNotMatch(css.widgets, /animation:|@keyframes vlogBlink|@keyframes eggPulse/ , 'no looping animation left in widgets.css (the live-feed items fade in once through base.css)');
  assert.match(rule(css.widgets, '.vlog-panel'), /background:\s*var\(--panel\)/);
});

test('widgets.css: the consent banner is a panel with a hairline, decline is outlined and accept is filled ink, both mono pills', () => {
  const b = rule(css.widgets, '.consent-banner');
  assert.match(b, /background:\s*var\(--panel\)/);
  assert.match(b, /border:\s*1px solid var\(--rule\)/);
  assert.match(rule(css.widgets, '.consent-buttons button'), /border-radius:\s*999px/);
  assert.match(rule(css.widgets, '.consent-buttons button'), /var\(--font-mono\)/);
  assert.match(rule(css.widgets, '.consent-buttons .consent-decline'), /border:\s*1px solid var\(--mute\)/);
  assert.match(rule(css.widgets, '.consent-buttons .consent-accept'), /background:\s*var\(--ink\)/);
  assert.match(rule(css.widgets, '.consent-buttons .consent-accept'), /color:\s*var\(--bg\)/);
});

test('popups sit on the panel with serif titles and mono kickers: nutshell, country album, certificate', () => {
  assert.match(rule(css.home, '.nutshell-popup'), /background:\s*var\(--panel\)/);
  assert.match(rule(css.home, '.nutshell-popup h2'), /var\(--font-serif\)/);
  assert.match(rule(css.home, '.nutshell-kicker'), /var\(--font-mono\)/);
  assert.match(rule(css.map, '.country-album-popup'), /background:\s*var\(--panel\)/);
  assert.match(rule(css.map, '.album-country-name'), /var\(--font-serif\)/);
  assert.match(rule(css.map, '.album-kicker'), /var\(--font-mono\)/);
  assert.match(rule(css.cv, '.cert-popup'), /background:\s*var\(--panel\)/);
  assert.match(rule(css.cv, '.cert-popup-name'), /var\(--font-serif\)/);
});

test('the story keeps its own colors but its headings are serif and its kickers mono', () => {
  assert.match(rule(css.story, '.story-intro h2'), /var\(--font-serif\)/);
  assert.match(rule(css.story, '.story-beat h3'), /var\(--font-serif\)/);
  assert.match(rule(css.story, '.story-beat .beat-kicker'), /var\(--font-mono\)/);
  assert.match(rule(css.story, '.story-intro .kicker'), /var\(--font-mono\)/);
});

// ---- fixes from the whole-branch review ----
import { contrastRatio } from './lib/contrast.mjs';
const tokenBlock = (sel) => {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = css.tokens.match(new RegExp('(?:^|[}/])\\s*' + esc + '\\s*\\{([^}]*)\\}'));
  return Object.fromEntries([...m[1].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)].map((x) => [x[1], x[2].trim()]));
};

test('the story close button is readable on the dark default: it sets its own ink color', () => {
  assert.match(rule(css.story, '.story-close'), /(^|[;\s])color:\s*var\(--ink\)/);
});

test('each theme tells the browser its color scheme, so scrollbars and native controls match it', () => {
  assert.equal(tokenBlock(':root')['color-scheme'], undefined, 'declared as a property, not a custom property');
  assert.match(css.tokens, /(?:^|[}/])\s*:root\s*\{[^}]*color-scheme:\s*dark/);
  assert.match(css.tokens, /:root\[data-theme="light"\]\s*\{[^}]*color-scheme:\s*light/);
});

test('map: a visited country is at least 3:1 against an unvisited one, in both themes (they were 1.3:1 and the figure could not show the main fact)', () => {
  for (const [name, block] of [['dark', tokenBlock(':root')], ['paper', { ...tokenBlock(':root'), ...tokenBlock(':root[data-theme="light"]') }]]) {
    assert.match(block['--t-visit'], /^#[0-9a-f]{6}$/i, name + ': --t-visit is a color of its own');
    assert.equal(block['--t-base'], 'var(--panel)');
    const r = contrastRatio(block['--t-visit'], block['--panel']);
    assert.ok(r >= 3, `${name}: visit tier on base is ${r.toFixed(2)}:1`);
    assert.ok(contrastRatio(block['--t-visit'], block['--mute']) < contrastRatio(block['--panel'], block['--mute']), name + ': still quieter than the study tier (--mute)');
  }
});

test('map: a hovered or keyboard-focused country gets a gold outline, not just a faint brightness change', () => {
  const r = rule(css.map, '.country.interactive:hover, .country.interactive:focus');
  assert.match(r, /stroke:\s*var\(--gold\)/);
  assert.match(r, /stroke-width:\s*\d/);
});

test('the page reserves its scrollbar gutter, so nothing shifts sideways when the opening ends and the scrollbar appears', () => {
  assert.match(rule(css.base, 'html'), /scrollbar-gutter:\s*stable/);
});
