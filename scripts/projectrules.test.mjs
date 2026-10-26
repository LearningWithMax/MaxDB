import test from 'node:test';
import assert from 'node:assert/strict';
import * as rules from './lib/rules.mjs';
import { STILL_LIMIT_BYTES, THUMB_LIMIT_BYTES, PAGE_MEDIA_LIMIT_BYTES, checkProjectImages, checkNoVideo, checkProjectNames } from './lib/rules.mjs';

test('the limits: a still 250,000 bytes, a thumb 80,000, a page of media 3,000,000; the video limits are gone', () => {
  assert.equal(STILL_LIMIT_BYTES, 250000);
  assert.equal(THUMB_LIMIT_BYTES, 80000);
  assert.equal(PAGE_MEDIA_LIMIT_BYTES, 3000000);
  for (const gone of ['CLIP_LIMIT_BYTES', 'CASE_CLIP_LIMIT_BYTES', 'POSTER_LIMIT_BYTES', 'checkProjectMedia', 'checkClipMarkup']) assert.equal(rules[gone], undefined, gone);
});

const image = (id, name = 'home') => ({ src: `img/projects/${id}/${name}.webp`, thumb: `img/projects/${id}/${name}-thumb.webp`, w: 1600, h: 1000, alt: 'A screen' });
const projects = () => [
  { id: 'a', status: 'live', order: 1, image: image('a') },
  { id: 'b', status: 'live', order: 2, case: 'b', image: image('b') },
  { id: 'c', status: 'planned', order: 3, figure: { kind: 'words', items: ['x'] } },
];
const files = () => ({
  'img/projects/a/home.webp': 170000, 'img/projects/a/home-thumb.webp': 40000,
  'img/projects/b/home.webp': 160000, 'img/projects/b/home-thumb.webp': 38000,
  'img/projects/b/screen-cv.webp': 140000, 'img/projects/b/screen-trip.webp': 135000,
});
const CASE = ['img/projects/b/screen-cv.webp', 'img/projects/b/screen-trip.webp'];
const images = (over = {}) => checkProjectImages({ projects: projects(), fileBytes: { ...files(), ...over.files }, extraCaseFiles: CASE, ...over.args });

test('checkProjectImages: a good set is clean, and a project with only a figure needs no files', () => {
  assert.deepEqual(images(), []);
  assert.deepEqual(checkProjectImages({ projects: [projects()[2]], fileBytes: {}, extraCaseFiles: [] }), []);
});

test('checkProjectImages: a still or a thumb that is not on disk is named, and so is a missing case screen', () => {
  let f = files(); delete f['img/projects/a/home.webp'];
  let msgs = checkProjectImages({ projects: projects(), fileBytes: f, extraCaseFiles: CASE });
  assert.equal(msgs.length, 1); assert.match(msgs[0], /a: file missing: img\/projects\/a\/home\.webp/);
  f = files(); delete f['img/projects/b/home-thumb.webp'];
  msgs = checkProjectImages({ projects: projects(), fileBytes: f, extraCaseFiles: CASE });
  assert.match(msgs.join('\n'), /b: file missing: img\/projects\/b\/home-thumb\.webp/);
  f = files(); delete f['img/projects/b/screen-cv.webp'];
  assert.match(checkProjectImages({ projects: projects(), fileBytes: f, extraCaseFiles: CASE }).join('\n'), /the case view: file missing: img\/projects\/b\/screen-cv\.webp/);
});

test('checkProjectImages: a still over 250,000 bytes, a thumb over 80,000 and a case screen over 250,000 are each named; exactly at the limit is allowed', () => {
  assert.match(images({ files: { 'img/projects/a/home.webp': 250001 } }).join('\n'), /a: img\/projects\/a\/home\.webp is 250001 bytes \(limit 250000\)/);
  assert.match(images({ files: { 'img/projects/a/home-thumb.webp': 80001 } }).join('\n'), /a: img\/projects\/a\/home-thumb\.webp is 80001 bytes \(limit 80000\)/);
  assert.match(images({ files: { 'img/projects/b/screen-trip.webp': 250001 } }).join('\n'), /the case view: img\/projects\/b\/screen-trip\.webp is 250001 bytes \(limit 250000\)/);
  assert.deepEqual(images({ files: { 'img/projects/a/home.webp': 250000, 'img/projects/a/home-thumb.webp': 80000 } }), []);
});

