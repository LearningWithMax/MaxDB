import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadClassic } from './lib/load-classic.mjs';
import { findBannedText } from './lib/rules.mjs';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const html = read('index.html');
const css = read('css/projects.css');
const { PROJECTS, noscriptListHtml, projectViewState } = loadClassic('js/projects.js', ['PROJECTS', 'noscriptListHtml', 'projectViewState'], { CASE_IDS: ['site'] });
const page = html.slice(html.indexOf('<section class="page" id="page-projects"'), html.indexOf('<div class="nutshell-overlay"'));
const rule = (source, sel) => {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = source.match(new RegExp('(?:^|[}/])\\s*' + esc + '\\s*\\{([^}]*)\\}'));
  assert.ok(m, 'rule not found: ' + sel);
  return m[1];
};

test('the banner has a projects button between cv and trip', () => {
  const nav = html.slice(html.indexOf('<div class="navlinks">'), html.indexOf('</nav>'));
  assert.ok(nav.indexOf('data-page="cv"') < nav.indexOf('data-page="projects"') && nav.indexOf('data-page="projects"') < nav.indexOf('data-page="trip"'));
  assert.match(nav, /<button data-page="projects" onclick="goTo\('projects'\)">projects<\/button>/);
});

test('the Projects page follows the Trip page, before the popups, so the CV and Trip slices of the HTML stay clean', () => {
  const at = (s) => html.indexOf(s);
  assert.ok(at('<section class="page" id="page-projects" data-view="shelf">') > at('id="page-trip"'));
  assert.ok(at('<section class="page" id="page-projects"') < at('<div class="nutshell-overlay"'));
  assert.equal([...html.matchAll(/id="page-projects"/g)].length, 1);
});

test('the page header: mono kicker, serif title, one plain line about moving through the projects', () => {
  const k = page.indexOf('<p class="kicker">What I build</p>'), h = page.indexOf('<h1>Projects</h1>'), p = page.indexOf('<p>Move through them with the arrows. The ones still in testing or planned say so.</p>');
  assert.ok(k >= 0 && h > k && p > h);
});

test('the filter chips and the shelf are gone: five projects need a slider, not a filter', () => {
  assert.doesNotMatch(page, /data-filter|class="chips"|id="shelf"|shelfStatus|visually-hidden|<video|case-clip/);
});

test('the slider slot is an empty labelled carousel group the script fills, between the header and the plain list', () => {
  const slot = '<section class="slider" id="projectSlider" role="group" aria-roledescription="carousel" aria-label="Projects" tabindex="0"></section>';
  assert.ok(page.includes(slot), 'the slot');
  assert.equal([...page.matchAll(/id="projectSlider"/g)].length, 1);
  assert.ok(page.indexOf('<h1>Projects</h1>') < page.indexOf(slot) && page.indexOf(slot) < page.indexOf('<noscript>'));
});

test('without JavaScript the page lists every project: the noscript list is exactly what the builder makes', () => {
  const m = page.match(/<noscript>([\s\S]*?)<\/noscript>/);
  assert.ok(m, 'noscript block');
  const squash = (s) => s.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();
  assert.equal(squash(m[1]), squash(noscriptListHtml(PROJECTS)));
});

test('the Home band sits between the two preview cards and the stats, outside the previews section, and fades in with the page', () => {
  const home = html.slice(html.indexOf('id="page-home"'), html.indexOf('id="page-cv"'));
  const band = home.indexOf('<section class="projects-band" id="homeProjects" data-reveal></section>');
  assert.ok(band > home.indexOf('</section>', home.indexOf('<section class="previews"')), 'after the previews section closes');
  assert.ok(band < home.indexOf('<div class="stat-row"'));
});

test('the stylesheet and the scripts are linked in the right order, and the clip script is gone', () => {
  assert.ok(html.indexOf('<link rel="stylesheet" href="css/projects.css">') > html.indexOf('<link rel="stylesheet" href="css/home.css">'));
  const s = (n) => html.indexOf(`<script src="js/${n}.js"></script>`);
  assert.ok(s('clock') > 0 && s('clock') < s('projects') && s('projects') < s('projects-slider') && s('projects-slider') < s('trip') && s('trip') < s('nav'));
  assert.equal(s('clips'), -1);
  assert.doesNotMatch(html, /js\/clips\.js/);
});

