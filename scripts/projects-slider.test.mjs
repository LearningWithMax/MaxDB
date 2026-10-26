import test from 'node:test';
import assert from 'node:assert/strict';
import { loadClassic } from './lib/load-classic.mjs';

// The slider builders use the data and the panel from projects.js, which share one global scope with it in the browser.
const P = loadClassic('js/projects.js', ['PROJECTS', 'panelHtml', 'visualHtml', 'escapeHtml', 'filterProjects', 'statusLabel'], { CASE_IDS: ['site'] });
const { slideOffsets, stepIndex, swipeDirection, slideHtml, sliderHtml, slidePlan, indexForKey, dragOffset } = loadClassic('js/projects-slider.js', ['slideOffsets', 'stepIndex', 'swipeDirection', 'slideHtml', 'sliderHtml', 'slidePlan', 'indexForKey', 'dragOffset'], { ...P });
const { PROJECTS, escapeHtml } = P;
const arr = (x) => [...x];
const plain = (x) => JSON.parse(JSON.stringify(x));
const count = (str, re) => [...str.matchAll(re)].length;

test('slideOffsets: the selected slide is 0, the neighbors are -1 and +1, around the circle', () => {
  assert.deepEqual(arr(slideOffsets(5, 0)), [0, 1, 2, -2, -1]);
  assert.deepEqual(arr(slideOffsets(5, 1)), [-1, 0, 1, 2, -2]);
  assert.deepEqual(arr(slideOffsets(5, 4)), [1, 2, -2, -1, 0]);
});

test('slideOffsets: any count from 1 to 8 and every selection gives one 0, unique offsets, and the two neighbors at -1 and +1', () => {
  for (let n = 1; n <= 8; n++) for (let sel = 0; sel < n; sel++) {
    const o = arr(slideOffsets(n, sel));
    assert.equal(o.length, n, `n=${n}`);
    assert.equal(o[sel], 0, `n=${n} sel=${sel}`);
    assert.equal(new Set(o).size, n, `unique n=${n} sel=${sel}`);
    assert.ok(o.every(Number.isInteger));
    if (n >= 3) { assert.equal(o[(sel + 1) % n], 1, `next n=${n} sel=${sel}`); assert.equal(o[(sel - 1 + n) % n], -1, `previous n=${n} sel=${sel}`); }
    const half = Math.floor(n / 2);
    assert.ok(o.every((d) => d >= -(n - 1 - half) && d <= half), `range n=${n}`);
  }
});

test('slideOffsets: an even count puts the extra slide on the right, a single slide is just 0, and bad input never throws', () => {
  assert.deepEqual(arr(slideOffsets(4, 0)), [0, 1, 2, -1]);
  assert.deepEqual(arr(slideOffsets(6, 0)), [0, 1, 2, 3, -2, -1]);
  assert.deepEqual(arr(slideOffsets(1, 0)), [0]);
  assert.deepEqual(arr(slideOffsets(2, 1)), [1, 0]);
  assert.deepEqual(arr(slideOffsets(0, 0)), []);
  assert.deepEqual(arr(slideOffsets(3, 7)), arr(slideOffsets(3, 1)), 'a selection past the end wraps');
  assert.deepEqual(arr(slideOffsets(3, -1)), arr(slideOffsets(3, 2)), 'and so does a negative one');
});

test('stepIndex wraps both ways: the last goes to the first and the first to the last', () => {
  assert.equal(stepIndex(5, 4, 1), 0);
  assert.equal(stepIndex(5, 0, -1), 4);
  assert.equal(stepIndex(5, 2, 1), 3);
  assert.equal(stepIndex(5, 2, -1), 1);
});

test('stepIndex handles a step bigger than the count, a negative one, one slide, and no slides', () => {
  assert.equal(stepIndex(5, 1, 7), 3);
  assert.equal(stepIndex(5, 1, -7), 4);
  assert.equal(stepIndex(5, 3, 0), 3);
  assert.equal(stepIndex(1, 0, 1), 0);
  assert.equal(stepIndex(1, 0, -1), 0);
  assert.equal(stepIndex(0, 0, 1), 0);
  for (let n = 1; n <= 8; n++) { let i = 0; for (let k = 0; k < n; k++) i = stepIndex(n, i, 1); assert.equal(i, 0, `a full circle returns home for n=${n}`); }
});

test('swipeDirection: a left swipe means next (1), a right swipe previous (-1), and only a horizontal move past 45 px counts', () => {
  assert.equal(swipeDirection(-80, 5), 1);
  assert.equal(swipeDirection(80, -5), -1);
  assert.equal(swipeDirection(-45, 0), 1, 'exactly the threshold counts');
  assert.equal(swipeDirection(-44, 0), 0, 'one pixel short does not');
  assert.equal(swipeDirection(0, 0), 0);
  assert.equal(swipeDirection(-60, 90), 0, 'a mostly vertical drag is a scroll, not a swipe');
  assert.equal(swipeDirection(-60, -60), 0, 'a perfect diagonal is not horizontal');
  assert.equal(swipeDirection(-30, 0, 20), 1, 'the threshold can be changed');
});

