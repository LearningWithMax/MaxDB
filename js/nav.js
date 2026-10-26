//= Page routing (hash), logo long-press theme toggle, home count-up stats.

let countUpRunning = false;
const vlogPageNames = { home:'Home', cv:'CV', projects:'Projects', trip:'Trip' };
let vlogFirstLoad = true;
let suppressHashChange = false;
// The split-flap board is an ES module, loaded the first time the CV opens. The path is relative to this script (js/).
let boardMount = null;
function ensureBoard(){
  const host = document.getElementById('cvBoard');
  if(boardMount || !host) return;
  boardMount = import('../modules/board.js').then(m => m.mountBoard(host)).catch(e => console.error('board:', e));
}
// goTo('cv') keeps the lens the visitor already chose; goTo('cv', 'ops') sets it; goTo('projects', undefined, false, 'site') opens
// that project's case view. Routes are parsed by route.js.
function goTo(page, lens, fromHash, project){
  if(lens === undefined && page === 'cv' && window.getLens) lens = getLens();
  const route = parseRoute(buildHash(page, lens, project));
  page = route.page; lens = route.lens;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  document.querySelectorAll('.navlinks button').forEach(b=>b.classList.toggle('active', b.dataset.page===page));
  const wanted = buildHash(page, lens, project);
  const action = hashAction(window.location.hash, wanted, !!fromHash);
  if(action === 'replace') window.history.replaceState(null, '', wanted);
  else if(action === 'push'){
    suppressHashChange = true;
    window.location.hash = wanted;
  }
  if(page === 'cv' && window.setLens) setLens(lens);
  if(page === 'cv') ensureBoard();
  if(page === 'projects' && window.setProjectView) setProjectView(project || null);
  if(page === 'trip' && window.mountTrip) mountTrip(); else if(window.disposeTrip) disposeTrip();      // the globe lives only while #trip is shown
  window.scrollTo({top:0, behavior:'instant'});
  if(page === 'home') runCountUp();
  logVlogEvent((vlogFirstLoad ? 'Landed on ' : 'Opened ') + vlogPageNames[page]);
  vlogFirstLoad = false;
}

function initFromHash(){
  if(suppressHashChange){ suppressHashChange = false; return; }
  const r = parseRoute(window.location.hash);
  goTo(r.page, r.lens, true, parseProject(window.location.hash));
}
window.addEventListener('hashchange', initFromHash);
initFromHash();

// ---------- Logo: click to go home, 2s long-press to toggle theme ----------
(function(){
  const logo = document.getElementById('logoTrigger');
  const ring = logo.querySelector('.logo-ring circle');
  const HOLD_MS = 2000;
  const RING_LEN = 2 * Math.PI * 20; // circumference for r=20
  ring.style.strokeDasharray = RING_LEN;
  ring.style.strokeDashoffset = RING_LEN;

  let pressTimer = null, rafId = null, pressStart = 0, longPressFired = false;

  function setRing(progress){
    ring.style.strokeDashoffset = RING_LEN * (1 - progress);
  }
  function tickRing(){
    const elapsed = performance.now() - pressStart;
    const progress = Math.min(1, elapsed / HOLD_MS);
    setRing(progress);
    if(progress < 1){
      rafId = requestAnimationFrame(tickRing);
    }
  }
  function startPress(){
    longPressFired = false;
    pressStart = performance.now();
    rafId = requestAnimationFrame(tickRing);
    pressTimer = setTimeout(()=>{
      longPressFired = true;
      toggleTheme();
      ring.style.transition = 'stroke-dashoffset .15s ease';
      setRing(0);
      setTimeout(()=>{
        ring.style.transition = '';
        setRing(0);
        ring.style.strokeDashoffset = RING_LEN;
      }, 500);
    }, HOLD_MS);
  }
  function endPress(){
    clearTimeout(pressTimer);
    if(rafId) cancelAnimationFrame(rafId);
    if(!longPressFired){
      ring.style.transition = 'stroke-dashoffset .2s ease';
      setRing(0);
      setTimeout(()=>{ ring.style.transition = ''; }, 220);
      goTo('home');
    }
  }
  function cancelPress(){
    clearTimeout(pressTimer);
    if(rafId) cancelAnimationFrame(rafId);
    if(!longPressFired){
      ring.style.transition = 'stroke-dashoffset .2s ease';
      setRing(0);
    }
  }

  logo.addEventListener('pointerdown', (e)=>{
    logo.setPointerCapture(e.pointerId);
    startPress();
  });
  logo.addEventListener('pointerup', endPress);
  logo.addEventListener('pointercancel', cancelPress);
  logo.addEventListener('contextmenu', (e)=>e.preventDefault());
  logo.addEventListener('keydown', (e)=>{ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); goTo('home'); } });   // keyboard: the logo is a link home
})();

// ---------- Count-up stats ----------
function runCountUp(){
  if(countUpRunning) return;
  countUpRunning = true;
  const duration = 1400;
  const nums = document.querySelectorAll('.stat .num');
  nums.forEach(el=>{ el.textContent = '0'; });
  const start = performance.now();
  function tick(now){
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    nums.forEach(el=>{
      const since = el.getAttribute('data-since');                    // a start month, for a stat that counts years: always right
      const target = since ? yearsSince(since, new Date()) : parseInt(el.getAttribute('data-count'), 10);
      const suffix = el.getAttribute('data-suffix') || '';
      el.textContent = Math.round(eased * target) + suffix;
    });
    if(p < 1) requestAnimationFrame(tick);
    else countUpRunning = false;
  }
  requestAnimationFrame(tick);
}
