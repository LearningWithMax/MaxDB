import test from 'node:test';
import assert from 'node:assert/strict';
import { loadClassic } from './lib/load-classic.mjs';

import fs from 'node:fs';
const { parseRoute, buildHash, normalizeLens, parseProject, CASE_IDS, PAGES } = loadClassic('js/route.js', ['parseRoute', 'buildHash', 'normalizeLens', 'parseProject', 'CASE_IDS', 'PAGES']);

test('the Projects page is a page, and the website has a case view', () => {
  assert.deepEqual([...PAGES], ['home', 'cv', 'projects', 'trip']);
  assert.deepEqual([...CASE_IDS], ['site']);
});

test('parseRoute: #projects and any case address land on the Projects page with the blended lens', () => {
  for (const h of ['#projects', '#projects/site', '#PROJECTS/SITE', '#projects/zzz']) assert.deepEqual({ ...parseRoute(h) }, { page: 'projects', lens: 'all' }, h);
});

test('parseProject: only a known case id on the Projects page, case-insensitive; everything else is null', () => {
  assert.equal(parseProject('#projects/site'), 'site');
  assert.equal(parseProject('#PROJECTS/SITE'), 'site');
  for (const h of ['#projects/zzz', '#projects', '#cv/site', '#site', '', undefined, null]) assert.equal(parseProject(h), null, String(h));
});

test('buildHash: a case id only appears for the Projects page and only when it is a known case', () => {
  assert.equal(buildHash('projects'), '#projects');
  assert.equal(buildHash('projects', undefined, 'site'), '#projects/site');
  assert.equal(buildHash('projects', undefined, 'zzz'), '#projects');
  assert.equal(buildHash('cv', 'ops', 'site'), '#cv/ops');
});

test('nav.js routes the case view: goTo takes a project, builds the hash with it, tells the page, and logs Projects', () => {
  const nav = fs.readFileSync('js/nav.js', 'utf8');
  assert.match(nav, /vlogPageNames = \{ home:'Home', cv:'CV', projects:'Projects', trip:'Trip' \}/);
  assert.match(nav, /function goTo\(page, lens, fromHash, project\)/);
  assert.match(nav, /buildHash\(page, lens, project\)/);
  assert.match(nav, /parseProject\(window\.location\.hash\)/);
  assert.match(nav, /page === 'projects' && window\.setProjectView\)\s*setProjectView\(project \|\| null\)/);
});

test('parseRoute: empty hash and #home are home with the blended lens', () => {
  assert.deepEqual({ ...parseRoute('') }, { page: 'home', lens: 'all' });
  assert.deepEqual({ ...parseRoute('#home') }, { page: 'home', lens: 'all' });
});

test('parseRoute: #cv is the CV with the blended lens', () => {
  assert.deepEqual({ ...parseRoute('#cv') }, { page: 'cv', lens: 'all' });
});

test('parseRoute: #cv/ops carries the lens, case-insensitively', () => {
  assert.deepEqual({ ...parseRoute('#cv/ops') }, { page: 'cv', lens: 'ops' });
  assert.deepEqual({ ...parseRoute('#CV/OPS') }, { page: 'cv', lens: 'ops' });
});

test('parseRoute: odd hashes never give a blank page (Review Focus 1)', () => {
  assert.deepEqual({ ...parseRoute('#cv/foo') }, { page: 'cv', lens: 'all' });
  assert.deepEqual({ ...parseRoute('#cv/') }, { page: 'cv', lens: 'all' });
  assert.deepEqual({ ...parseRoute('#cv/ops/x') }, { page: 'cv', lens: 'ops' });
  assert.deepEqual({ ...parseRoute('#nope') }, { page: 'home', lens: 'all' });
  assert.deepEqual({ ...parseRoute(undefined) }, { page: 'home', lens: 'all' });
});

test('parseRoute: #trip is the Trip page, and the old #map link lands on the same page', () => {
  for (const h of ['#trip', '#TRIP', '#map', '#MAP', '#trip/x', '#map/x']) assert.deepEqual({ ...parseRoute(h) }, { page: 'trip', lens: 'all' }, h);
});

test('buildHash: lens only appears for the CV and never for all', () => {
  assert.equal(buildHash('cv', 'ops'), '#cv/ops');
  assert.equal(buildHash('cv', 'all'), '#cv');
  assert.equal(buildHash('cv'), '#cv');
  assert.equal(buildHash('home'), '#home');
  assert.equal(buildHash('trip'), '#trip');
  assert.equal(buildHash('cv', 'zzz'), '#cv');
});

test('normalizeLens: valid lenses pass, anything else is all', () => {
  assert.equal(normalizeLens('cust'), 'cust');
  assert.equal(normalizeLens('CHEM'), 'chem');
  assert.equal(normalizeLens(''), 'all');
  assert.equal(normalizeLens(null), 'all');
});
