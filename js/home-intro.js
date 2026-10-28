//= Home intro: the Welcome gate and the opening. Whether it runs at all is decided by the inline script in <head>
// (class "intro" on <html>, set before first paint). The decision helpers below are pure, so Node tests can load this file.

const GLIDE_HANDOFF = false;     // false: the spheres float up and out like balloons (the owner's choice); true glides the cloud onto the banner logo

// The reveal after the release, in ms after the release event. The banner slides down for bannerMs (css/opening.css); at settleAfterMs
// the rest of the page fades in, each item fadeMs long and staggerMs after the one before. finishAt is when the intro classes, the
// curtain and the canvas can go: after the last fade ends, and never before the spheres have finished leaving (1.8 s) plus 400 ms. The css
// repeats these numbers (1200ms, 1.3s, 120ms) and scripts/reveal.test.mjs keeps the two in step.
const REVEAL = { bannerMs: 1200, settleAfterMs: 700, fadeMs: 1300, staggerMs: 120 };
function revealTimings(itemCount){
  const n = Math.max(itemCount, 1);
  const settleAt = REVEAL.settleAfterMs;
  return { settleAt, finishAt: Math.max(2200, settleAt + REVEAL.fadeMs + REVEAL.staggerMs * (n - 1) + 100) };
}

// Frost needs the browser to blur and the gate to run smoothly. Otherwise the plain look.
function chooseGateLook(env){
  if(!env.backdropFilter) return 'plain';
  if(env.fps !== null && env.fps < 30) return 'plain';
  return 'frost';
}

// Frames per second from frame-to-frame gaps in ms. Gaps of 250 ms or more are not slowness, they are a hidden tab or a one-off
// hitch (shader compile), so they are ignored. Too few usable frames means unknown (null), and unknown keeps the frost look.
function fpsFromDeltas(deltas){
  const good = deltas.filter(d => d > 0 && d < 250);
  const total = good.reduce((a, b) => a + b, 0);
  if(good.length < 10 || total < 300) return null;
  return good.length * 1000 / total;
}

// Measures until `ms` of usable frame time has passed (or 4 s of wall time), then resolves with the fps or null.
// In a hidden tab frames do not run: the promise stays pending and callers must not wait for it.
function measureFps(ms){
  return new Promise(resolve => {
    const deltas = []; let last = null, good = 0; const t0 = performance.now();
    (function frame(now){
      if(last !== null){ const d = now - last; deltas.push(d); if(d < 250) good += d; }
      last = now;
      if(good >= ms || now - t0 > 4000) resolve(fpsFromDeltas(deltas));
      else requestAnimationFrame(frame);
    })(t0);
  });
}

// A tab that was hidden for a while mid-opening has lost its place: skip to the page instead of showing a fragment.
function shouldFinishAfterHidden(env){
  return !!(env.started && !env.finished && env.hiddenMs > 1500);
}

// The Home items fade in at the settle with their own animation; without this their load-time fades would run again at the end.
function prepareIntroDom(doc){
  doc.querySelectorAll('#page-home .fade-in').forEach(el => el.classList.remove('fade-in'));
}

const easeInOut2 = p => p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;      // like gsap power2.inOut
function tweenNumber(from, to, ms, ease, step, done){
  const t0 = performance.now();
  (function frame(now){
    const p = Math.min(1, (now - t0) / ms);
    step(from + (to - from) * ease(p));
    if(p < 1) requestAnimationFrame(frame); else if(done) done();
  })(t0);
}

