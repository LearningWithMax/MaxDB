import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadClassic } from './lib/load-classic.mjs';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const { createTripLifecycle } = loadClassic('js/trip.js', ['createTripLifecycle']);

// A fake globe module: every mountGlobe call makes a controller we can inspect.
function setup(over = {}) {
  const calls = [], states = [], logs = [], controllers = [];
  const mountGlobe = over.mountGlobe || (async (host, opts) => {
    calls.push({ host, opts });
    const c = { disposed: false, dispose() { c.disposed = true; } };
    controllers.push(c);
    return c;
  });
  const deps = {
    load: over.load || (() => Promise.resolve({ mountGlobe, stops: ['the stops'] })),
    host: over.host || (() => ({ name: 'host' })),
    setState: (s) => states.push(s),
    lite: () => !!over.lite,
    log: (m) => logs.push(m),
  };
  return { life: createTripLifecycle(deps), calls, states, logs, controllers, mountGlobe };
}
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const plain = (x) => JSON.parse(JSON.stringify(x));

test('a mount goes loading, then on, and gives the globe the site\'s stops, the chrome logo, the country file and the phone setting', async () => {
  const t = setup({ lite: true });
  await t.life.mount();
  assert.deepEqual([...t.states], ['loading', 'on']);
  assert.equal(t.calls.length, 1);
  assert.deepEqual(plain(t.calls[0].opts), { stops: ['the stops'], tailLogoUrl: 'img/logo/chrome-banner.webp', countriesUrl: 'vendor/data/countries-110m.json', lite: true });
  assert.equal(t.logs.length, 0);
});

test('only one mount at a time: a second call during the first, and one after it, do not build another globe', async () => {
  const t = setup();
  const a = t.life.mount(), b = t.life.mount();
  await Promise.all([a, b]);
  await t.life.mount();
  assert.equal(t.calls.length, 1);
  assert.equal(t.controllers.filter((c) => !c.disposed).length, 1);
});

test('leaving disposes the globe and ends at off; coming back builds a fresh one', async () => {
  const t = setup();
  await t.life.mount();
  t.life.dispose();
  assert.equal(t.controllers[0].disposed, true);
  assert.equal([...t.states].at(-1), 'off');
  await t.life.mount();
  assert.equal(t.calls.length, 2);
  assert.equal(t.controllers[1].disposed, false);
  assert.equal([...t.states].at(-1), 'on');
});

test('leaving before the module has loaded: no globe is ever built and the state ends at off', async () => {
  const d = deferred();
  const t = setup({ load: () => d.promise });
  const p = t.life.mount();
  t.life.dispose();
  d.resolve({ mountGlobe: t.mountGlobe, stops: [] });
  await p;
  assert.equal(t.calls.length, 0);
  assert.equal([...t.states].at(-1), 'off');
});

test('leaving while the globe is being built: it is disposed the moment it exists, and the state is never left at on', async () => {
  const d = deferred();
  const t = setup({ mountGlobe: () => d.promise });
  const p = t.life.mount();
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  t.life.dispose();
  const c = { disposed: false, dispose() { c.disposed = true; } };
  d.resolve(c);
  await p;
  assert.equal(c.disposed, true);
  assert.equal([...t.states].at(-1), 'off');
  assert.ok(![...t.states].slice([...t.states].lastIndexOf('off')).includes('on'));
});

test('trip, home, trip in quick succession: exactly one globe stays alive and the state ends at on', async () => {
  const t = setup();
  const a = t.life.mount();
  t.life.dispose();
  const b = t.life.mount();
  await Promise.all([a, b]);
  assert.equal(t.controllers.filter((c) => !c.disposed).length, 1);
  assert.equal([...t.states].at(-1), 'on');
});

test('any failure ends at off with one log line and no globe: the load rejecting, mountGlobe throwing, a missing host', async () => {
  for (const [name, over] of [
    ['the module cannot load', { load: () => Promise.reject(new Error('no module')) }],
    ['WebGL is missing', { mountGlobe: async () => { throw new Error('no WebGL'); } }],
    ['there is no host', { host: () => null }],
  ]) {
    const t = setup(over);
    await t.life.mount();
    assert.equal([...t.states].at(-1), 'off', name);
    assert.equal(t.logs.length, 1, name);
    assert.equal(t.controllers.filter((c) => !c.disposed).length, 0, name);
  }
});

