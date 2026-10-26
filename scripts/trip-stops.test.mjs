import test from 'node:test';
import assert from 'node:assert/strict';
import { TRIP_STOPS } from '../modules/trip-stops.js';
import { STOPS, KINDS } from '../modules/globe-data.js';
import { findBannedText, INTELCIA_FACT } from './lib/rules.mjs';
import { tripListHtml, checkTripList, TRIP_LIST_START, TRIP_LIST_END } from './lib/trip-list.mjs';

test('eleven stops, in the approved order, with the approved kinds', () => {
  assert.deepEqual(TRIP_STOPS.map((s) => s.city), ['Caracas', 'Poitiers', 'Prague', 'Bordeaux', 'Clermont-Ferrand', 'Rehovot', 'Madrid', 'Caracas', 'Madrid', 'Caracas', 'Yashresh']);
  assert.deepEqual(TRIP_STOPS.map((s) => s.kind), ['born', 'study', 'work', 'study', 'work', 'work', 'study', 'work', 'work', 'work', 'work']);
});

test('study stops are exactly numbers 2, 4 and 7, and Bordeaux comes before the Michelin work-study', () => {
  assert.deepEqual(TRIP_STOPS.map((s, i) => [s.kind, i + 1]).filter(([k]) => k === 'study').map(([, n]) => n), [2, 4, 7]);
  const names = TRIP_STOPS.map((s) => s.city);
  assert.ok(names.indexOf('Bordeaux') < names.indexOf('Clermont-Ferrand'));
});

test('every stop has what the globe needs and what the card can show', () => {
  for (const s of TRIP_STOPS) {
    assert.match(s.cc, /^[A-Z]{2}$/, s.city);
    assert.ok(s.city && s.country, s.city);
    assert.ok(Number.isFinite(s.lat) && Number.isFinite(s.lon), s.city);
    assert.ok(KINDS[s.kind], s.city + ' has a kind the globe knows');
    assert.ok(s.when && s.when.length > 0, s.city);
    assert.ok(s.what && s.what.length > 0 && s.what.length <= 120, `${s.city}: what is ${s.what.length} characters`);
  }
});

test('positions and countries are Fable\'s, matched by city, so the site and the globe never disagree about where a stop is', () => {
  for (const s of TRIP_STOPS) {
    const f = STOPS.find((x) => x.city === s.city);
    assert.ok(f, `${s.city} is in the globe's own list`);
    assert.deepEqual([s.cc, s.country, s.lat, s.lon], [f.cc, f.country, f.lat, f.lon], s.city);
  }
});

test('the wording follows the copy rules, and the Intelcia stop uses the approved sentence and the CV title', () => {
  for (const s of TRIP_STOPS) assert.deepEqual(findBannedText(`${s.city} what`, s.what), [], s.city);
  const intelcia = TRIP_STOPS.find((s) => /Intelcia/.test(s.what));
  assert.ok(intelcia, 'an Intelcia stop');
  assert.ok(intelcia.what.includes(INTELCIA_FACT), 'the approved sentence, word for word');
  assert.ok(intelcia.what.includes('Operations support and team coordinator'));
  assert.doesNotMatch(intelcia.what, /Teams|Microsoft/);
  assert.equal(TRIP_STOPS.filter((s) => /Intelcia/.test(s.what)).length, 1);
});

test('tripListHtml: one item per stop with its kind, number, place, kind label, dates and line', () => {
  const html = tripListHtml(TRIP_STOPS);
  assert.match(html, /^<ol class="trip-stops" data-when="fallback">/);
  assert.equal([...html.matchAll(/<li data-kind="/g)].length, 11);
  assert.match(html, /<li data-kind="study"><span class="trip-stop-n">04<\/span> <b class="trip-stop-city">Bordeaux, France<\/b> <span class="trip-stop-kind">Studied<\/span> <span class="trip-stop-when">2019 to 2020<\/span> <span class="trip-stop-what">/);
  assert.match(html, /<li data-kind="born"><span class="trip-stop-n">01<\/span>/);
  assert.equal([...html.matchAll(/class="trip-stop-kind">Worked</g)].length, 7);
  assert.equal([...html.matchAll(/class="trip-stop-kind">Studied</g)].length, 3);
});

test('tripListHtml: & and accented letters become entities, and markup in a line never becomes markup', () => {
  const html = tripListHtml([
    { cc: 'FR', city: 'Bordeaux', country: 'France', lat: 0, lon: 0, kind: 'study', when: '2019', what: 'R&D at the Université, <b>x</b>' },
  ]);
  assert.match(html, /R&amp;D at the Universit&eacute;, &lt;b&gt;x&lt;\/b&gt;/);
  assert.doesNotMatch(html, /<b>x<\/b>/);
});

test('checkTripList: clean when the block matches, a message when the markers are missing, a message when a line differs', () => {
  const block = tripListHtml(TRIP_STOPS);
  const page = (inner) => `<div>${TRIP_LIST_START}\n    ${inner}\n    ${TRIP_LIST_END}</div>`;
  assert.deepEqual(checkTripList(page(block), TRIP_STOPS), []);
  assert.deepEqual(checkTripList(page(block.replace(/></g, '>\n      <')), TRIP_STOPS), [], 'whitespace between tags does not matter');
  assert.match(checkTripList('<div></div>', TRIP_STOPS).join(' '), /markers are missing/);
  assert.match(checkTripList(page(block.replace('Team lead at Cann.Edenn', 'Team lead somewhere')), TRIP_STOPS).join(' '), /differs from modules\/trip-stops\.js/);
});
