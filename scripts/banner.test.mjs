import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const html = read('index.html');
const navAt = html.indexOf('<nav>');
const nav = html.slice(navAt, html.indexOf('</nav>', navAt));

test('exactly one skip link goes to the CV, after the gate and before the banner', () => {
  const links = [...html.matchAll(/<a class="skip-link" href="([^"]+)">([^<]*)<\/a>/g)];
  assert.equal(links.length, 1);
  assert.equal(links[0][1], '#cv');
  assert.equal(links[0][2], 'skip to cv');
  assert.ok(links[0].index > html.indexOf('id="gate"'));
  assert.ok(links[0].index < navAt);
});

test('the banner nav is home, cv, projects and trip, each a button that goes to its page, and there is no map left', () => {
  const buttons = [...nav.matchAll(/<button data-page="(\w+)" onclick="goTo\('(\w+)'\)">([^<]+)<\/button>/g)].map((m) => [m[1], m[2], m[3]]);
  assert.deepEqual(buttons, [['home', 'home', 'home'], ['cv', 'cv', 'cv'], ['projects', 'projects', 'projects'], ['trip', 'trip', 'trip']]);
  assert.doesNotMatch(html, /page-map|data-page="map"|goTo\('map'\)/);
});

test('the Trip page section is page-trip', () => {
  assert.match(html, /<section class="page" id="page-trip" data-globe="off">/);
});

test('the logo trigger is a labelled, keyboard reachable link with no visible name', () => {
  assert.match(nav, /id="logoTrigger"[^>]*aria-label="Max Duffaud Bibas, home"/);
  assert.match(nav, /id="logoTrigger"[^>]*role="link"/);
  assert.match(nav, /id="logoTrigger"[^>]*tabindex="0"/);
  assert.doesNotMatch(nav, /logo-text/);
});

test('the clock is decorative and the theme toggle is a labelled button that calls toggleTheme', () => {
  assert.match(nav, /<span class="clock" id="clock" aria-hidden="true"><\/span>/);
  assert.match(nav, /<button class="theme-toggle" id="themeToggle" type="button" aria-label="Switch between dark and paper" onclick="toggleTheme\(\)">/);
});

test('chrome.css and clock.js are loaded, clock.js after theme.js', () => {
  assert.match(html, /<link rel="stylesheet" href="css\/chrome\.css">/);
  assert.ok(html.indexOf('<script src="js/clock.js"></script>') > html.indexOf('<script src="js/theme.js"></script>'));
});

test('the old nav rules are gone from base.css and widgets.css (chrome.css owns the banner)', () => {
  assert.doesNotMatch(read('css/base.css'), /^nav\{|\.navlinks\{|\.logo-text/m);
  assert.doesNotMatch(read('css/widgets.css'), /^\s*nav\{/m);
});

test('a page fades in over 200 ms when it becomes active, once', () => {
  const css = read('css/base.css');
  assert.match(css, /section\.page\.active\s*\{[^}]*animation:\s*pageFade\s+\.2s[^;}]*(?!infinite)[;}]/);
  assert.match(css, /@keyframes pageFade/);
});

test('every grid-area name the banner items use is declared in the .nav-inner template, on desktop as well as on phones', () => {
  const css = read('css/chrome.css');
  const base = css.match(/\.nav-inner\s*\{([^}]*)\}/);
  assert.ok(base, '.nav-inner rule');
  const areas = base[1].match(/grid-template-areas:\s*"([^"]+)"/);
  assert.ok(areas, 'desktop grid-template-areas is missing, so grid-area names place items in implicit tracks');
  assert.deepEqual(areas[1].trim().split(/\s+/), ['logo', 'links', 'right']);
  for (const name of [...css.matchAll(/grid-area:\s*([a-z]+)/g)].map((m) => m[1])) assert.ok(areas[1].split(/\s+/).includes(name), `grid-area: ${name} is not in the desktop template`);
});