test('after a failure a later visit tries again', async () => {
  let fail = true;
  const t = setup({ load: () => (fail ? Promise.reject(new Error('flaky')) : Promise.resolve({ mountGlobe: async () => ({ dispose() {} }), stops: [] })) });
  await t.life.mount();
  assert.equal([...t.states].at(-1), 'off');
  fail = false;
  await t.life.mount();
  assert.equal([...t.states].at(-1), 'on');
});

test('js/trip.js is a classic script that loads the modules on demand, and the failure hook only works on localhost', () => {
  const js = read('js/trip.js');
  assert.doesNotMatch(js, /^\s*import\s/m, 'no static import in a classic script');
  assert.match(js, /import\('\.\.\/modules\/globe\.js'\)/);
  assert.match(js, /import\('\.\.\/modules\/trip-stops\.js'\)/);
  assert.match(js, /location\.hostname === 'localhost'[^\n]*failglobe/);
  assert.match(js, /\(max-width: 760px\)/);
  assert.match(js, /hardwareConcurrency/);
});

test('nav.js mounts the globe on the Trip page and removes it on every other page', () => {
  assert.match(read('js/nav.js'), /if\(page === 'trip' && window\.mountTrip\) mountTrip\(\); else if\(window\.disposeTrip\) disposeTrip\(\);/);
});

test('index.html loads trip.js after projects.js and before nav.js', () => {
  const html = read('index.html');
  const at = (n) => html.indexOf(`<script src="js/${n}.js"></script>`);
  assert.ok(at('projects') > 0 && at('projects') < at('trip') && at('trip') < at('nav'));
});

// ---- the route list follows the plane: the highlighted stop is always in view (owner phone test, 2026-10-26) ----
// On a phone the globe's route list is a strip that scrolls sideways; the globe highlights the stop the plane is at, but nothing moved the strip,
// so after the first few stops the highlight was off screen. js/trip.js now scrolls the strip (or the list, on a wide screen) to the highlighted stop.
const { legendScrollTarget, tripFollowStop, tripEase, TRIP_FOLLOW_MS } = loadClassic('js/trip.js', ['legendScrollTarget', 'tripFollowStop', 'tripEase', 'TRIP_FOLLOW_MS']);

test('legendScrollTarget centers the highlighted stop in a sideways strip and never scrolls past either end', () => {
  const view = { w: 300, h: 56, scrollW: 1000, scrollH: 56 };
  assert.deepEqual(plain(legendScrollTarget(view, { left: 600, top: 6, w: 80, h: 44 })), { left: 490, top: 0 });
  assert.deepEqual(plain(legendScrollTarget(view, { left: 10, top: 6, w: 80, h: 44 })), { left: 0, top: 0 }, 'the first stops stay at the start');
  assert.deepEqual(plain(legendScrollTarget(view, { left: 950, top: 6, w: 50, h: 44 })), { left: 700, top: 0 }, 'the last stops stay at the end');
});

test('legendScrollTarget does nothing when the list does not overflow, and centers vertically in a tall list', () => {
  assert.deepEqual(plain(legendScrollTarget({ w: 236, h: 600, scrollW: 236, scrollH: 560 }, { left: 6, top: 300, w: 224, h: 50 })), { left: 0, top: 0 });
  assert.deepEqual(plain(legendScrollTarget({ w: 236, h: 300, scrollW: 236, scrollH: 600 }, { left: 6, top: 400, w: 224, h: 50 })), { left: 0, top: 275 });
});