test('checkProjectImages: the slider, the Home band and the case view each stay under 3,000,000 bytes of images', () => {
  const many = Array.from({ length: 13 }, (_, i) => ({ id: 'p' + i, status: 'live', order: i + 1, image: image('p' + i) }));
  const f = {}; for (const p of many) { f[p.image.src] = 240000; f[p.image.thumb] = 79000; }
  const msgs = checkProjectImages({ projects: many, fileBytes: f, extraCaseFiles: [] });
  assert.match(msgs.join('\n'), /the slider fetches 3120000 bytes of images \(limit 3000000\)/);
  assert.doesNotMatch(msgs.join('\n'), /Home band|case view/, 'only the slider is over');
  const heavyThumbs = {}; const big = Array.from({ length: 40 }, (_, i) => ({ id: 'q' + i, status: 'live', order: i + 1, image: image('q' + i) }));
  for (const p of big) { heavyThumbs[p.image.src] = 1000; heavyThumbs[p.image.thumb] = 79000; }
  assert.match(checkProjectImages({ projects: big, fileBytes: heavyThumbs, homeIds: big.map((p) => p.id), extraCaseFiles: [] }).join('\n'), /the Home band fetches 3160000 bytes of images \(limit 3000000\)/);
  const screens = Array.from({ length: 13 }, (_, i) => `img/projects/b/s${i}.webp`);
  const sf = { ...files() }; for (const s of screens) sf[s] = 240000;
  assert.match(checkProjectImages({ projects: projects(), fileBytes: sf, extraCaseFiles: screens }).join('\n'), /the case view fetches 3120000 bytes of images \(limit 3000000\)/);
});

test('checkNoVideo: a clean site is clean', () => {
  assert.deepEqual(checkNoVideo({ html: '<p>hi</p>', js: { 'js/a.js': 'const x = 1;' }, files: ['img/projects/site/home.webp', 'img/projects/site/screen-cv.webp'] }), []);
});

test('checkNoVideo: no <video> in the page or in any script, no autoplay anywhere, and no video file left under img/projects', () => {
  assert.match(checkNoVideo({ html: '<video></video>', js: {}, files: [] }).join('\n'), /index\.html: the site has no video/);
  assert.match(checkNoVideo({ html: '', js: { 'js/other.js': "el.innerHTML = '<VIDEO muted>';" }, files: [] }).join('\n'), /js\/other\.js: the site has no video/);
  assert.match(checkNoVideo({ html: '<div autoplay></div>', js: {}, files: [] }).join('\n'), /index\.html: autoplay is not allowed/);
  assert.match(checkNoVideo({ html: '', js: { 'js/x.js': 'video.autoplay = true;' }, files: [] }).join('\n'), /js\/x\.js: autoplay is not allowed/);
  const msgs = checkNoVideo({ html: '', js: {}, files: ['img/projects/site/loop.mp4', 'img/projects/site/case-loop.webm', 'img/projects/site/loop-poster.webp'] });
  assert.equal(msgs.length, 2);
  assert.match(msgs.join('\n'), /img\/projects\/site\/loop\.mp4: a video file is still in the repo/);
  assert.match(msgs.join('\n'), /img\/projects\/site\/case-loop\.webm: a video file is still in the repo/);
});

test('checkProjectNames: no client name in the data file or on the Projects page', () => {
  assert.deepEqual(checkProjectNames({ projectsJs: 'const a = "Car broker";', pageHtml: '<h1>Projects</h1>' }), []);
  for (const name of ['Chacao', 'chacao', 'Laboratorios']) {
    assert.match(checkProjectNames({ projectsJs: `x = "${name}"`, pageHtml: '' }).join('\n'), /js\/projects\.js: names a client/, name);
    assert.match(checkProjectNames({ projectsJs: '', pageHtml: `<p>${name}</p>` }).join('\n'), /the Projects page: names a client/, name);
  }
});

test('checkProjectNames: private names come in as an argument, so no client name has to live in the public repo', () => {
  const none = { projectsJs: 'x = "Car broker"', pageHtml: '<p>Projects</p>' };
  assert.deepEqual(checkProjectNames({ ...none, privateNames: ['Zorro Quux'] }), []);
  for (const name of ['Zorro Quux', 'zorro quux', 'ZORRO QUUX']) {
    assert.match(checkProjectNames({ projectsJs: `x = "${name}"`, pageHtml: '', privateNames: ['Zorro Quux'] }).join('\n'), /js\/projects\.js: names a client/, name);
    assert.match(checkProjectNames({ projectsJs: '', pageHtml: `<p>${name}</p>`, privateNames: ['Zorro Quux'] }).join('\n'), /the Projects page: names a client/, name);
  }
});

test('checkProjectNames: blank private names match nothing, and a name is taken literally, not as a pattern', () => {
  const none = { projectsJs: 'x = "Car broker, live"', pageHtml: '<p>Projects</p>' };
  assert.deepEqual(checkProjectNames({ ...none, privateNames: ['', '   ', '\t'] }), []);
  assert.deepEqual(checkProjectNames({ ...none, privateNames: ['.*', 'a|b', '(live'] }), []);
  assert.match(checkProjectNames({ projectsJs: 'x = "Acme (live"', pageHtml: '', privateNames: ['Acme (live'] }).join('\n'), /names a client/);
});
