import test from 'node:test';
import assert from 'node:assert/strict';
import { loadClassic } from './lib/load-classic.mjs';

// A small fake page for js/projects-slider.js: the slider root, elements built from the real sliderHtml output, events that reach the
// root (as they bubble in a browser), and timers the test controls.
const P = loadClassic('js/projects.js', ['PROJECTS', 'panelHtml', 'visualHtml', 'escapeHtml', 'filterProjects', 'statusLabel'], { CASE_IDS: ['site'] });

class El {
  constructor(tag, attrs = {}, parent = null) {
    this.tag = tag; this.attrs = { ...attrs }; this.parent = parent; this.cls = new Set((attrs.class || '').split(/\s+/).filter(Boolean));
    this.dataset = {}; this.textContent = ''; this.innerHTML = ''; this.styleLog = []; this.listeners = {};
    const log = this.styleLog;
    let tf = '';
    this.style = { get transition() { return log.at(-1) ?? ''; }, set transition(v) { log.push(v); }, get transform() { return tf; }, set transform(v) { tf = v; } };
  }
  get classList() { const c = this.cls; return { add: (x) => c.add(x), remove: (x) => c.delete(x), contains: (x) => c.has(x) }; }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(t, f, opts) { (this.listeners[t] ||= []).push(f); (this.listenerOpts ||= {})[t] = opts; }
  get offsetWidth() { return 100; }
  closest(sel) { for (let n = this; n; n = n.parent) if (n.cls && sel.startsWith('.') && n.cls.has(sel.slice(1))) return n; return null; }
}

const attrsOf = (s) => Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));