test('projectViewState: the list unless the case is a known one', () => {
  for (const x of [null, undefined, '', 'zzz']) assert.deepEqual({ ...projectViewState(x) }, { view: 'shelf', id: null }, String(x));
  assert.deepEqual({ ...projectViewState('site') }, { view: 'case', id: 'site' });
});

test('css/projects.css: no hex color, rgba only in shadows, the dark frames are the fixed board token, no endless animation', () => {
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i);
  for (const m of css.matchAll(/[^;{}]*rgba?\([^;{}]*/g)) assert.match(m[0], /box-shadow/, m[0].trim());
  for (const sel of ['.slide-frame', '.tile-visual']) {
    assert.match(rule(css, sel), /background:\s*var\(--board\)/, sel);
    assert.match(rule(css, sel), /border:\s*1px solid var\(--board-edge\)/, sel);
    assert.match(rule(css, sel), /aspect-ratio:\s*16\s*\/\s*10/, sel);
  }
  assert.doesNotMatch(css, /infinite|@keyframes|animation:/);
  assert.doesNotMatch(css, /\.shelf(?![\w-])|\.chips\b|\.clip\b|\.case-clip|is-featured|\.visually-hidden/, 'nothing left of the shelf, the filter or the video');
});

test('css/projects.css: the selected slide sits in the middle, its neighbors behind it, and every other slide is hidden', () => {
  const base = rule(css, '.slide');
  assert.match(base, /position:\s*absolute/);
  assert.match(base, /opacity:\s*0/);
  assert.match(base, /pointer-events:\s*none/);
  assert.match(base, /transition:\s*transform [^;]*cubic-bezier\([^)]*\),\s*opacity /);
  assert.match(rule(css, '.slide[data-offset="0"]'), /transform:\s*translateX\(0\) scale\(1\)[^}]*opacity:\s*1[^}]*pointer-events:\s*auto[^}]*z-index:\s*3/);
  assert.match(rule(css, '.slide[data-offset="1"]'), /transform:\s*translateX\(94%\) scale\(\.74\)[^}]*opacity:\s*\.6[^}]*cursor:\s*pointer[^}]*z-index:\s*2/);
  assert.match(rule(css, '.slide[data-offset="-1"]'), /transform:\s*translateX\(-94%\) scale\(\.74\)[^}]*opacity:\s*\.6[^}]*cursor:\s*pointer[^}]*z-index:\s*2/);
  assert.match(rule(css, '.slide[data-offset="2"]'), /transform:\s*translateX\(160%\) scale\(\.55\)[^}]*z-index:\s*1/);
  assert.match(rule(css, '.slide[data-offset="-2"]'), /transform:\s*translateX\(-160%\) scale\(\.55\)[^}]*z-index:\s*1/);
  assert.doesNotMatch(rule(css, '.slide[data-offset="2"]'), /opacity/, 'the far slides keep the hidden base opacity');
  assert.doesNotMatch(css, /data-offset="-?(?:3|4|5|6|7)"/, 'offsets beyond two have no rule, so they stay hidden');
});

