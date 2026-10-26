import test from 'node:test';
import assert from 'node:assert/strict';
import { loadClassic } from './lib/load-classic.mjs';

const { formatClock } = loadClassic('js/clock.js', ['formatClock']);

test('formatClock: winter, Tel Aviv is two hours ahead of UTC', () => {
  assert.equal(formatClock(new Date('2026-01-15T19:04:00Z')), 'tel aviv 21:04');
});

test('formatClock: summer time moves it to three hours ahead, so the same Tel Aviv time comes from an earlier UTC time', () => {
  assert.equal(formatClock(new Date('2026-07-15T18:04:00Z')), 'tel aviv 21:04');
  assert.equal(formatClock(new Date('2026-07-15T19:04:00Z')), 'tel aviv 22:04');
});

test('formatClock: midnight is 00:04, never 24:04', () => {
  assert.equal(formatClock(new Date('2026-01-15T22:04:00Z')), 'tel aviv 00:04');
});

test('formatClock: the visitor\'s own time zone does not matter', () => {
  const was = process.env.TZ;
  try {
    for (const tz of ['America/Caracas', 'Pacific/Auckland', 'UTC']) {
      process.env.TZ = tz;
      assert.equal(formatClock(new Date('2026-01-15T19:04:00Z')), 'tel aviv 21:04', tz);
    }
  } finally { if (was === undefined) delete process.env.TZ; else process.env.TZ = was; }
});

function startWith(globals) {
  const el = { textContent: '', hidden: false };
  const timers = [];
  const api = loadClassic('js/clock.js', ['startClock'], { setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; }, document: { addEventListener() {}, hidden: false }, ...globals });
  return { el, timers, ...api };
}

test('startClock: renders at once and schedules the next tick for the next minute boundary', () => {
  const { el, timers, startClock } = startWith({});
  startClock(el);
  assert.match(el.textContent, /^tel aviv \d\d:\d\d$/);
  assert.equal(el.hidden, false);
  assert.equal(timers.length, 1);
  assert.ok(timers[0].ms > 0 && timers[0].ms <= 60100, `next tick in ${timers[0].ms} ms`);
});

test('startClock: when Intl or the zone is unavailable the clock hides itself instead of showing a wrong time', () => {
  const broken = { DateTimeFormat: function () { throw new RangeError('Invalid time zone specified: Asia/Jerusalem'); } };
  const { el, timers, startClock } = startWith({ Intl: broken });
  startClock(el);
  assert.equal(el.hidden, true);
  assert.equal(el.textContent, '');
  assert.equal(timers.length, 0, 'no timer keeps running for a clock that is hidden');
});

// ---- years since a month: the Home stat "Years in" is computed, so it grows by itself ----
const { yearsSince } = loadClassic('js/clock.js', ['yearsSince']);

test('yearsSince counts whole years from a year-month: March 2019 is 7 in October 2026 and 8 from March 2027', () => {
  assert.equal(yearsSince('2019-03', new Date('2026-10-25T12:00:00Z')), 7);
  assert.equal(yearsSince('2019-03', new Date('2027-02-28T12:00:00Z')), 7);
  assert.equal(yearsSince('2019-03', new Date('2027-03-01T00:00:00Z')), 8);
  assert.equal(yearsSince('2019-03', new Date('2019-03-01T00:00:00Z')), 0);
  assert.equal(yearsSince('2019-03', new Date('2020-03-01T00:00:00Z')), 1);
});

test('yearsSince never goes below 0 and ignores a bad value instead of printing NaN', () => {
  assert.equal(yearsSince('2030-01', new Date('2026-10-25T12:00:00Z')), 0);
  for (const bad of ['', 'x', '2019', '2019-13', '2019-00', null, undefined, 20190301]) assert.equal(yearsSince(bad, new Date('2026-10-25T12:00:00Z')), 0, String(bad));
  assert.equal(yearsSince('2019-03', new Date('nope')), 0);
});