function page({ reduced = false } = {}) {
  const timers = []; let timerId = 0; const swapLog = [];
  const root = new El('section', { class: 'slider', id: 'projectSlider' });
  const stage = new El('div', { class: 'slider-stage' }, root);
  const track = new El('div', { class: 'slider-track' }, stage); const captured = [];
  root.setPointerCapture = (id) => captured.push(id);
  const state = { slides: [], dots: [], prev: null, next: null, count: null, panel: null, track };
  let innerHtml = '';
  Object.defineProperty(root, 'innerHTML', {
    get: () => innerHtml,
    set: (html) => {
      innerHtml = html;
      state.slides = [...html.matchAll(/<div class="slide" ([^>]*)>/g)].map((m) => new El('div', { class: 'slide', ...attrsOf(m[1]) }, stage));
      state.dots = [...html.matchAll(/<button class="slider-dot" ([^>]*)><\/button>/g)].map((m) => new El('button', { class: 'slider-dot', ...attrsOf(m[1]) }, root));
      state.prev = /slider-prev/.test(html) ? new El('button', { class: 'slider-arrow slider-prev' }, stage) : null;
      state.next = /slider-next/.test(html) ? new El('button', { class: 'slider-arrow slider-next' }, stage) : null;
      const c = html.match(/<p class="cap slider-count">([^<]*)<\/p>/);
      state.count = c ? Object.assign(new El('p', { class: 'cap slider-count' }, root), { textContent: c[1] }) : null;
      const box = new El('div', { class: 'slider-panel' }, root);
      let panelHtml = html.slice(html.indexOf('<article class="panel"'), html.lastIndexOf('</div>'));
      Object.defineProperty(box, 'innerHTML', { get: () => panelHtml, set: (h) => { panelHtml = h; swapLog.push(h.match(/data-id="([^"]+)"/)[1]); } });
      state.panel = box;
    },
  });
  root.querySelectorAll = (sel) => ({ '.slide': state.slides, '.slider-dot': state.dots }[sel] || []);
  root.querySelector = (sel) => ({ '.slider-count': state.count, '.slider-panel': state.panel, '.slider-prev': state.prev, '.slider-next': state.next, '.slider-track': state.track }[sel] || null);
  const document = { getElementById: (id) => (id === 'projectSlider' ? root : null) };
  const win = { matchMedia: () => ({ matches: reduced }) };
  const api = loadClassic('js/projects-slider.js', ['initProjectSlider', 'goToProject', 'stepProject', 'currentProject'], {
    ...P, document, window: win, matchMedia: win.matchMedia,
    setTimeout: (f) => { timers.push({ id: ++timerId, f }); return timerId; },
    clearTimeout: (id) => { const i = timers.findIndex((t) => t.id === id); if (i >= 0) timers.splice(i, 1); },
  });
  const fire = (target, type, props = {}) => {
    const e = { type, target, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...props };
    for (const f of root.listeners[type] || []) f(e);
    return e;
  };
  const flush = () => { while (timers.length) timers.shift().f(); };
  const ids = () => state.slides.map((s) => s.getAttribute('data-id'));
  const offsets = () => state.slides.map((s) => Number(s.getAttribute('data-offset')));
  const panelId = () => state.panel.innerHTML.match(/class="panel" data-id="([^"]+)"/)[1];
  return { api, root, state, fire, flush, timers, ids, offsets, panelId, swapLog, captured };
}

test('init fills the slider: the first project selected, its panel, the counter and five dots', () => {
  const t = page();
  assert.equal(t.state.slides.length, 5);
  assert.deepEqual(t.offsets(), [0, 1, 2, -2, -1]);
  assert.equal(t.panelId(), 'car-broker');
  assert.equal(t.state.count.textContent, 'Plate 1 of 5.');
  assert.deepEqual(t.state.dots.map((d) => d.getAttribute('aria-current')), ['true', null, null, null, null]);
  assert.equal(t.api.currentProject(), 0);
});

test('the next arrow moves every slide one place, hides the old one from screen readers, moves the dot and the counter, then swaps the panel', () => {
  const t = page();
  const nextBtn = t.state.next;
  t.fire(nextBtn, 'click');
  assert.equal(t.api.currentProject(), 1);
  assert.deepEqual(t.offsets(), [-1, 0, 1, 2, -2]);
  assert.deepEqual(t.state.slides.map((s) => s.getAttribute('aria-hidden')), ['true', null, 'true', 'true', 'true']);
  assert.deepEqual(t.state.dots.map((d) => d.getAttribute('aria-current')), [null, 'true', null, null, null]);
  assert.equal(t.state.count.textContent, 'Plate 2 of 5.');
  assert.equal(t.panelId(), 'car-broker', 'the old words fade out first');
  assert.ok(t.state.panel.classList.contains('is-leaving'));
  assert.equal(t.state.panel.dataset.dir, 'next');
  t.flush();
  assert.equal(t.panelId(), 'site');
  assert.ok(!t.state.panel.classList.contains('is-leaving') && !t.state.panel.classList.contains('is-entering'));
  assert.equal(t.state.next, nextBtn, 'nothing is re-rendered, so keyboard focus stays on the arrow');
});

test('the previous arrow from the first project wraps to the last, and next from the last wraps to the first', () => {
  const t = page();
  t.fire(t.state.prev, 'click'); t.flush();
  assert.equal(t.api.currentProject(), 4);
  assert.equal(t.panelId(), 'quote-market');
  assert.equal(t.state.panel.dataset.dir, 'prev');
  t.fire(t.state.next, 'click'); t.flush();
  assert.equal(t.api.currentProject(), 0);
  assert.equal(t.panelId(), 'car-broker');
});

test('a click on the arrow icon inside the button counts as a click on the button', () => {
  const t = page();
  const icon = new El('svg', {}, t.state.next);
  t.fire(icon, 'click');
  assert.equal(t.api.currentProject(), 1);
});

test('a dot selects its project; the current dot and the selected slide do nothing; a neighbor slide selects itself', () => {
  const t = page();
  t.fire(t.state.dots[3], 'click'); t.flush();
  assert.equal(t.api.currentProject(), 3);
  assert.equal(t.panelId(), 'broker-markets');
  const before = t.timers.length;
  t.fire(t.state.dots[3], 'click');
  t.fire(t.state.slides[3], 'click');
  assert.equal(t.timers.length, before, 'no change, no motion');
  t.fire(t.state.slides[4], 'click'); t.flush();
  assert.equal(t.api.currentProject(), 4);
  assert.equal(t.panelId(), 'quote-market');
});

test('a slide that wraps behind the others jumps (no transition for one frame) instead of flying across the stage', () => {
  const t = page();
  t.fire(t.state.next, 'click');
  const wrapper = t.state.slides[3];
  assert.deepEqual(wrapper.styleLog, ['none', ''], 'switched off, then back on');
  assert.deepEqual(t.state.slides[0].styleLog, [], 'a slide that moves one place keeps its transition');
});

test('five quick clicks swap the panel once, to the project that ended up selected', () => {
  const t = page();
  for (let i = 0; i < 7; i++) t.fire(t.state.next, 'click');
  assert.equal(t.api.currentProject(), 2);
  assert.equal(t.timers.length, 1, 'one pending swap, not seven');
  t.flush();
  assert.deepEqual([...t.swapLog], ['organizer']);
  assert.equal(t.panelId(), 'organizer');
  assert.equal(t.state.count.textContent, 'Plate 3 of 5.');
});

test('with reduced motion nothing waits: the panel changes at once and no slide gets a transition switch', () => {
  const t = page({ reduced: true });
  t.fire(t.state.next, 'click');
  assert.equal(t.timers.length, 0);
  assert.equal(t.panelId(), 'site');
  assert.ok(!t.state.panel.classList.contains('is-leaving'));
  t.fire(t.state.prev, 'click'); t.fire(t.state.prev, 'click');
  assert.ok(t.state.slides.every((s) => s.styleLog.length === 0), 'transitions are off in the stylesheet, so there is nothing to switch');
  assert.equal(t.panelId(), 'quote-market');
});

test('keys on the slider: the arrows step, Home and End jump to the ends, other keys and modified keys are left alone', () => {
  const t = page();
  let e = t.fire(t.root, 'keydown', { key: 'ArrowRight' });
  assert.ok(e.defaultPrevented); assert.equal(t.api.currentProject(), 1);
  e = t.fire(t.root, 'keydown', { key: 'ArrowLeft' }); assert.equal(t.api.currentProject(), 0);
  t.fire(t.root, 'keydown', { key: 'End' }); assert.equal(t.api.currentProject(), 4);
  t.fire(t.root, 'keydown', { key: 'Home' }); assert.equal(t.api.currentProject(), 0);
  for (const props of [{ key: 'Tab' }, { key: 'Enter' }, { key: 'a' }, { key: 'ArrowRight', ctrlKey: true }, { key: 'ArrowRight', altKey: true }, { key: 'ArrowRight', metaKey: true }]) {
    const x = t.fire(t.root, 'keydown', props);
    assert.ok(!x.defaultPrevented, JSON.stringify(props)); assert.equal(t.api.currentProject(), 0);
  }
});

test('a swipe on the stage: left is next, right is previous, short or vertical drags do nothing, and a swipe is not also a click', () => {
  const t = page();
  const stage = t.state.slides[0].parent;
  const drag = (dx, dy, id = 1) => { t.fire(t.state.slides[0], 'pointerdown', { button: 0, clientX: 300, clientY: 200, pointerId: id }); t.fire(t.state.slides[0], 'pointerup', { clientX: 300 + dx, clientY: 200 + dy, pointerId: id }); };
  drag(-90, 4); assert.equal(t.api.currentProject(), 1);
  drag(90, -4); assert.equal(t.api.currentProject(), 0);
  drag(-30, 0); assert.equal(t.api.currentProject(), 0, 'too short');
  drag(-60, 120); assert.equal(t.api.currentProject(), 0, 'mostly vertical');
  drag(-90, 0, 7); assert.equal(t.api.currentProject(), 1);
  t.fire(t.state.slides[2], 'click');
  assert.equal(t.api.currentProject(), 1, 'the click that ends a swipe is ignored');
  t.flush();
  t.fire(t.state.slides[2], 'click');
  assert.equal(t.api.currentProject(), 2, 'the next real click works');
  t.fire(t.root, 'pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 3 });
  t.fire(t.root, 'pointerup', { clientX: -100, clientY: 0, pointerId: 3 });
  assert.equal(t.api.currentProject(), 2, 'a drag that did not start on the stage is not a swipe');
  assert.ok(stage);
});

test('a cancelled drag, a right-button press and a release from another pointer do nothing', () => {
  const t = page();
  t.fire(t.state.slides[0], 'pointerdown', { button: 0, clientX: 300, clientY: 200, pointerId: 1 });
  t.fire(t.state.slides[0], 'pointercancel', {});
  t.fire(t.state.slides[0], 'pointerup', { clientX: 100, clientY: 200, pointerId: 1 });
  assert.equal(t.api.currentProject(), 0);
  t.fire(t.state.slides[0], 'pointerdown', { button: 2, clientX: 300, clientY: 200, pointerId: 2 });
  t.fire(t.state.slides[0], 'pointerup', { clientX: 100, clientY: 200, pointerId: 2 });
  assert.equal(t.api.currentProject(), 0);
  t.fire(t.state.slides[0], 'pointerdown', { button: 0, clientX: 300, clientY: 200, pointerId: 3 });
  t.fire(t.state.slides[0], 'pointerup', { clientX: 100, clientY: 200, pointerId: 4 });
  assert.equal(t.api.currentProject(), 0);
});

test('initProjectSlider again keeps the selection, renders it, and does not bind the listeners twice', () => {
  const t = page();
  t.fire(t.state.dots[3], 'click'); t.flush();
  t.api.initProjectSlider();
  assert.equal(t.api.currentProject(), 3);
  assert.deepEqual(t.offsets(), [2, -2, -1, 0, 1]);
  assert.equal(t.panelId(), 'broker-markets');
  assert.equal(t.state.count.textContent, 'Plate 4 of 5.');
  t.fire(t.state.next, 'click');
  assert.equal(t.api.currentProject(), 4, 'one click, one step');
});

test('goToProject with an index out of range wraps, and with no slider on the page nothing throws', () => {
  const t = page();
  t.api.goToProject(7); t.flush();
  assert.equal(t.api.currentProject(), 2);
  t.api.goToProject(-1); t.flush();
  assert.equal(t.api.currentProject(), 4);
  const bare = loadClassic('js/projects-slider.js', ['goToProject', 'stepProject', 'initProjectSlider', 'currentProject'], { ...P, document: { getElementById: () => null }, window: {} });
  assert.doesNotThrow(() => { bare.goToProject(1); bare.stepProject(1); bare.initProjectSlider(); });
  assert.equal(bare.currentProject(), 0);
});

test('keys do nothing when focus is on the panel (its link keeps its keys, and focus is never dropped by a swap); the arrows and dots still take them', () => {
  const t = page();
  const inPanel = new El('a', { class: 'pill panel-button' }, t.state.panel);
  for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) {
    const e = t.fire(inPanel, 'keydown', { key });
    assert.ok(!e.defaultPrevented, key + ' is left to the page');
    assert.equal(t.api.currentProject(), 0, key);
  }
  assert.equal(t.timers.length, 0, 'nothing was swapped');
  t.fire(t.state.next, 'keydown', { key: 'ArrowRight' });
  assert.equal(t.api.currentProject(), 1, 'a key on the next arrow works');
  t.fire(t.state.dots[1], 'keydown', { key: 'End' });
  assert.equal(t.api.currentProject(), 4, 'a key on a dot works');
});

test('a drag that began on the stage and was never released does not turn the next press on a dot into a swipe', () => {
  const t = page();
  t.fire(t.state.slides[0], 'pointerdown', { button: 0, clientX: 300, clientY: 200, pointerId: 1 });
  // the button is released outside the slider, so no pointerup reaches it; later the visitor presses a dot
  t.fire(t.state.dots[2], 'pointerdown', { button: 0, clientX: 900, clientY: 700, pointerId: 1 });
  t.fire(t.state.dots[2], 'pointerup', { clientX: 900, clientY: 700, pointerId: 1 });
  t.fire(t.state.dots[2], 'click');
  assert.equal(t.api.currentProject(), 2, 'the dot click is not swallowed');
  t.flush();
});

// ---- the cards follow the finger (owner phone test, 2026-10-26) ----
const down = (t, x = 300, y = 200, id = 1) => t.fire(t.state.slides[0], 'pointerdown', { button: 0, clientX: x, clientY: y, pointerId: id });
const move = (t, x, y = 200, id = 1) => t.fire(t.state.slides[0], 'pointermove', { clientX: x, clientY: y, pointerId: id });
const up = (t, x, y = 200, id = 1) => t.fire(t.state.slides[0], 'pointerup', { clientX: x, clientY: y, pointerId: id });
const dragging = (t) => t.state.track.classList.contains('is-dragging');

test('while a finger drags sideways the row of cards follows it one to one, up to 90% of a card, and the finger is captured', () => {
  const t = page();
  down(t);
  move(t, 296, 201);
  assert.ok(!dragging(t) && t.state.track.style.transform === '', 'a 4 px wobble is a tap, not a drag');
  move(t, 280, 203);
  assert.ok(dragging(t), 'once the finger has clearly gone sideways, the drag begins');
  assert.equal(t.state.track.style.transform, 'translateX(-20px)');
  assert.deepEqual(t.captured, [1], 'the drag is captured so it ends properly even if the finger leaves the slider');
  move(t, 240, 204);
  assert.equal(t.state.track.style.transform, 'translateX(-60px)');
  move(t, 100, 204);
  assert.equal(t.state.track.style.transform, 'translateX(-90px)', 'a very long drag stops at 90% of a card (the fake card is 100 px wide)');
  move(t, 400, 204);
  assert.equal(t.state.track.style.transform, 'translateX(90px)');
  assert.deepEqual(t.captured, [1], 'captured once per drag');
  assert.equal(t.api.currentProject(), 0, 'following a finger changes nothing until it lifts');
});

test('lifting after a long enough drag changes the project, and the row is let go of so it can glide into place', () => {
  const t = page();
  down(t); move(t, 280); move(t, 240);
  up(t, 240);
  assert.equal(t.api.currentProject(), 1);
  assert.ok(!dragging(t), 'the drag class is gone, so the glide transition is back on');
  assert.equal(t.state.track.style.transform, '', 'the row is let go of');
  down(t, 300, 200, 2); move(t, 340, 200, 2); move(t, 380, 200, 2);
  up(t, 380, 200, 2);
  assert.equal(t.api.currentProject(), 0, 'a drag to the right goes back');
  assert.equal(t.state.track.style.transform, '');
});

test('lifting after a short drag snaps back with no change, and the click that ends it still does not select a neighbor', () => {
  const t = page();
  down(t); move(t, 285); move(t, 270);
  assert.equal(t.state.track.style.transform, 'translateX(-30px)');
  up(t, 270);
  assert.equal(t.api.currentProject(), 0, '30 px is under the swipe threshold');
  assert.ok(!dragging(t));
  assert.equal(t.state.track.style.transform, '', 'it snaps back');
  t.fire(t.state.slides[1], 'click');
  assert.equal(t.api.currentProject(), 0, 'the click that ends a drag is not a choice');
});

test('direction lock: the first clear movement decides, sideways or vertical, and the choice holds until the finger lifts', () => {
  // vertical first: a scroll. The row never follows, even if the finger then drifts sideways, and lifting is no swipe.
  const t = page();
  down(t); move(t, 292, 230);
  assert.ok(!dragging(t));
  move(t, 120, 260);
  assert.ok(!dragging(t) && t.state.track.style.transform === '', 'a scroll that drifts sideways does not turn into a drag');
  up(t, 120, 260);
  assert.equal(t.api.currentProject(), 0, 'and does not change the project');
  // sideways first: a drag. It stays a drag, whatever the finger does next.
  down(t, 300, 200, 2); move(t, 280, 202, 2);
  assert.ok(dragging(t));
  move(t, 280, 290, 2);
  assert.equal(t.state.track.style.transform, 'translateX(-20px)', 'it keeps following the sideways part');
  move(t, 240, 330, 2);
  assert.equal(t.state.track.style.transform, 'translateX(-60px)');
  up(t, 240, 330, 2);
  assert.equal(t.api.currentProject(), 1, 'the sideways distance decides, the vertical drift is ignored');
  assert.ok(!dragging(t) && t.state.track.style.transform === '');
});

test('direction lock: nothing is decided until the finger has moved more than 10 px, and an exact diagonal counts as vertical', () => {
  const t = page();
  down(t); move(t, 291, 207);
  assert.ok(!dragging(t), '9 px at most: still undecided');
  move(t, 285, 206);
  assert.ok(dragging(t), 'now 15 px sideways against 6 px down: sideways');
  up(t, 285, 206);
  const u = page();
  down(u); move(u, 288, 212);
  assert.ok(!dragging(u), 'an exact diagonal is not sideways');
});

test('direction lock: while a drag is sideways the page may not scroll (touchmove is cancelled), and a scroll or a tap is never interfered with', () => {
  const t = page();
  assert.equal(t.root.listenerOpts.touchmove.passive, false, 'the touchmove listener must be non-passive or the browser ignores preventDefault');
  const tm = () => t.fire(t.state.slides[0], 'touchmove', { cancelable: true });
  assert.ok(!tm().defaultPrevented, 'no finger down: nothing is cancelled');
  down(t); move(t, 296, 201);
  assert.ok(!tm().defaultPrevented, 'undecided: nothing is cancelled yet');
  move(t, 270, 203);
  assert.ok(tm().defaultPrevented, 'sideways: the page does not scroll');
  assert.ok(!t.fire(t.state.slides[0], 'touchmove', { cancelable: false }).defaultPrevented, 'an event the browser will not let us cancel is left alone');
  up(t, 270, 203);
  assert.ok(!tm().defaultPrevented, 'finger up: scrolling is free again');
  const v = page();
  down(v); move(v, 296, 240);
  assert.ok(!v.fire(v.state.slides[0], 'touchmove', { cancelable: true }).defaultPrevented, 'vertical: the page scrolls');
});

test('a cancelled drag, a stale drag and moves from another finger or with no drag at all leave the row alone', () => {
  const t = page();
  down(t); move(t, 270);
  assert.ok(dragging(t));
  t.fire(t.state.slides[0], 'pointercancel', {});
  assert.ok(!dragging(t) && t.state.track.style.transform === '', 'a cancel (the browser took the gesture for scrolling) lets go');
  move(t, 200);
  assert.ok(!dragging(t), 'a move after the drag ended does nothing');
  down(t, 300, 200, 5); move(t, 270, 200, 5);
  assert.ok(dragging(t));
  move(t, 100, 200, 6);
  assert.equal(t.state.track.style.transform, 'translateX(-30px)', 'another finger is ignored');
  t.fire(t.state.dots[2], 'pointerdown', { button: 0, clientX: 900, clientY: 700, pointerId: 9 });   // the first drag was never released
  assert.ok(!dragging(t) && t.state.track.style.transform === '', 'the next press lets go of a drag nobody finished');
  assert.equal(t.api.currentProject(), 0);
});

test('a plain click or tap with no movement never starts a drag', () => {
  const t = page();
  down(t); up(t, 300);
  assert.ok(!dragging(t));
  assert.equal(t.state.track.style.transform, '');
  assert.deepEqual(t.captured, []);
});