test('css/projects.css: a drawn diagram inside a big slide is set larger than in a small tile, in the same serif, mono and gold', () => {
  assert.match(rule(css, '.slide-frame .figure-flow span'), /font-size:\s*clamp\(14px,\s*2vw,\s*22px\)/);
  assert.match(rule(css, '.slide-frame .figure-flow i'), /font-size:\s*clamp\(14px,\s*2vw,\s*22px\)/);
  assert.match(rule(css, '.slide-frame .figure-words span'), /font-size:\s*clamp\(30px,\s*4\.4vw,\s*54px\)/);
  assert.match(rule(css, '.slide-frame .figure-words i'), /font-size:\s*clamp\(16px,\s*2vw,\s*24px\)/);
  assert.doesNotMatch(css.slice(css.indexOf('.slide-frame .figure-flow span')), /\.slide-frame \.figure[^{]*\{[^}]*(font-family|color)/, 'only the size changes; the fonts and colors stay those of the tile figures');
});

test('css/projects.css: the stage works with touch and never makes the page scroll sideways; arrows and dots are real targets', () => {
  assert.match(rule(css, '#page-projects'), /overflow-x:\s*clip/, 'the neighbors may run to the window edge, and the page still does not scroll sideways');
  assert.doesNotMatch(rule(css, '.slider'), /overflow/);
  assert.match(rule(css, '.slider-stage'), /touch-action:\s*pan-y pinch-zoom/, 'vertical scroll and pinch zoom stay with the browser; only a sideways drag is ours');
  assert.match(rule(css, '.slider-stage'), /user-select:\s*none/);
  assert.match(rule(css, '.slider-track'), /width:\s*min\(100%,\s*700px\)/);
  assert.match(rule(css, '.slider-track'), /aspect-ratio:\s*16\s*\/\s*10/);
  const arrow = rule(css, '.slider-arrow');
  assert.match(arrow, /width:\s*44px/); assert.match(arrow, /height:\s*44px/); assert.match(arrow, /z-index:\s*5/);
  assert.match(rule(css, '.slider-prev'), /left:\s*max\(var\(--sp-8\),\s*calc\(50% - 406px\)\)/, 'next to the main card, never off the stage');
  assert.match(rule(css, '.slider-next'), /right:\s*max\(var\(--sp-8\),\s*calc\(50% - 406px\)\)/);
  assert.match(css, /\.slider-arrow:hover\s*\{[^}]*border-color:\s*var\(--gold\)/);
  assert.match(rule(css, '.slider-dot[aria-current="true"]'), /background:\s*var\(--gold\)/);
  assert.match(rule(css, '.slider-dot::after'), /inset:\s*-10px/, 'the dot hit area is 30 px');
});

test('css/projects.css: the panel fades and slides in the direction of travel, and its facts are a labelled list', () => {
  assert.match(rule(css, '.slider-panel'), /transition:\s*opacity [^,;]+,\s*transform /);
  assert.match(rule(css, '.slider-panel.is-leaving'), /opacity:\s*0[^}]*translateX\(-24px\)/);
  assert.match(rule(css, '.slider-panel[data-dir="prev"].is-leaving'), /translateX\(24px\)/);
  assert.match(rule(css, '.slider-panel.is-entering'), /opacity:\s*0[^}]*translateX\(24px\)[^}]*transition:\s*none/);
  assert.match(rule(css, '.slider-panel[data-dir="prev"].is-entering'), /translateX\(-24px\)/);
  assert.match(rule(css, '.panel-facts > div'), /grid-template-columns:\s*150px 1fr[^}]*border-top:\s*1px solid var\(--rule\)/);
  assert.match(rule(css, '.panel-facts dt'), /font:[^;]*var\(--font-mono\)/);
  assert.match(rule(css, '.panel-title'), /font:[^;]*var\(--font-serif\)/);
  assert.match(rule(css, '.panel-action'), /display:\s*flex[^}]*flex-wrap:\s*wrap[^}]*gap:\s*var\(--sp-12\)/, 'two buttons sit side by side and wrap on a phone');
});