function initIntro(){
  const html = document.documentElement;
  const gate = document.getElementById('gate');
  const enter = document.getElementById('gateEnter');
  const skip = document.getElementById('gateSkip');
  const canvas = document.getElementById('introCanvas');
  const hook = window.__intro = { state: 'gate', look: null };
  let opening = null, started = false, finished = false;
  prepareIntroDom(document);

  const cleanup = () => {
    html.classList.remove('intro', 'intro-release', 'intro-settle');
    ['curtain', 'introCanvas', 'gate'].forEach(id => { const el = document.getElementById(id); if(el) el.remove(); });
  };
  // Show the page, whatever state we are in. Safe to call twice and from any timer.
  function finishNow(){
    if(finished) return; finished = true;
    if(opening){ try{ opening.dispose(); }catch(e){} opening = null; }
    cleanup();
    hook.state = 'done';
  }
  const markSeen = () => { try{ sessionStorage.setItem('mdb-opening', '1'); }catch(e){} };
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'hidden'){ hiddenAt = performance.now(); return; }
    if(hiddenAt && shouldFinishAfterHidden({ hiddenMs: performance.now() - hiddenAt, started, finished })) finishNow();
    hiddenAt = 0;
  });

  // Gate look: frost where the browser can blur, checked again after the first second of real frames.
  const canBlur = !!(window.CSS && (CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)')));
  let look = chooseGateLook({ backdropFilter: canBlur, fps: null });
  const setLook = l => { look = l; gate.dataset.look = l; hook.look = l; };
  setLook(look);
  enter.focus({ preventScroll: true });

  // Start loading the opening right away, so it is ready by the time the visitor clicks. Phones get the lighter tier.
  const tier = (matchMedia('(max-width: 760px)').matches || (navigator.hardwareConcurrency || 8) <= 4) ? 'lite' : 'full';
  let loading = (window.__introFail === true || (location.hostname === 'localhost' && /[?&]failopen\b/.test(location.search)))
    ? Promise.reject(new Error('failopen test hook'))
    : import('../modules/opening.js').then(m => m.createOpening({ canvas, shapeUrl: 'img/logo/mdb-shape.jpg', finish: 'chrome', tier, glide: GLIDE_HANDOFF }));
  loading.catch(() => {});            // handled when the visitor clicks; never an unhandled rejection
  loading.then(async o => {
    if(finished) { o.dispose(); return; }
    opening = o;
    o.setPixelRatio(look === 'frost' ? 0.7 : window.devicePixelRatio);       // a blurred cloud does not need full resolution
    if(look === 'frost'){
      const fps = await measureFps(1000);
      const next = chooseGateLook({ backdropFilter: canBlur, fps });
      if(!started && !finished && next !== look){ setLook(next); o.setPixelRatio(window.devicePixelRatio); }
    }
  }).catch(() => {});

  async function start(){
    if(started || finished) return;
    started = true; markSeen(); hook.state = 'gather';
    setTimeout(() => { if(!finished && hook.state === 'gather' && !(opening && opening.state !== 'gate')) finishNow(); }, 3000);   // module blocked or slow: never strand the visitor
    setTimeout(finishNow, 12000);                                                                                          // a suspended tab: the page is shown regardless
    let o;
    try{ o = await loading; }catch(e){ finishNow(); return; }
    if(finished) return;
    opening = o; hook.opening = o;            // exposed for tests and the browser console
    o.on('release', () => {
      if(finished) return;
      hook.state = 'release'; html.classList.add('intro-release');         // the banner slides down; the curtain lifts onto the real page
      if(GLIDE_HANDOFF){                         // the same spheres shrink and glide onto the banner logo, then fade into it
        const logo = document.getElementById('logoImg');
        if(logo){ const r = logo.getBoundingClientRect(); o.glideTo({ x: r.left, y: r.top, width: r.width, height: r.height }, 0.9); }
      }
      // then everything else fades in where it stands, in document order, and the intro goes once the last fade has ended
      const items = [...document.querySelectorAll('[data-reveal]')];
      const when = revealTimings(items.length);
      setTimeout(() => {
        if(finished) return;
        items.forEach((el, i) => el.style.setProperty('--i', i));
        hook.state = 'settle'; html.classList.add('intro-settle');
      }, when.settleAt);
      setTimeout(finishNow, when.finishAt);
    });
    o.setPixelRatio(window.devicePixelRatio);
    o.start();
    if(look === 'frost'){
      tweenNumber(-20, 150, 1500, easeInOut2, v => gate.style.setProperty('--r', v));
      setTimeout(() => { gate.style.transition = 'opacity .4s'; gate.style.opacity = '0'; }, 1300);
    } else {
      gate.style.transition = 'opacity .5s'; gate.style.opacity = '0';
    }
    setTimeout(() => { if(gate) gate.style.pointerEvents = 'none'; }, 1700);
    // any click, tap, scroll or key during the gather or the hold jumps to the release
    ['pointerdown', 'wheel', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, () => { if(opening) opening.skipToRelease(); }, { passive: true }));
  }

  enter.addEventListener('click', start);
  skip.addEventListener('click', () => { markSeen(); finishNow(); });
}

if(typeof document !== 'undefined' && document.documentElement.classList.contains('intro')) initIntro();