// ---- the markup ----
test('slideHtml: the selected slide is the only one that screen readers see, and every slide carries its place', () => {
  const sel = slideHtml(PROJECTS[1], 1, 0);
  assert.match(sel, /^<div class="slide" data-index="1" data-offset="0" data-id="site">/);
  assert.doesNotMatch(sel, /aria-hidden="true">\s*<div class="slide-frame"/, 'no aria-hidden on the selected slide');
  assert.match(sel, /<div class="slide-frame"><img class="shot" src="img\/projects\/site\/home\.webp"/);
  const other = slideHtml(PROJECTS[2], 2, -1);
  assert.match(other, /^<div class="slide" data-index="2" data-offset="-1" data-id="organizer" aria-hidden="true">/);
  assert.match(other, /<div class="slide-frame"><div class="figure figure-flow">/);
  assert.doesNotMatch(sel + other, /<video|<a\b|<button|tabindex/, 'a slide holds nothing the keyboard can reach');
});

test('sliderHtml: the stage with its arrows and five slides, the dots, the plate counter, and the panel of the selected project', () => {
  const html = sliderHtml(PROJECTS, 1);
  assert.match(html, /^<div class="slider-stage"><button class="slider-arrow slider-prev" type="button" aria-label="Previous project"><svg /);
  assert.match(html, /<button class="slider-arrow slider-next" type="button" aria-label="Next project"><svg /);
  assert.deepEqual([...html.matchAll(/class="slide" data-index="(\d)" data-offset="(-?\d)" data-id="([^"]+)"/g)].map((m) => [m[1], m[2], m[3]]), [
    ['0', '-1', 'car-broker'], ['1', '0', 'site'], ['2', '1', 'organizer'], ['3', '2', 'broker-markets'], ['4', '-2', 'quote-market'],
  ]);
  assert.deepEqual([...html.matchAll(/class="slide"[^>]*>/g)].map((m) => /aria-hidden="true"/.test(m[0])), [true, false, true, true, true]);
  assert.match(html, /<p class="cap slider-count">Plate 2 of 5\.<\/p>/);
  const dots = [...html.matchAll(/<button class="slider-dot" type="button" data-index="(\d)" aria-label="Show ([^"]+)"( aria-current="true")?><\/button>/g)];
  assert.deepEqual(dots.map((m) => [m[1], m[2], !!m[3]]), [['0', 'Car broker template', false], ['1', 'This website', true], ['2', 'Voice organizer', false], ['3', 'Broker template for any market', false], ['4', 'Quote marketplace', false]]);
  assert.match(html, /<div class="slider-dots" role="group" aria-label="Choose a project">/);
  assert.match(html, /<div class="slider-panel" aria-live="polite"><article class="panel" data-id="site" data-status="live">/);
  assert.ok(html.indexOf('slider-stage') < html.indexOf('slider-dots') && html.indexOf('slider-dots') < html.indexOf('slider-panel'));
  assert.doesNotMatch(html, /<video|autoplay/);
});

test('sliderHtml: a selection past either end wraps, and the panel always matches the selected slide', () => {
  const idOf = (sel) => sliderHtml(PROJECTS, sel).match(/class="panel" data-id="([^"]+)"/)[1];
  assert.equal(idOf(0), 'car-broker');
  assert.equal(idOf(4), 'quote-market');
  assert.equal(idOf(5), 'car-broker');
  assert.equal(idOf(-1), 'quote-market');
  assert.equal(idOf(12), 'organizer');
});

test('sliderHtml: one project has no arrows, dots or counter; no project has no slider; eight projects still work', () => {
  const one = sliderHtml([plain(PROJECTS)[1]], 0);
  assert.equal(count(one, /class="slide"/g), 1);
  assert.doesNotMatch(one, /slider-arrow|slider-dot|slider-count/);
  assert.match(one, /class="panel" data-id="site"/);
  assert.equal(sliderHtml([], 0), '');
  const eight = plain(PROJECTS).concat([1, 2, 3].map((k) => ({ ...plain(PROJECTS)[2], id: 'extra-' + k, order: 10 + k, title: 'Extra ' + k })));
  const html = sliderHtml(eight, 7);
  assert.equal(count(html, /class="slide"/g), 8);
  assert.equal(count(html, /class="slider-dot"/g), 8);
  assert.match(html, /Plate 8 of 8\./);
  assert.equal(count(html, /data-offset="0"/g), 1);
});

