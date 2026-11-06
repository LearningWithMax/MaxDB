import test from 'node:test';
import assert from 'node:assert/strict';
import { loadClassic } from './lib/load-classic.mjs';

import fs from 'node:fs';
const { parseRoute, buildHash, parseProject, CASE_IDS, PAGES } = loadClassic('js/route.js', ['parseRoute', 'buildHash', 'parseProject', 'CASE_IDS', 'PAGES']);
const route = (h) => ({ ...parseRoute(h) });

test('the Projects page is a page, and the website has a case view', () => {
  assert.deepEqual([...PAGES], ['home', 'cv', 'projects', 'trip']);
  assert.deepEqual([...CASE_IDS], ['site']);
});

test('parseRoute: #projects and any case address land on the Projects page', () => {
  for (const h of ['#projects', '#projects/site', '#PROJECTS/SITE', '#projects/zzz']) assert.deepEqual(route(h), { page: 'projects' }, h);
});

test('parseProject: only a known case id on the Projects page, case-insensitive; everything else is null', () => {
  assert.equal(parseProject('#projects/site'), 'site');
  assert.equal(parseProject('#PROJECTS/SITE'), 'site');
  for (const h of ['#projects/zzz', '#projects', '#cv/site', '#site', '', undefined, null]) assert.equal(parseProject(h), null, String(h));
});

test('buildHash: a case id only appears for the Projects page and only when it is a known case', () => {
  assert.equal(buildHash('projects'), '#projects');
  assert.equal(buildHash('projects', 'site'), '#projects/site');
  assert.equal(buildHash('projects', 'zzz'), '#projects');
  assert.equal(buildHash('cv', 'site'), '#cv');
});

test('nav.js routes the case view: goTo takes a project, builds the hash with it, tells the page, and logs Projects', () => {
  const nav = fs.readFileSync('js/nav.js', 'utf8');
  assert.match(nav, /vlogPageNames = \{ home:'Home', cv:'CV', projects:'Projects', trip:'Trip' \}/);
  assert.match(nav, /function goTo\(page, fromHash, project\)/);
  assert.match(nav, /buildHash\(page, project\)/);
  assert.match(nav, /parseProject\(window\.location\.hash\)/);
  assert.match(nav, /page === 'projects' && window\.setProjectView\)\s*setProjectView\(project \|\| null\)/);
});

test('parseRoute: empty hash and #home are home', () => {
  assert.deepEqual(route(''), { page: 'home' });
  assert.deepEqual(route('#home'), { page: 'home' });
});

test('parseRoute: #cv is the CV', () => {
  assert.deepEqual(route('#cv'), { page: 'cv' });
});

test('parseRoute: the old reading addresses still open the CV, so links shared before the refocus keep working', () => {
  for (const h of ['#cv/cust', '#cv/ops', '#cv/chem', '#cv/all', '#CV/OPS']) assert.deepEqual(route(h), { page: 'cv' }, h);
});

test('buildHash: the CV is always #cv, so an old reading address is rewritten to #cv', () => {
  assert.equal(buildHash('cv'), '#cv');
  assert.equal(buildHash(parseRoute('#cv/ops').page), '#cv');
  assert.equal(buildHash('home'), '#home');
  assert.equal(buildHash('trip'), '#trip');
});

test('parseRoute: odd hashes never give a blank page (Review Focus 1)', () => {
  assert.deepEqual(route('#cv/foo'), { page: 'cv' });
  assert.deepEqual(route('#cv/'), { page: 'cv' });
  assert.deepEqual(route('#cv/ops/x'), { page: 'cv' });
  assert.deepEqual(route('#nope'), { page: 'home' });
  assert.deepEqual(route(undefined), { page: 'home' });
});

test('parseRoute: #trip is the Trip page, and the old #map link lands on the same page', () => {
  for (const h of ['#trip', '#TRIP', '#map', '#MAP', '#trip/x', '#map/x']) assert.deepEqual(route(h), { page: 'trip' }, h);
});

test('route.js and nav.js know no reading any more (one CV reading since the refocus, 2026-11-06)', () => {
  for (const f of ['js/route.js', 'js/nav.js']) assert.doesNotMatch(fs.readFileSync(f, 'utf8'), /lens/i, f);
});
