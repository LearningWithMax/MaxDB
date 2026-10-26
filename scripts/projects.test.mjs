import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadClassic } from './lib/load-classic.mjs';

const {
  PROJECTS, STATUS_LABELS, CONTACT_EMAIL, statusLabel, validateProjects, filterProjects, homePicks, tileTarget,
  escapeHtml, figureHtml, visualHtml, tileHtml, homeBandHtml, noscriptListHtml, accessHref, projectActions, panelHtml,
} = loadClassic(
  'js/projects.js',
  ['PROJECTS', 'STATUS_LABELS', 'CONTACT_EMAIL', 'statusLabel', 'validateProjects', 'filterProjects', 'homePicks', 'tileTarget',
    'escapeHtml', 'figureHtml', 'visualHtml', 'tileHtml', 'homeBandHtml', 'noscriptListHtml', 'accessHref', 'projectActions', 'panelHtml'],
  { CASE_IDS: ['site'] },
);
// the vm realm's objects have another prototype; compare plain data
const plain = (x) => JSON.parse(JSON.stringify(x));
const clone = () => plain(PROJECTS);
const OPTS = { caseSections: ['site'] };
const problems = (list, opts = OPTS) => [...validateProjects(list, opts)];

test('the five approved projects, in order, with the owner statuses', () => {
  const rows = plain(PROJECTS).map((p) => [p.order, p.id, p.title, p.status]);
  assert.deepEqual(rows, [
    [1, 'car-broker', 'Car broker template', 'live'],
    [2, 'site', 'This website', 'live'],
    [3, 'organizer', 'Voice organizer', 'building'],
    [4, 'broker-markets', 'Broker template for any market', 'planned'],
    [5, 'quote-market', 'Quote marketplace', 'building'],
  ]);
});

test('the one lines are the approved text', () => {
  assert.deepEqual(plain(PROJECTS).map((p) => p.oneLine), [
    'A website template for a vehicle broker. Visitors choose a path (rentals, leases, no credit check, car sourcing, or selling their car), pick a car and send a request, and the broker contacts them. A private dashboard runs it all. Each client gets their own version, starting with the look.',
    'The site you are on: a CV, a trip and these projects, built with AI in plain HTML, CSS and JavaScript.',
    'I talk to Claude on my phone and it files tasks and notes into Notion.',
    'The car broker template reshaped for other markets.',
    'A marketplace where buyers ask for quotes and a team answers them.',
  ]);
});

test('the shipped data passes its own validation, and only the website has a case view', () => {
  assert.deepEqual(problems(PROJECTS), []);
  assert.deepEqual(plain(PROJECTS).filter((p) => p.case).map((p) => p.case), ['site']);
});

test('every project says what it is built with and where it stands, in short plain sentences', () => {
  for (const p of plain(PROJECTS)) {
    for (const [field, max] of [['builtWith', 120], ['stands', 140]]) {
      assert.ok(p[field] && p[field].trim().length > 10, `${p.id}: ${field} is present`);
      assert.ok(p[field].length <= max, `${p.id}: ${field} is at most ${max} characters (${p[field].length})`);
      assert.ok(!Array.from(p[field]).some((ch) => ch.charCodeAt(0) === 8211 || ch.charCodeAt(0) === 8212), `${p.id}: ${field} has no dash`);
    }
  }
  const byId = Object.fromEntries(plain(PROJECTS).map((p) => [p.id, p]));
  assert.match(byId['car-broker'].builtWith, /Next\.js/);
  assert.match(byId['car-broker'].builtWith, /Supabase/);
  assert.match(byId.site.builtWith, /HTML, CSS and JavaScript/);
  assert.match(byId.organizer.builtWith, /Notion/);
  assert.match(byId['broker-markets'].stands, /^Planned/);
});

test('access on request: the car broker and the quote marketplace ask for it, nobody else; the car broker also has its public demo address', () => {
  assert.deepEqual(plain(PROJECTS).filter((p) => p.access).map((p) => [p.id, p.access]), [['car-broker', 'request'], ['quote-market', 'request']]);
  assert.deepEqual(plain(PROJECTS).filter((p) => p.href).map((p) => [p.id, p.href]), [['car-broker', 'https://mdesigns-broker-demo.vercel.app']]);
});

test('the car broker entry has an HD still of the public demo home page with its thumb, and a visit address', () => {
  const car = plain(PROJECTS[0]);
  assert.deepEqual({ ...car.image, alt: undefined }, { src: 'img/projects/car-broker/home.webp', thumb: 'img/projects/car-broker/home-thumb.webp', w: 1600, h: 1000, alt: undefined });
  assert.ok(car.image.alt.length > 20 && car.image.alt.length <= 200);
  assert.equal(car.figure, undefined);
  assert.match(car.href, /^https:\/\/mdesigns-broker-demo\.vercel\.app$/);
});