test('sliderHtml: titles with markup never become markup, in the dots, the slides and the panel', () => {
  const bad = plain(PROJECTS).map((p, i) => (i === 0 ? { ...p, title: '"><script>x</script>' } : p));
  const html = sliderHtml(bad, 0);
  assert.doesNotMatch(html, /<script/);
  assert.match(html, /aria-label="Show &quot;&gt;&lt;script&gt;/);
});

// ---- the plan for a change of selection ----
test('slidePlan: a step to the next slide moves every slide one place, and the slide that wraps behind the others jumps instead of flying across the stage', () => {
  const next = slidePlan(5, 0, 1);
  assert.equal(next.dir, 1);
  assert.deepEqual(arr(next.offsets), [-1, 0, 1, 2, -2]);
  assert.deepEqual(arr(next.jumps), [3], 'slide 3 goes from -2 to +2');
  const wrapNext = slidePlan(5, 4, 0);
  assert.equal(wrapNext.dir, 1, 'from the last to the first is a step forward');
  assert.deepEqual(arr(wrapNext.offsets), [0, 1, 2, -2, -1]);
  assert.deepEqual(arr(wrapNext.jumps), [2]);
  const prev = slidePlan(5, 1, 0);
  assert.equal(prev.dir, -1);
  assert.deepEqual(arr(prev.jumps), [3]);
  assert.equal(slidePlan(5, 0, 4).dir, -1, 'from the first to the last is a step back');
});

test('slidePlan: a far dot animates the slides that move a short way and jumps only those that wrap; no change gives dir 0 and no jumps', () => {
  const far = slidePlan(5, 0, 3);
  assert.equal(far.dir, -1, 'the short way round from 0 to 3 is backwards');
  assert.deepEqual(arr(far.jumps), [1, 2]);
  const same = slidePlan(5, 2, 2);
  assert.equal(same.dir, 0);
  assert.deepEqual(arr(same.jumps), []);
  assert.deepEqual(arr(same.offsets), arr(slideOffsets(5, 2)));
});

test('slidePlan: counts of 1 to 8 never jump a slide that only moves one place, and always end with the selected slide at 0', () => {
  for (let n = 1; n <= 8; n++) for (let from = 0; from < n; from++) for (let to = 0; to < n; to++) {
    const p = slidePlan(n, from, to);
    assert.equal(p.offsets[to], 0, `n=${n} ${from}->${to}`);
    const before = arr(slideOffsets(n, from));
    p.offsets.forEach((o, i) => { if (Math.abs(o - before[i]) <= 1) assert.ok(!arr(p.jumps).includes(i), `n=${n} ${from}->${to} slide ${i} moved one place and must animate`); });
    assert.ok([-1, 0, 1].includes(p.dir));
    assert.equal(p.dir === 0, from === to, `n=${n} ${from}->${to}`);
  }
});

test('indexForKey: the arrows step, Home and End jump to the ends, every other key means nothing', () => {
  assert.equal(indexForKey('ArrowRight', 5, 4), 0);
  assert.equal(indexForKey('ArrowLeft', 5, 0), 4);
  assert.equal(indexForKey('ArrowRight', 5, 1), 2);
  assert.equal(indexForKey('Home', 5, 3), 0);
  assert.equal(indexForKey('End', 5, 1), 4);
  for (const k of ['a', 'Enter', ' ', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'PageDown']) assert.equal(indexForKey(k, 5, 1), null, k);
  assert.equal(indexForKey('ArrowRight', 0, 0), null, 'no slides, no move');
});

// ---- review fix: no card may cross the stage, for any count ----
test('slidePlan: with an even count a far dot jumps exactly the cards that would move against the direction of travel (4 and 6 projects)', () => {
  const four = slidePlan(4, 0, 2);
  assert.equal(four.dir, 1);
  assert.deepEqual(arr(four.offsets), [2, -1, 0, 1]);
  assert.deepEqual(arr(four.jumps), [0, 3], 'the two cards that would slide right across the middle jump instead');
  const six = slidePlan(6, 0, 3);
  assert.equal(six.dir, 1);
  assert.deepEqual(arr(six.jumps), [0, 4, 5]);
  assert.deepEqual(arr(slidePlan(4, 2, 0).jumps), [0, 3].map((i) => (i + 2) % 4).sort(), 'and the same from the other side');
});

test('slidePlan: for 3 to 8 projects, every card that moves against the direction of travel jumps, and no card that moves with it does', () => {
  for (let n = 3; n <= 8; n++) for (let from = 0; from < n; from++) for (let to = 0; to < n; to++) {
    const p = slidePlan(n, from, to), before = arr(slideOffsets(n, from));
    p.offsets.forEach((o, i) => {
      const against = (o - before[i]) * p.dir > 0;
      assert.equal(arr(p.jumps).includes(i), against, `n=${n} ${from}->${to} slide ${i}: ${before[i]} to ${o}`);
    });
  }
});

test('slidePlan: two projects just swap places, so nothing jumps either way', () => {
  for (const [from, to] of [[0, 1], [1, 0]]) {
    const p = slidePlan(2, from, to);
    assert.deepEqual(arr(p.jumps), [], `${from}->${to}`);
    assert.notEqual(p.dir, 0);
  }
});

test('dragOffset: the cards follow the finger one to one, and a long drag stops at 90% of a card so it never runs away', () => {
  assert.equal(dragOffset(-30, 700), -30);
  assert.equal(dragOffset(45, 700), 45);
  assert.equal(dragOffset(0, 700), 0);
  assert.equal(dragOffset(-5000, 700), -630);
  assert.equal(dragOffset(5000, 700), 630);
  assert.equal(dragOffset(-60, 100), -60);
  assert.equal(dragOffset(-200, 100), -90);
  assert.equal(dragOffset(50, 0), 0, 'a track with no width does not move');
});