test('css/projects.css: on phones the track is narrower so the neighbors peek, the facts stack, and with reduced motion nothing transitions', () => {
  assert.match(css, /@media\s*\(max-width:\s*700px\)\s*\{[^@]*\.slider-track\s*\{[^}]*width:\s*78%/);
  assert.match(css, /@media\s*\(max-width:\s*700px\)\s*\{[^@]*\.slide\[data-offset="1"\]\s*\{[^}]*translateX\(92%\)/);
  assert.match(css, /@media\s*\(max-width:\s*700px\)\s*\{[^@]*\.panel-facts > div\s*\{[^}]*grid-template-columns:\s*1fr/);
  assert.match(css, /@media\s*\(max-width:\s*700px\)\s*\{[^@]*\.band-grid\s*\{[^}]*grid-template-columns:\s*1fr/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[^@]*\.slide,[^{]*\.slider-panel[^{]*\{[^}]*transition:\s*none/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[^@]*\.slider-track[^{]*\{[^}]*transition:\s*none/);
});

test('css/projects.css: the row of cards glides into place after a drag, and has no transition while a finger holds it', () => {
  assert.match(rule(css, '.slider-track'), /transition:\s*transform \.5s cubic-bezier\(\.22,\.9,\.32,1\)/);
  const held = rule(css, '.slider-track.is-dragging');
  assert.match(held, /transition:\s*none/);
  assert.match(held, /will-change:\s*transform/);
});

test('css/projects.css: only a Home tile with a link lifts on hover, chips are mono, planned is dashed, live has a teal dot, the band has three columns', () => {
  assert.match(css, /\.tile\.has-link:hover \.tile-visual\s*\{[^}]*border-color:\s*var\(--gold\)/);
  assert.doesNotMatch(css, /\.tile:hover/);
  assert.match(rule(css, '.chip'), /font:[^;]*var\(--font-mono\)/);
  assert.match(rule(css, '.chip-planned'), /border-style:\s*dashed/);
  assert.match(css, /\.chip-live::before\s*\{[^}]*background:\s*var\(--teal\)/);
  assert.match(rule(css, '.band-grid'), /grid-template-columns:\s*repeat\(3,\s*1fr\)/);
  assert.match(css, /\.projects-band:empty\s*\{[^}]*display:\s*none/);
});

test('js/projects.js wires the page: it renders the Home band and switches the case view; the shelf, filter and video code are gone', () => {
  const js = read('js/projects.js');
  assert.match(js, /function setProjectView\(project\)/);
  assert.match(js, /function renderHomeBand\(\)/);
  assert.match(js, /typeof document !== 'undefined'/);
  assert.doesNotMatch(js, /setFilter|renderShelf|shelfHtml|statusLineText|initClips|caseClipHtml|<video|autoplay/);
});

// ---- the case view (#projects/site) ----
const caseSection = (page.match(/<section class="project-case" id="project-site"[\s\S]*?<\/section>/) || [''])[0];

test('the website case view is a section inside the Projects page, with the approved copy in order', () => {
  assert.match(page, /<section class="project-case" id="project-site" data-case="site" aria-labelledby="case-site-title">/);
  const parts = [
    '<a class="case-back" href="#projects">Back to projects</a>',
    '<p class="kicker">Project</p>',
    '<h1 id="case-site-title">This website</h1>',
    '<span class="chip chip-live">Live</span>',
    '<p class="case-lead">The site you are on, built with AI from written specs: a CV that reads three ways, a trip page and this projects page. Plain HTML, CSS and JavaScript, with no framework and no build step.</p>',
    '<figcaption class="cap">Fig. 1. The opening, spheres gathering into the logo.</figcaption>',
    '<h2>How it is built</h2>',
  ].map((s) => { const i = caseSection.indexOf(s); assert.ok(i >= 0, s); return i; });
  assert.deepEqual(parts, [...parts].sort((a, b) => a - b));
  assert.equal([...caseSection.matchAll(/<h1\b/g)].length, 1);
});

test('"How it is built" lists exactly the five facts that can be checked in the repo', () => {
  const items = [...caseSection.matchAll(/<li>([^<]*)<\/li>/g)].map((m) => m[1]);
  assert.deepEqual(items, [
    'Plain HTML, CSS and JavaScript. No framework, no build step.',
    'Self-hosted fonts and libraries, checked against recorded hashes.',
    'Automated checks run before every change.',
    'Each feature starts as a written spec and a plan, then Claude builds it.',
    'Dark is the main look; paper is the light version.',
  ]);
});

test('the case copy follows the copy rules (no dashes, American spelling, straight quotes)', () => {
  assert.deepEqual(findBannedText('index.html (case view)', caseSection), []);
});

test('without JavaScript the case copy still shows: the noscript style opens it', () => {
  assert.match(html, /<noscript>\s*<style>[^<]*#project-site\s*\{\s*display:\s*block\s*!important/);
});

test('css: only the case view shows for #projects/<case>, the header and slider hide, and the facts list keeps its rules', () => {
  assert.match(css, /\.project-case\s*\{[^}]*display:\s*none/);
  assert.match(css, /#page-projects\[data-view="case"\] \.projects-header,\s*#page-projects\[data-view="case"\] \.slider\s*\{[^}]*display:\s*none/);
  assert.match(css, /#page-projects\[data-view="case"\]\[data-case="site"\] #project-site\s*\{[^}]*display:\s*block/);
  assert.match(css, /\.case-built li\s*\{[^}]*border-top:\s*1px solid var\(--rule\)/);
});

test('the case view shows three real screens in figures, each with a caption, a size, lazy loading and a description, and no video', () => {
  assert.match(caseSection, /<figure class="case-fig">\s*<img src="img\/projects\/site\/opening\.webp" width="1600" height="1000" loading="lazy" decoding="async" alt="The opening: chrome spheres gathered into the letters MDB on a black screen">\s*<figcaption class="cap">Fig\. 1\. The opening, spheres gathering into the logo\.<\/figcaption>\s*<\/figure>/);
  assert.match(caseSection, /<figure class="case-fig">\s*<img src="img\/projects\/site\/screen-cv\.webp" width="1600" height="1000" loading="lazy" decoding="async" alt="The CV page with the departure board showing the Operations reading">\s*<figcaption class="cap">Fig\. 2\. The CV board flipping to one reading\.<\/figcaption>\s*<\/figure>/);
  assert.match(caseSection, /<figure class="case-fig">\s*<img src="img\/projects\/site\/screen-trip\.webp" width="1600" height="1000" loading="lazy" decoding="async" alt="The trip page: a 3D globe over Europe with a plane in flight, and the list of eleven stops beside it">\s*<figcaption class="cap">Fig\. 3\. The trip page, a plane flying the route one stop at a time\.<\/figcaption>\s*<\/figure>/);
  assert.ok(caseSection.indexOf('Fig. 1.') < caseSection.indexOf('Fig. 2.') && caseSection.indexOf('Fig. 2.') < caseSection.indexOf('Fig. 3.') && caseSection.indexOf('Fig. 3.') < caseSection.indexOf('How it is built'));
  assert.doesNotMatch(caseSection, /case-clip|data-case-clip|<video/);
  assert.match(css, /\.case-fig img\s*\{[^}]*width:\s*100%[^}]*border:\s*1px solid var\(--board-edge\)/);
});

test('css/projects.css: the panel note sits under the title on its own line, small and mono, marked with a gold rule, all from tokens', () => {
  const note = rule(css, '.panel-note');
  assert.match(note, /flex-basis:\s*100%/, 'it takes its own line in the head');
  assert.match(note, /font:[^;]*var\(--font-mono\)/);
  assert.match(note, /border-left:\s*2px solid var\(--gold\)/);
  assert.match(note, /color:\s*var\(--text-2\)/);
  assert.doesNotMatch(note, /#[0-9a-f]{3,8}\b/i, 'no colors written here');
});

// ---- the notice (owner, 2026-10-27): launch now, and say plainly that this page is a work in progress ----
test('the Projects page opens with a notice under the title: work in progress, some live and heavily worked on, some being built, some later', () => {
  const header = page.indexOf('<div class="projects-header">'), notice = page.indexOf('<aside class="projects-notice"'), slider = page.indexOf('id="projectSlider"');
  assert.ok(header > 0 && notice > header && slider > notice, 'the notice sits between the title and the slider');
  const m = page.match(/<aside class="projects-notice" role="note" aria-label="About this page">\s*<p class="kicker">Work in progress<\/p>\s*<p>([^<]+)<\/p>\s*<\/aside>/);
  assert.ok(m, 'the notice markup');
  assert.equal(m[1], "This page changes often. Some projects are live and being worked on heavily right now, some are still being built, and some come later. The tag next to each title says which.");
  assert.deepEqual(findBannedText('the projects notice', m[1]), [], 'no banned dashes or spellings');
  assert.equal([...page.matchAll(/projects-notice/g)].length, 1);
});

test('css/projects.css: the notice is big and plain: a gold frame, the panel color, a larger body, and gone in the case view', () => {
  const n = rule(css, '.projects-notice');
  assert.match(n, /border:\s*1px solid var\(--gold\)/);
  assert.match(n, /border-left-width:\s*4px/);
  assert.match(n, /background:\s*var\(--panel\)/);
  assert.match(n, /border-radius:\s*var\(--r-obj\)/);
  assert.doesNotMatch(n, /#[0-9a-f]{3,8}\b/i, 'no colors written here');
  assert.match(rule(css, '.projects-notice p:not(.kicker)'), /font:\s*400 clamp\(16px,\s*1\.8vw,\s*20px\)\/1\.5 var\(--font-sans\)/);
  assert.match(rule(css, '.projects-notice .kicker'), /color:\s*var\(--gold-text\)/);
  assert.match(css, /#page-projects\[data-view="case"\] \.projects-notice\s*\{[^}]*display:\s*none/);
});