test('the website entry has an HD still and its thumb, and no drawn figure and no video', () => {
  const site = plain(PROJECTS[1]);
  assert.equal(site.figure, undefined);
  assert.equal(site.loop, undefined);
  assert.equal(site.caseLoop, undefined);
  assert.deepEqual({ ...site.image, alt: undefined }, { src: 'img/projects/site/home.webp', thumb: 'img/projects/site/home-thumb.webp', w: 1600, h: 1000, alt: undefined });
  assert.ok(site.image.alt.length > 20 && site.image.alt.length < 200);
  for (const i of [2, 3, 4]) assert.ok(plain(PROJECTS)[i].figure && !plain(PROJECTS)[i].image, PROJECTS[i].id);
  for (const i of [0, 1]) assert.ok(plain(PROJECTS)[i].image && !plain(PROJECTS)[i].figure, PROJECTS[i].id);
  assert.doesNotMatch(JSON.stringify(plain(PROJECTS)), /\.mp4|\.webm|"loop"/);
});

test('CONTACT_EMAIL is the address already on the CV, so the access button writes to the same person', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.equal(CONTACT_EMAIL, html.match(/mailto:([^"?]+)/)[1]);
});

test('the data file names no client: the words Chacao and Laboratorios stay out of it (private names are checked by check.mjs)', () => {
  assert.doesNotMatch(JSON.stringify(plain(PROJECTS)), /chacao|laboratorios/i);
});

function mutate(fn) { const l = clone(); fn(l); return problems(l); }
const has = (msgs, id, re) => msgs.some((m) => m.startsWith(id + ':') && re.test(m));

test('validateProjects: ids are unique and plain', () => {
  assert.ok(has(mutate((l) => { l[1].id = 'car-broker'; }), 'car-broker', /duplicate id/));
  assert.ok(has(mutate((l) => { l[0].id = 'Car Broker'; }), 'Car Broker', /id must be/));
});

test('validateProjects: status must be known and orders unique', () => {
  assert.ok(has(mutate((l) => { l[0].status = 'done'; }), 'car-broker', /unknown status/));
  assert.ok(has(mutate((l) => { l[1].order = 1; }), 'site', /duplicate order/));
});

test('validateProjects: the one line is present, short and free of dashes', () => {
  assert.ok(has(mutate((l) => { l[0].oneLine = ''; }), 'car-broker', /oneLine is empty/));
  assert.ok(has(mutate((l) => { l[0].oneLine = 'x'.repeat(301); }), 'car-broker', /oneLine is longer than 300/));
  assert.deepEqual(mutate((l) => { l[0].oneLine = 'x'.repeat(300); }), [], 'at the limit is fine');
  assert.ok(has(mutate((l) => { l[0].oneLine = 'A — B'; }), 'car-broker', /oneLine has a dash/));
  assert.ok(has(mutate((l) => { l[0].oneLine = 'A – B'; }), 'car-broker', /oneLine has a dash/));
});

test('validateProjects: builtWith and stands are present, short and free of dashes', () => {
  for (const [field, max] of [['builtWith', 120], ['stands', 140]]) {
    assert.ok(has(mutate((l) => { l[0][field] = ''; }), 'car-broker', new RegExp(field + ' is empty')), field);
    assert.ok(has(mutate((l) => { delete l[0][field]; }), 'car-broker', new RegExp(field + ' is empty')), field + ' missing');
    assert.ok(has(mutate((l) => { l[0][field] = 'x'.repeat(max + 1); }), 'car-broker', new RegExp(field + ' is longer than ' + max)), field);
    assert.deepEqual(mutate((l) => { l[0][field] = 'x'.repeat(max); }), [], field + ' at the limit is fine');
    assert.ok(has(mutate((l) => { l[0][field] = 'A — B'; }), 'car-broker', new RegExp(field + ' has a dash')), field + ' em dash');
    assert.ok(has(mutate((l) => { l[0][field] = 'A – B'; }), 'car-broker', new RegExp(field + ' has a dash')), field + ' en dash');
  }
});

test('validateProjects: video is gone, so loop and caseLoop are rejected', () => {
  const loop = { mp4: 'a.mp4', webm: 'a.webm', poster: 'a.webp', w: 720, h: 450 };
  assert.ok(has(mutate((l) => { l[0].loop = loop; }), 'car-broker', /loop is not allowed/));
  assert.ok(has(mutate((l) => { l[1].caseLoop = loop; }), 'site', /caseLoop is not allowed/));
});

test('validateProjects: exactly one of image and figure', () => {
  assert.ok(has(mutate((l) => { l[1].figure = { kind: 'words', items: ['a'] }; }), 'site', /has both image and figure/));
  assert.ok(has(mutate((l) => { delete l[1].image; }), 'site', /has neither image nor figure/));
  assert.ok(has(mutate((l) => { delete l[2].figure; }), 'organizer', /has neither image nor figure/));
  assert.deepEqual(mutate((l) => { delete l[2].figure; l[2].image = { src: 'img/projects/organizer/a.webp', thumb: 'img/projects/organizer/a-thumb.webp', w: 1600, h: 1000, alt: 'A screen' }; }), []);
});

test('validateProjects: an image needs src, thumb, w, h and alt, and its files live in the project own folder', () => {
  for (const f of ['src', 'thumb', 'w', 'h', 'alt']) assert.ok(has(mutate((l) => { delete l[1].image[f]; }), 'site', new RegExp('image is missing ' + f)), f);
  for (const f of ['src', 'thumb']) {
    assert.ok(has(mutate((l) => { l[1].image[f] = 'img/other/x.webp'; }), 'site', new RegExp('image ' + f + ' must be a .webp under img/projects/site/')), f);
    assert.ok(has(mutate((l) => { l[1].image[f] = 'img/projects/site/../x.webp'; }), 'site', new RegExp('image ' + f + ' must be')), f + ' traversal');
    assert.ok(has(mutate((l) => { l[1].image[f] = 'img/projects/car-broker/x.webp'; }), 'site', new RegExp('image ' + f + ' must be')), f + ' another project');
    assert.ok(has(mutate((l) => { l[1].image[f] = 'img/projects/site/x.jpg'; }), 'site', new RegExp('image ' + f + ' must be')), f + ' not webp');
  }
  assert.ok(has(mutate((l) => { l[1].image.w = 16.5; }), 'site', /image w and h must be whole numbers/));
  assert.ok(has(mutate((l) => { l[1].image.h = '1000'; }), 'site', /image w and h must be whole numbers/));
  assert.ok(has(mutate((l) => { l[1].image.alt = 'x'.repeat(201); }), 'site', /image alt is longer than 200/));
  assert.ok(has(mutate((l) => { l[1].image.alt = 'A — B'; }), 'site', /image alt has a dash/));
});

test('validateProjects: a figure needs a known kind and items', () => {
  assert.ok(has(mutate((l) => { l[2].figure.kind = 'grid'; }), 'organizer', /figure kind must be words or flow/));
  assert.ok(has(mutate((l) => { l[2].figure.items = []; }), 'organizer', /figure has no items/));
});

test('validateProjects: access is "request" only and never on a planned project; a public address and an access request can go together (a public site with a private dashboard)', () => {
  assert.ok(has(mutate((l) => { l[0].access = 'yes'; }), 'car-broker', /access must be "request"/));
  assert.ok(has(mutate((l) => { l[3].access = 'request'; }), 'broker-markets', /a planned project cannot ask for access/));
  assert.deepEqual(mutate((l) => { l[0].href = 'https://example.com/demo'; }), [], 'the car broker keeps both its address and its access request');
  assert.deepEqual(mutate((l) => { l[2].access = 'request'; }), [], 'a project in testing may ask for access');
  assert.deepEqual(mutate((l) => { l[1].access = 'request'; }), [], 'a case view and an access request can go together');
});

test('validateProjects: only a live project may link, only to https, and not to two places', () => {
  assert.ok(has(mutate((l) => { l[0].href = 'http://example.com'; }), 'car-broker', /href must start with https:\/\//));
  assert.ok(has(mutate((l) => { l[2].href = 'https://example.com'; }), 'organizer', /only a live project may link/));
  assert.ok(has(mutate((l) => { l[1].href = 'https://example.com'; }), 'site', /has both href and case/));
  assert.deepEqual(mutate((l) => { l[0].href = 'https://example.com/other'; }), [], 'a live project may link to any https address');
});

test('validateProjects: a case id must be a known case with a section in the page', () => {
  assert.ok(has(problems(plain(PROJECTS), { caseSections: [] }), 'site', /case "site" has no section#project-site/));
  assert.ok(has(mutate((l) => { l[1].case = 'zzz'; }), 'site', /case "zzz" is not a known case id/));
});

test('statusLabel gives the owner-facing labels and nothing for an unknown status', () => {
  assert.equal(statusLabel('live'), 'Live');
  assert.equal(statusLabel('building'), 'Building and testing');
  assert.equal(statusLabel('planned'), 'Planned');
  assert.equal(statusLabel('zzz'), '');
  assert.deepEqual(Object.keys(STATUS_LABELS), ['live', 'building', 'planned']);
});

test('filterProjects: all, by status, in order, without touching the input', () => {
  const ids = (s) => [...filterProjects(PROJECTS, s)].map((p) => p.id);
  assert.deepEqual(ids('all'), ['car-broker', 'site', 'organizer', 'broker-markets', 'quote-market']);
  assert.deepEqual(ids('live'), ['car-broker', 'site']);
  assert.deepEqual(ids('building'), ['organizer', 'quote-market']);
  assert.deepEqual(ids('planned'), ['broker-markets']);
  assert.deepEqual(ids('zzz'), ids('all'));
  const shuffled = plain(PROJECTS).reverse();
  const before = shuffled.map((p) => p.id);
  assert.deepEqual([...filterProjects(shuffled, 'all')].map((p) => p.id), ['car-broker', 'site', 'organizer', 'broker-markets', 'quote-market']);
  assert.deepEqual(shuffled.map((p) => p.id), before);
});

test('homePicks: the first three that are not planned, in order', () => {
  assert.deepEqual([...homePicks(PROJECTS, 3)].map((p) => p.id), ['car-broker', 'site', 'organizer']);
  assert.deepEqual([...homePicks(PROJECTS, 1)].map((p) => p.id), ['car-broker']);
  assert.equal([...homePicks(PROJECTS, 10)].length, 4);
  assert.ok([...homePicks(PROJECTS, 10)].every((p) => p.status !== 'planned'));
});

test('tileTarget: a live link opens a new tab and says so, a case stays in the page, the rest do not link', () => {
  const withLink = { ...plain(PROJECTS)[0], href: 'https://example.com/demo' };
  assert.deepEqual(plain(tileTarget(withLink)), { href: 'https://example.com/demo', newTab: true, label: 'Open Car broker template (opens in a new tab)' });
  assert.deepEqual(plain(tileTarget(PROJECTS[1])), { href: '#projects/site', newTab: false, label: 'Open This website' });
  assert.equal(tileTarget(PROJECTS[2]), null);
  assert.deepEqual(plain(tileTarget(PROJECTS[0])), { href: 'https://mdesigns-broker-demo.vercel.app', newTab: true, label: 'Open Car broker template (opens in a new tab)' });
});

// ---- HTML builders ----
const count = (s, re) => [...s.matchAll(re)].length;
const entry = (i, extra = {}) => ({ ...plain(PROJECTS)[i], ...extra });

test('escapeHtml escapes the five characters that matter in text and attributes', () => {
  assert.equal(escapeHtml('<b>"&\''), '&lt;b&gt;&quot;&amp;&#39;');
  assert.equal(escapeHtml(undefined), '');
});

test('figureHtml: words are joined by a middle dot, a flow by an arrow, and items are escaped', () => {
  assert.equal(figureHtml({ kind: 'words', items: ['cars', 'homes'] }), '<div class="figure figure-words"><span>cars</span><i>&middot;</i><span>homes</span></div>');
  assert.equal(figureHtml({ kind: 'flow', items: ['a', 'b', 'c'] }), '<div class="figure figure-flow"><span>a</span><i>&rarr;</i><span>b</span><i>&rarr;</i><span>c</span></div>');
  assert.doesNotMatch(figureHtml({ kind: 'words', items: ['<script>'] }), /<script/);
});

test('visualHtml: an image is one lazy img with its size and description (the thumb at half size when asked); otherwise the drawn figure; never a video', () => {
  const site = plain(PROJECTS[1]);
  assert.equal(visualHtml(PROJECTS[1]),
    `<img class="shot" src="img/projects/site/home.webp" width="1600" height="1000" alt="${escapeHtml(site.image.alt)}" loading="lazy" decoding="async" draggable="false">`);
  assert.equal(visualHtml(PROJECTS[1], { thumb: true }),
    `<img class="shot" src="img/projects/site/home-thumb.webp" width="800" height="500" alt="" loading="lazy" decoding="async" draggable="false">`);
  assert.equal(visualHtml(PROJECTS[3]), figureHtml(PROJECTS[3].figure));
  assert.equal(visualHtml(PROJECTS[3], { thumb: true }), figureHtml(PROJECTS[3].figure));
  for (const p of plain(PROJECTS)) assert.doesNotMatch(visualHtml(p), /<video|autoplay|controls|<source/, p.id);
  assert.doesNotMatch(visualHtml({ ...site, image: { ...site.image, alt: '"><script>x</script>' } }), /<script/);
});

test('accessHref: a mailto to the CV address, with the project in the subject and a short greeting, all encoded', () => {
  assert.equal(accessHref(PROJECTS[0]),
    'mailto:duffaud.max@gmail.com?subject=Demo%20access%3A%20Car%20broker%20template&body=Hi%20Max%2C%0A%0AI%20saw%20Car%20broker%20template%20on%20your%20site%20and%20would%20like%20access%20to%20the%20dashboard.');
  assert.match(accessHref(PROJECTS[4]), /would%20like%20to%20see%20the%20demo\.$/, 'a project with no accessTo keeps the general words');
  const tricky = accessHref(entry(0, { title: 'Q&A "demo" <b>' }));
  assert.match(tricky, /subject=Demo%20access%3A%20Q%26A%20%22demo%22%20%3Cb%3E&body=/);
  assert.equal(tricky.split('?').length, 2, 'one query string');
  assert.equal(tricky.split('&').length, 2, 'only the two parameters');
});

test('projectActions: a public address visits in a new tab, a case view opens inside the page, a request asks for access; in that order, and a project may have two', () => {
  const visit = { kind: 'visit', href: 'https://example.com/demo', label: 'Visit', name: 'Visit Car broker template (opens in a new tab)', newTab: true };
  assert.deepEqual(plain(projectActions(entry(0, { access: undefined, href: 'https://example.com/demo' }))), [visit]);
  assert.deepEqual(plain(projectActions(PROJECTS[1])), [{ kind: 'case', href: '#projects/site', label: 'See how it is built', name: 'See how This website is built', newTab: false }]);
  const car = plain(projectActions(PROJECTS[0]));
  assert.deepEqual(car.map((a) => a.kind), ['visit', 'access'], 'the car broker has its public demo and its private dashboard');
  assert.equal(car[0].href, 'https://mdesigns-broker-demo.vercel.app');
  assert.equal(car[1].label, 'Ask for access to the dashboard'); assert.equal(car[1].name, 'Ask for access to the dashboard of Car broker template'); assert.equal(car[1].newTab, false);
  assert.equal(car[1].href, accessHref(PROJECTS[0]));
  assert.deepEqual(plain(projectActions(PROJECTS[4])).map((a) => a.kind), ['access']);
  assert.deepEqual(plain(projectActions(entry(1, { access: 'request' }))).map((a) => a.kind), ['case', 'access']);
  assert.deepEqual(plain(projectActions(PROJECTS[2])), [], 'the organizer has no demo to open or ask for');
  assert.deepEqual(plain(projectActions(PROJECTS[3])), [], 'planned has nothing yet');
});

// the panel: the words under the selected project
const facts = (html) => [...html.matchAll(/<dt>([^<]+)<\/dt><dd>([^<]*)<\/dd>/g)].map((m) => [m[1], m[2]]);

test('panelHtml: the title with its status chip, then what it does, the dashboard, built with and where it stands, in that order', () => {
  const html = panelHtml(PROJECTS[0]);
  assert.match(html, /^<article class="panel" data-id="car-broker" data-status="live">/);
  assert.match(html, /<div class="panel-head"><h2 class="panel-title">Car broker template<\/h2><span class="chip chip-live">Live<\/span><p class="panel-note">A new look for the site and the dashboard is coming[^<]*<\/p><\/div>/);
  assert.match(panelHtml(PROJECTS[1]), /<div class="panel-head"><h2 class="panel-title">This website<\/h2><span class="chip chip-live">Live<\/span><\/div>/, 'a project with no note has no empty note');
  assert.deepEqual(facts(html), [
    ['What it does', escapeHtml(PROJECTS[0].oneLine)],
    ['Inside the dashboard', escapeHtml(PROJECTS[0].dashboard)],
    ['Built with', escapeHtml(PROJECTS[0].builtWith)],
    ['Where it stands', escapeHtml(PROJECTS[0].stands)],
  ]);
  assert.match(html, /<dl class="panel-facts">/);
  assert.deepEqual(facts(panelHtml(PROJECTS[1])).map((r) => r[0]), ['What it does', 'Built with', 'Where it stands'], 'a project with no dashboard has no empty row');
});

test('panelHtml: the buttons are links named for their project, a public demo first; a project with no action has no buttons and no empty box', () => {
  const car = panelHtml(PROJECTS[0]);
  assert.match(car, /<p class="panel-action"><a class="pill panel-button" href="https:\/\/mdesigns-broker-demo\.vercel\.app" target="_blank" rel="noopener" aria-label="Visit Car broker template \(opens in a new tab\)">Visit<\/a><a class="pill panel-button" href="mailto:duffaud\.max@gmail\.com\?subject=[^"]+" aria-label="Ask for access to the dashboard of Car broker template">Ask for access to the dashboard<\/a><\/p>/);
  const ask = panelHtml(PROJECTS[4]);
  assert.match(ask, /<p class="panel-action"><a class="pill panel-button" href="mailto:[^"]+" aria-label="Ask for access to Quote marketplace">Ask for access<\/a><\/p>/);
  assert.doesNotMatch(ask, /target=/, 'an email link does not open a tab');
  assert.match(panelHtml(PROJECTS[1]), /<a class="pill panel-button" href="#projects\/site" aria-label="See how This website is built">See how it is built<\/a>/);
  for (const i of [2, 3]) { const html = panelHtml(PROJECTS[i]); assert.doesNotMatch(html, /panel-action|<a\b/, PROJECTS[i].id); }
  assert.match(panelHtml(PROJECTS[3]), /<span class="chip chip-planned">Planned<\/span>/);
});

test('panelHtml: nothing in a text field ever becomes markup', () => {
  const html = panelHtml(entry(0, { title: '<script>a</script>', oneLine: '<img onerror=x>', builtWith: '"><b>', stands: '&' }));
  assert.doesNotMatch(html, /<script|<img|<b>/);
  assert.match(html, /&lt;script&gt;/);
});

// the Home band: compact tiles with the small still
test('tileHtml: a compact tile has the small still or the figure, the status chip and a title that is not a heading (Home has no h2 above it)', () => {
  const site = tileHtml(PROJECTS[1]);
  assert.match(site, /^<article class="tile tile-compact has-link" data-id="site" data-status="live">/);
  assert.match(site, /<a class="tile-link" href="#projects\/site" aria-label="Open This website"><\/a>/);
  assert.match(site, /<div class="tile-visual"><img class="shot" src="img\/projects\/site\/home-thumb\.webp" width="800" height="500" alt=""/);
  assert.match(site, /<p class="tile-title">This website<\/p><span class="chip chip-live">Live<\/span>/);
  assert.doesNotMatch(site, /class="cap"|tile-line|<h2|is-featured/);
  const car = tileHtml(PROJECTS[0]);
  assert.match(car, /^<article class="tile tile-compact has-link" data-id="car-broker"/);
  assert.match(car, /<a class="tile-link" href="https:\/\/mdesigns-broker-demo\.vercel\.app" target="_blank" rel="noopener" aria-label="Open Car broker template \(opens in a new tab\)"><\/a>/);
  assert.match(car, /<div class="tile-visual"><img class="shot" src="img\/projects\/car-broker\/home-thumb\.webp"/);
  const organizer = tileHtml(PROJECTS[2]);
  assert.match(organizer, /<div class="tile-visual"><div class="figure figure-flow">/);
  assert.doesNotMatch(organizer, /<a\b|has-link/, 'a project with nothing to open goes nowhere');
});

test('tileHtml: a live tile with a public address is one new-tab link named for it; a title with markup never becomes markup', () => {
  const html = tileHtml(entry(0, { access: undefined, href: 'https://example.com/demo' }));
  assert.equal(count(html, /<a\b/g), 1);
  assert.match(html, /<a class="tile-link" href="https:\/\/example\.com\/demo" target="_blank" rel="noopener" aria-label="Open Car broker template \(opens in a new tab\)"><\/a>/);
  assert.doesNotMatch(tileHtml(entry(0, { title: '<script>alert(1)</script>' })), /<script/);
});

test('homeBandHtml: the pill to the projects page and three compact tiles (car broker, this website, voice organizer)', () => {
  const html = homeBandHtml(PROJECTS);
  assert.match(html, /^<div class="band-head"><p class="kicker">Projects<\/p><a class="pill" href="#projects">all projects &rarr;<\/a><\/div><div class="band-grid">/);
  assert.equal(count(html, /<article class="tile tile-compact/g), 3);
  assert.deepEqual([...html.matchAll(/data-id="([^"]+)"/g)].map((m) => m[1]), ['car-broker', 'site', 'organizer']);
  assert.equal(homeBandHtml([]), '');
  assert.equal(homeBandHtml(plain(PROJECTS).filter((p) => p.status === 'planned')), '');
});

test('noscriptListHtml: one item per project with its status and all three facts, and its link where it has one', () => {
  const html = noscriptListHtml(PROJECTS);
  assert.match(html, /^<ul class="shelf-list">/);
  assert.equal(count(html, /<li>/g), 5);
  for (const p of plain(PROJECTS)) {
    assert.ok(html.includes(`<strong>${p.title}</strong>`), p.id);
    assert.ok(html.includes(statusLabel(p.status)), p.id);
    for (const f of ['oneLine', 'builtWith', 'stands']) assert.ok(html.includes(escapeHtml(p[f])), `${p.id} ${f}`);
  }
  assert.match(html, /<a href="#projects\/site">See how This website is built<\/a>/);
  assert.match(html, /<a href="mailto:duffaud\.max@gmail\.com\?subject=Demo%20access%3A%20Car%20broker%20template[^"]*">Ask for access to the dashboard of Car broker template<\/a>/);
  assert.match(html, /<a href="https:\/\/mdesigns-broker-demo\.vercel\.app" target="_blank" rel="noopener">Visit Car broker template \(opens in a new tab\)<\/a>/);
  assert.equal(count(html, /<a\b/g), 4, 'the website, the car broker (its demo and its access request) and the marketplace; nobody else has a link');
  assert.match(noscriptListHtml([entry(0, { access: undefined, href: 'https://example.com/demo' })]), /<a href="https:\/\/example\.com\/demo" target="_blank" rel="noopener">Visit Car broker template \(opens in a new tab\)<\/a>/);
});


// ---- the note (owner, 2026-10-26): the car broker's look is about to change, and the page says so ----
test('only the car broker carries a note, and it says a new look is coming for the site and the dashboard', () => {
  assert.deepEqual(plain(PROJECTS).filter((p) => p.note !== undefined).map((p) => p.id), ['car-broker']);
  assert.equal(PROJECTS[0].note, "A new look for the site and the dashboard is coming, so this picture and the demo will change.");
});

test('validateProjects: a note is optional, but when present it is real text, short and free of dashes', () => {
  assert.deepEqual(mutate((l) => { delete l[0].note; }), [], 'no note is fine');
  assert.ok(has(mutate((l) => { l[0].note = ''; }), 'car-broker', /note is empty/));
  assert.ok(has(mutate((l) => { l[0].note = 42; }), 'car-broker', /note must be text/));
  assert.ok(has(mutate((l) => { l[0].note = 'x'.repeat(141); }), 'car-broker', /note is longer than 140/));
  assert.deepEqual(mutate((l) => { l[0].note = 'x'.repeat(140); }), [], 'at the limit is fine');
  assert.ok(has(mutate((l) => { l[0].note = 'A — B'; }), 'car-broker', /note has a dash/));
  assert.ok(has(mutate((l) => { l[0].note = 'A – B'; }), 'car-broker', /note has a dash/));
});

test('panelHtml: the note sits in the panel head after the status chip, as a paragraph, and never becomes markup', () => {
  const html = panelHtml(entry(0, { note: '<b>soon</b> & "new"' }));
  assert.match(html, /<span class="chip chip-live">Live<\/span><p class="panel-note">&lt;b&gt;soon&lt;\/b&gt; &amp; &quot;new&quot;<\/p><\/div>/);
  assert.doesNotMatch(html, /<b>/);
});

test('noscriptListHtml: the note is in the plain list too, after where it stands, and only once', () => {
  const html = noscriptListHtml(PROJECTS);
  assert.ok(html.includes('Where it stands: ' + escapeHtml(PROJECTS[0].stands) + ' Note: ' + escapeHtml(PROJECTS[0].note)));
  assert.equal(count(html, /Note: /g), 1);
});

// ---- the car broker's final text, decided with the owner on 2026-10-27 (checked against the code on his PC; the demo is an earlier version) ----
test('the car broker text: what it does, the dashboard, built with and where it stands, as the owner approved them', () => {
  const car = plain(PROJECTS[0]);
  assert.equal(car.oneLine, "A website template for a vehicle broker. Visitors choose a path (rentals, leases, no credit check, car sourcing, or selling their car), pick a car and send a request, and the broker contacts them. A private dashboard runs it all. Each client gets their own version, starting with the look.");
  assert.equal(car.dashboard, "Requests with a status for each car, private notes, reply templates and a calendar. Cars with photos, prices and tags for each path. Switch paths on or off, manage locations and site images, and see top customers.");
  assert.equal(car.builtWith, "Next.js, React, TypeScript, Tailwind, Supabase, Resend and Vercel.");
  assert.equal(car.stands, "Live as a demo on invented data. It is an earlier version, and a newer one is built but not live yet.");
  assert.ok(car.oneLine.length <= 300 && car.dashboard.length <= 300);
  assert.doesNotMatch(car.oneLine, /answers? from a private dashboard/, 'the broker answers by phone, text or email, not from the dashboard');
  assert.deepEqual(plain(PROJECTS).filter((p) => p.dashboard !== undefined).map((p) => p.id), ['car-broker'], 'only the car broker has a dashboard row');
  for (const p of plain(PROJECTS)) assert.ok(p.oneLine.length <= 300, p.id + ' one line is at most 300 characters');
});

test('validateProjects: a dashboard line is optional, but when present it is real text, short and free of dashes', () => {
  assert.deepEqual(mutate((l) => { delete l[0].dashboard; }), [], 'none is fine');
  assert.ok(has(mutate((l) => { l[0].dashboard = ''; }), 'car-broker', /dashboard is empty/));
  assert.ok(has(mutate((l) => { l[0].dashboard = 42; }), 'car-broker', /dashboard must be text/));
  assert.ok(has(mutate((l) => { l[0].dashboard = 'x'.repeat(301); }), 'car-broker', /dashboard is longer than 300/));
  assert.deepEqual(mutate((l) => { l[0].dashboard = 'x'.repeat(300); }), [], 'at the limit is fine');
  assert.ok(has(mutate((l) => { l[0].dashboard = 'A — B'; }), 'car-broker', /dashboard has a dash/));
  assert.ok(has(mutate((l) => { l[0].dashboard = 'A – B'; }), 'car-broker', /dashboard has a dash/));
});

test('panelHtml: the dashboard row never becomes markup', () => {
  const html = panelHtml(entry(0, { dashboard: '<img onerror=x> & "q"' }));
  assert.doesNotMatch(html, /<img/);
  assert.deepEqual(facts(html)[1], ['Inside the dashboard', '&lt;img onerror=x&gt; &amp; &quot;q&quot;']);
});

test('noscriptListHtml: the dashboard line is in the plain list too, between what it does and built with', () => {
  const html = noscriptListHtml(PROJECTS);
  const car = html.slice(html.indexOf('<strong>Car broker template</strong>'), html.indexOf('<strong>This website</strong>'));
  const at = (s) => car.indexOf(s);
  assert.ok(at(escapeHtml(PROJECTS[0].oneLine)) > 0 && at(escapeHtml(PROJECTS[0].oneLine)) < at(' Inside the dashboard: ' + escapeHtml(PROJECTS[0].dashboard)));
  assert.ok(at(' Inside the dashboard: ') < at(' Built with: '));
  assert.equal(count(html, /Inside the dashboard: /g), 1);
});

// ---- the car broker's button asks for the dashboard (owner, 2026-10-27): its site is public, only the dashboard is private ----
test('the car broker button says what is private: the dashboard, and only the car broker has an accessTo', () => {
  assert.equal(plain(PROJECTS[0]).accessTo, 'the dashboard');
  assert.deepEqual(plain(PROJECTS).filter((p) => p.accessTo !== undefined).map((p) => p.id), ['car-broker']);
  const html = panelHtml(PROJECTS[0]);
  assert.match(html, /aria-label="Ask for access to the dashboard of Car broker template">Ask for access to the dashboard<\/a>/);
  assert.match(panelHtml(PROJECTS[4]), /aria-label="Ask for access to Quote marketplace">Ask for access<\/a>/, 'the marketplace keeps the general button');
});

test('validateProjects: accessTo is optional, needs an access request, and is short text without dashes', () => {
  assert.deepEqual(mutate((l) => { delete l[0].accessTo; }), [], 'none is fine');
  assert.ok(has(mutate((l) => { l[1].accessTo = 'the dashboard'; }), 'site', /accessTo needs access "request"/));
  assert.ok(has(mutate((l) => { l[0].accessTo = ''; }), 'car-broker', /accessTo is empty/));
  assert.ok(has(mutate((l) => { l[0].accessTo = 7; }), 'car-broker', /accessTo must be text/));
  assert.ok(has(mutate((l) => { l[0].accessTo = 'x'.repeat(41); }), 'car-broker', /accessTo is longer than 40/));
  assert.deepEqual(mutate((l) => { l[0].accessTo = 'x'.repeat(40); }), [], 'at the limit is fine');
  assert.ok(has(mutate((l) => { l[0].accessTo = 'a — b'; }), 'car-broker', /accessTo has a dash/));
});