// A fake list: buttons with a position, one of them highlighted. The observer, the clock and the animation frames are all driven by the test.
function fakeFollow({ reduce = false } = {}) {
  const scrollTos = [], listeners = {}, removed = [], cancelled = [];
  let fire = null, disconnected = false, observed = null, clock = 0, pending = null, nextId = 1;
  const btns = [10, 100, 190, 280, 370, 460, 550, 640, 730, 820, 910].map((left) => ({ offsetLeft: left, offsetTop: 6, offsetWidth: 80, offsetHeight: 44, on: false }));
  const legend = {
    clientWidth: 300, clientHeight: 56, scrollWidth: 1000, scrollHeight: 56, scrollLeft: 0, scrollTop: 0,
    scrollTo(o) { scrollTos.push(plain(o)); legend.scrollLeft = o.left; legend.scrollTop = o.top; },
    addEventListener(type, fn) { listeners[type] = fn; },
    removeEventListener(type) { removed.push(type); },
    querySelector(sel) { assert.equal(sel, '.globe-stop-btn.is-on'); return btns.find((b) => b.on) || null; },
  };
  const host = { querySelector(sel) { assert.equal(sel, '.globe-legend'); return legend; } };
  class MO { constructor(cb) { fire = cb; } observe(node, opts) { observed = { node, opts: plain(opts) }; } disconnect() { disconnected = true; } }
  const env = {
    MutationObserver: MO, reducedMotion: () => reduce,
    now: () => clock,
    raf: (cb) => { pending = { id: nextId++, cb }; return pending.id; },
    caf: (id) => { cancelled.push(id); if (pending && pending.id === id) pending = null; },
  };
  // run the one waiting animation frame at time ms; returns whether a frame was run
  const frameAt = (ms) => { clock = ms; if (!pending) return false; const p = pending; pending = null; p.cb(); return true; };
  return { host, env, btns, legend, scrollTos, listeners, removed, cancelled, fire: () => fire([]), frameAt, setClock: (ms) => { clock = ms; },
    get waiting() { return !!pending; }, get disconnected() { return disconnected; }, get observed() { return observed; } };
}

test('the glide is slow: longer than the browser own smooth scroll (about half a second), eased at both ends', () => {
  assert.ok(TRIP_FOLLOW_MS >= 1000 && TRIP_FOLLOW_MS <= 2000, 'a gentle glide, not a snap and not a crawl: ' + TRIP_FOLLOW_MS);
  assert.equal(tripEase(0), 0);
  assert.equal(tripEase(1), 1);
  assert.equal(tripEase(0.5), 0.5);
  assert.ok(tripEase(0.25) < 0.25 && tripEase(0.75) > 0.75, 'slow at the start and at the end');
  let prev = -1;
  for (let i = 0; i <= 20; i++) { const v = tripEase(i / 20); assert.ok(v >= prev, 'never goes backwards'); prev = v; }
});

test('tripFollowStop glides to the highlighted stop over TRIP_FOLLOW_MS, from where the list is now, easing in and out', () => {
  const f = fakeFollow();
  tripFollowStop(f.host, f.env);
  assert.deepEqual(f.observed.opts, { subtree: true, attributes: true, attributeFilter: ['class'] });
  assert.equal(f.observed.node, f.legend);
  assert.equal(f.waiting, false, 'nothing highlighted yet, nothing to animate');
  f.btns[6].on = true; f.fire();                            // the target is 440 (stop 7 centered)
  assert.equal(f.legend.scrollLeft, 0, 'it does not jump');
  assert.equal(f.scrollTos.length, 0, 'and it does not use the browser quick smooth scroll');
  assert.equal(f.waiting, true);
  f.frameAt(0);              assert.equal(f.legend.scrollLeft, 0);
  f.frameAt(TRIP_FOLLOW_MS / 4); assert.ok(f.legend.scrollLeft > 0 && f.legend.scrollLeft < 110, 'a quarter of the time, less than a quarter of the way: ' + f.legend.scrollLeft);
  f.frameAt(TRIP_FOLLOW_MS / 2); assert.equal(f.legend.scrollLeft, 220, 'half the time, half the way');
  f.frameAt(TRIP_FOLLOW_MS * 0.9); assert.ok(f.legend.scrollLeft > 400 && f.legend.scrollLeft < 440);
  assert.equal(f.frameAt(TRIP_FOLLOW_MS), true);
  assert.equal(f.legend.scrollLeft, 440, 'arrives exactly');
  assert.equal(f.waiting, false, 'and stops asking for frames');
  assert.equal(f.legend.scrollTop, 0);
});

test('the same highlight does not restart the glide (the globe changes classes every frame it moves)', () => {
  const f = fakeFollow();
  tripFollowStop(f.host, f.env);
  f.btns[6].on = true; f.fire();
  f.frameAt(100);
  const before = f.legend.scrollLeft;
  f.fire(); f.fire();
  f.frameAt(200);
  assert.ok(f.legend.scrollLeft > before, 'the glide carried on from where it was');
  f.frameAt(TRIP_FOLLOW_MS);
  assert.equal(f.legend.scrollLeft, 440);
});

