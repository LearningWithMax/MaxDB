//= The Trip page's globe: built on the first visit to #trip, removed when the visitor leaves, and replaced by the flat map and the stop
// list if it cannot load. Loaded after projects.js and before nav.js; nav.js calls mountTrip and disposeTrip from goTo.
// The globe itself is an ES module (modules/globe.js, Fable's) loaded on demand with import(); this file never imports it up front.

// deps = { load(), host(), setState(state, message), lite(), log(message), follow(host)? }. follow starts the route list following the plane and returns a function that stops it. The page state is 'off' (the flat map and the stop list
// show, the default markup), 'loading' (the globe window shows a message) or 'on'. Pure of the DOM, so Node tests can run it.
function createTripLifecycle(deps){
  let controller = null, mounting = null, wanted = false, unfollow = null;

  function mount(){
    wanted = true;                                            // the latest intent wins: a quick trip, home, trip keeps the globe
    if(controller) return Promise.resolve();
    deps.setState('loading', 'Loading the globe');
    if(mounting) return mounting;                             // one mount at a time
    mounting = (async () => {
      try{
        const m = await deps.load();
        if(!wanted) return;                                   // the visitor left while the module loaded
        const host = deps.host();
        if(!host) throw new Error('the Trip page has no globe host');
        const c = await m.mountGlobe(host, { stops: m.stops, tailLogoUrl: 'img/logo/chrome-banner.webp', countriesUrl: 'vendor/data/countries-110m.json', lite: deps.lite() });
        if(!wanted){ c.dispose(); return; }                   // the visitor left while the globe was being built
        controller = c;
        if(deps.follow){                                      // a broken follower must never cost the visitor the globe
          try{ unfollow = deps.follow(host) || null; }
          catch(e){ deps.log('Trip route list will not follow the plane: ' + (e && e.message ? e.message : e)); }
        }
        deps.setState('on', '');
      }catch(e){
        controller = null;
        deps.log('Trip globe unavailable, showing the map: ' + (e && e.message ? e.message : e));
        deps.setState('off', '');
      }finally{
        mounting = null;
      }
    })();
    return mounting;
  }

  function dispose(){
    wanted = false;
    if(unfollow){ try{ unfollow(); }catch(e){} unfollow = null; }
    if(controller){ try{ controller.dispose(); }catch(e){} controller = null; }
    deps.setState('off', '');
  }

  return { mount: mount, dispose: dispose };
}

// The globe's route list (a strip that scrolls sideways on a phone, a tall list on a wide screen) highlights the stop the plane is at, but
// nothing moved the strip, so after the first few stops the highlight sat off screen. legendScrollTarget says where to scroll so the
// highlighted stop is centered, never past either end. view and item are in the list's own scroll coordinates.
function legendScrollTarget(view, item){
  const within = (v, max) => Math.max(0, Math.min(v, Math.max(0, max)));
  return {
    left: within(item.left + item.w / 2 - view.w / 2, view.scrollW - view.w),
    top: within(item.top + item.h / 2 - view.h / 2, view.scrollH - view.h),
  };
}

// How long the route list takes to glide to the next highlighted stop, in milliseconds. The browser's own smooth scroll lasts about half a
// second and cannot be slowed, so the glide is drawn here. Raise the number for a lazier glide, lower it for a quicker one.
const TRIP_FOLLOW_MS = 1200;

// Ease in and out (slow, quicker, slow), p and the result run from 0 to 1.
function tripEase(p){ return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }

// Watches the route list's classes (the globe toggles .is-on on the current stop) and glides that stop into the middle, once per move.
// Moves the list only, never the page. A glide that is still running carries on from where the list is. Touching or wheeling the list stops
// the glide so the visitor is never fought. Visitors who asked for reduced motion get a jump. Returns a function that stops everything.
// env is for tests: { MutationObserver, reducedMotion(), now(), raf(cb), caf(id), duration }.
function tripFollowStop(host, env){
  const e = env || {};
  const MO = 'MutationObserver' in e ? e.MutationObserver : (typeof MutationObserver === 'undefined' ? undefined : MutationObserver);
  const reduced = e.reducedMotion || (() => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches));
  const now = e.now || (() => performance.now());
  const raf = e.raf || (cb => requestAnimationFrame(cb));
  const caf = e.caf || (id => cancelAnimationFrame(id));
  const ms = e.duration || TRIP_FOLLOW_MS;
  const legend = host && host.querySelector ? host.querySelector('.globe-legend') : null;
  if(!legend || !MO) return function(){};
  let last = null, frame = 0, glide = null;

  function halt(){ if(frame){ caf(frame); frame = 0; } glide = null; }

  function step(){
    frame = 0;
    if(!glide) return;
    const p = Math.min(1, Math.max(0, (now() - glide.t0) / ms)), k = tripEase(p);
    legend.scrollLeft = glide.fromL + (glide.toL - glide.fromL) * k;
    legend.scrollTop = glide.fromT + (glide.toT - glide.fromT) * k;
    if(p < 1) frame = raf(step); else glide = null;
  }

  function sync(){
    const btn = legend.querySelector('.globe-stop-btn.is-on');
    if(!btn || btn === last) return;
    last = btn;
    const to = legendScrollTarget(
      { w: legend.clientWidth, h: legend.clientHeight, scrollW: legend.scrollWidth, scrollH: legend.scrollHeight },
      { left: btn.offsetLeft, top: btn.offsetTop, w: btn.offsetWidth, h: btn.offsetHeight });
    halt();
    if(reduced()){ legend.scrollTo({ left: to.left, top: to.top, behavior: 'auto' }); return; }
    glide = { t0: now(), fromL: legend.scrollLeft, fromT: legend.scrollTop, toL: to.left, toT: to.top };
    frame = raf(step);
  }

  const touches = ['touchstart', 'pointerdown', 'wheel'];
  if(legend.addEventListener) touches.forEach(type => legend.addEventListener(type, halt, { passive: true }));
  const mo = new MO(sync);
  mo.observe(legend, { subtree: true, attributes: true, attributeFilter: ['class'] });
  sync();
  return function(){
    mo.disconnect();
    halt();
    if(legend.removeEventListener) touches.forEach(type => legend.removeEventListener(type, halt));
  };
}

// Phones and weak machines get the lighter globe (the rule the opening uses).
function tripLite(){
  return !!((window.matchMedia && matchMedia('(max-width: 760px)').matches) || (navigator.hardwareConcurrency || 8) <= 4);
}

function tripSetState(state, message){
  const page = document.getElementById('page-trip');
  if(page) page.setAttribute('data-globe', state);
  const msg = document.getElementById('tripMsg');
  if(msg) msg.textContent = message || '';
}

// On localhost, /?failglobe#trip forces the failure path, like the opening's failopen.
function tripLoad(){
  if(location.hostname === 'localhost' && /[?&]failglobe\b/.test(location.search)) return Promise.reject(new Error('failglobe test hook'));
  return Promise.all([import('../modules/globe.js'), import('../modules/trip-stops.js')]).then(pair => ({ mountGlobe: pair[0].mountGlobe, stops: pair[1].TRIP_STOPS }));
}

const tripLifecycle = typeof document === 'undefined' ? null : createTripLifecycle({
  load: tripLoad,
  host: () => document.getElementById('tripGlobe'),
  setState: tripSetState,
  lite: tripLite,
  follow: tripFollowStop,
  log: message => console.warn(message),
});

function mountTrip(){ return tripLifecycle ? tripLifecycle.mount() : Promise.resolve(); }
function disposeTrip(){ if(tripLifecycle) tripLifecycle.dispose(); }
