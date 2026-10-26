import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TRIP_STOPS } from '../modules/trip-stops.js';
import { checkTripList, TRIP_LIST_START, TRIP_LIST_END } from './lib/trip-list.mjs';
import { loadClassic } from './lib/load-classic.mjs';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const html = read('index.html');
const trip = html.slice(html.indexOf('<section class="page" id="page-trip"'), html.indexOf('<!-- ================= PROJECTS'));
const { countryAlbums } = loadClassic('js/data.js', ['countryAlbums'], { window: {} });
const at = (s) => { const i = trip.indexOf(s); assert.ok(i >= 0, 'not found: ' + s); return i; };

test('the Trip section starts with the globe off: without JavaScript the map, the list and the albums are what shows', () => {
  assert.match(trip, /^<section class="page" id="page-trip" data-globe="off">/);
  assert.equal([...html.matchAll(/id="page-trip"/g)].length, 1);
});

test('the header names the five countries and gives two instruction lines, one for the globe and one for the map', () => {
  assert.ok(at('<p class="kicker">Venezuela &middot; France &middot; Czech Republic &middot; Spain &middot; Israel</p>') < at("<h1>Where I've been</h1>"));
  assert.match(trip, /<p class="map-instructions" data-when="globe">Watch the flight, or pick a stop\. Rings are study, dots are work\.<\/p>/);
  assert.match(trip, /<p class="map-instructions" data-when="fallback">Scroll or pinch to zoom in, drag to move around, click a highlighted country for the story\.<\/p>/);
});

test('the page runs in this order: header, the globe window, the albums, the plain list, the flat map', () => {
  const order = ['class="map-header"', '<figure class="trip-globe" data-when="globe">', 'class="trip-albums"', TRIP_LIST_START, '<div class="map-stage" data-when="fallback">'].map(at);
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
});

test('the globe window is an empty host and an empty status line inside the dark frame, with its own caption', () => {
  assert.match(trip, /<div class="trip-globe-frame"><div id="tripGlobe"><\/div><p class="trip-globe-msg" id="tripMsg" role="status"><\/p><\/div>/);
  assert.match(trip, /<figcaption class="cap">Fig\. 2\. The route, one stop at a time\.<\/figcaption>/);
});

test('four album buttons, always visible, each opening an album that exists', () => {
  const row = trip.match(/<div class="trip-albums" role="group" aria-label="Photo albums">([\s\S]*?)<\/div>/);
  assert.ok(row, 'the albums row');
  assert.match(row[1], /<span class="kicker">Albums<\/span>/);
  const buttons = [...row[1].matchAll(/<button class="pill" type="button" onclick="openCountryAlbum\('([A-Z]{2})'\)" aria-label="Open the (\w+) photo album">(\w+)<\/button>/g)].map((m) => [m[1], m[2], m[3]]);
  assert.deepEqual(buttons, [['VE', 'Venezuela', 'Venezuela'], ['IL', 'Israel', 'Israel'], ['FR', 'France', 'France'], ['ES', 'Spain', 'Spain']]);
  for (const [code] of buttons) assert.ok(countryAlbums[code], `${code} has an album`);
  assert.doesNotMatch(row[0], /data-when/, 'the row shows with the globe and without it');
});

test('the plain stop list sits between its markers, once, and matches modules/trip-stops.js', () => {
  assert.equal([...html.matchAll(/<!-- trip-stops:start -->/g)].length, 1);
  assert.equal([...html.matchAll(/<!-- trip-stops:end -->/g)].length, 1);
  assert.deepEqual(checkTripList(html, TRIP_STOPS), []);
  assert.equal([...trip.matchAll(/<li data-kind="/g)].length, 11);
});

test('every data-when is globe or fallback, and the flat map is still all there for the fallback', () => {
  for (const m of trip.matchAll(/data-when="([^"]*)"/g)) assert.ok(['globe', 'fallback'].includes(m[1]), m[1]);
  for (const id of ['mapWrap', 'worldmap', 'tooltip', 'zoomInBtn', 'zoomOutBtn', 'zoomResetBtn']) assert.match(trip, new RegExp(`id="${id}"`), id);
  assert.match(trip, /<p class="cap">Fig\. 2\. Countries lived in, studied in and visited\.<\/p>/);
});

test('globe.css and trip.css are linked after map.css and before widgets.css', () => {
  const l = (n) => html.indexOf(`<link rel="stylesheet" href="css/${n}.css">`);
  assert.ok(l('map') > 0 && l('map') < l('globe') && l('globe') < l('trip') && l('trip') < l('widgets'));
});

test('with JavaScript off every page still shows, so the fallback is readable', () => {
  assert.match(html, /<noscript>\s*<style>[^<]*section\.page\s*\{[^}]*display:\s*block\s*!important/);
});