test('a new highlight in the middle of a glide carries on from the current position, no jump back', () => {
  const f = fakeFollow();
  tripFollowStop(f.host, f.env);
  f.btns[6].on = true; f.fire();
  f.frameAt(TRIP_FOLLOW_MS / 2);
  assert.equal(f.legend.scrollLeft, 220);
  f.btns[6].on = false; f.btns[7].on = true; f.fire();       // the next stop: target 530
  assert.equal(f.legend.scrollLeft, 220, 'it stays where it is');
  assert.ok(f.cancelled.length >= 1, 'the old glide was cancelled');
  f.frameAt(TRIP_FOLLOW_MS / 2);                             // the new glide starts at this time
  assert.equal(f.legend.scrollLeft, 220);
  f.frameAt(TRIP_FOLLOW_MS / 2 + TRIP_FOLLOW_MS);
  assert.equal(f.legend.scrollLeft, 530);
});

test('touching or wheeling the list stops the glide, so the visitor and the page never fight; the next stop glides again', () => {
  const f = fakeFollow();
  tripFollowStop(f.host, f.env);
  for (const type of ['touchstart', 'pointerdown', 'wheel']) assert.equal(typeof f.listeners[type], 'function', type + ' is watched');
  f.btns[6].on = true; f.fire();
  f.frameAt(TRIP_FOLLOW_MS / 4);
  const where = f.legend.scrollLeft;
  f.listeners.touchstart();
  assert.equal(f.waiting, false, 'no more frames after a touch');
  f.legend.scrollLeft = where + 50;                          // the visitor dragged it
  f.btns[6].on = false; f.btns[8].on = true; f.fire();
  assert.equal(f.waiting, true, 'the next highlight glides again');
});

test('tripFollowStop jumps instead of gliding for visitors who asked for reduced motion, and syncs at once if a stop is already highlighted', () => {
  const f = fakeFollow({ reduce: true });
  f.btns[3].on = true;
  tripFollowStop(f.host, f.env);
  assert.deepEqual(f.scrollTos, [{ left: 170, top: 0, behavior: 'auto' }]);
  assert.equal(f.waiting, false);
});

test('the cleanup stops watching, cancels a waiting frame and lets go of the touch listeners', () => {
  const f = fakeFollow();
  const stop = tripFollowStop(f.host, f.env);
  f.btns[2].on = true; f.fire();
  assert.equal(f.waiting, true);
  stop();
  assert.equal(f.disconnected, true);
  assert.equal(f.waiting, false);
  assert.deepEqual([...f.removed].sort(), ['pointerdown', 'touchstart', 'wheel']);
});

test('tripFollowStop is harmless when the globe has no route list or no MutationObserver', () => {
  const none = tripFollowStop({ querySelector: () => null }, { MutationObserver: class { observe() { throw new Error('should not observe'); } }, reducedMotion: () => false });
  assert.equal(typeof none, 'function');
  none();
  const noMO = tripFollowStop(fakeFollow().host, { MutationObserver: undefined, reducedMotion: () => false });
  assert.equal(typeof noMO, 'function');
  noMO();
});

test('the lifecycle starts following once the globe exists and stops when the visitor leaves; a failing follower never costs the globe', async () => {
  const followed = [], stopped = [];
  const t = setup();
  const life = createTripLifecycle({
    load: () => Promise.resolve({ mountGlobe: t.mountGlobe, stops: ['the stops'] }), host: () => ({ name: 'host' }), setState: (s) => t.states.push(s), lite: () => false, log: (m) => t.logs.push(m),
    follow: (host) => { followed.push(host.name); return () => stopped.push('stopped'); },
  });
  await life.mount();
  assert.deepEqual(followed, ['host']);
  assert.deepEqual(stopped, []);
  life.dispose();
  assert.deepEqual(stopped, ['stopped']);
  const boom = createTripLifecycle({
    load: () => Promise.resolve({ mountGlobe: t.mountGlobe, stops: [] }), host: () => ({ name: 'host' }), setState: (s) => t.states.push(s), lite: () => false, log: (m) => t.logs.push(m),
    follow: () => { throw new Error('follow broke'); },
  });
  await boom.mount();
  assert.equal([...t.states].at(-1), 'on', 'the globe stays on');
  assert.ok(t.logs.some((m) => /follow broke/.test(m)), 'and the problem is logged');
});

test('js/trip.js hands the follower to the lifecycle', () => {
  assert.match(read('js/trip.js'), /follow:\s*tripFollowStop/);
});
