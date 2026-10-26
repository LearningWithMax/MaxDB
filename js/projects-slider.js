//= The Projects slider: which slide sits where, how a step wraps, what counts as a swipe, and (below) the wiring of the page.
// Loaded after projects.js, which holds the data and the HTML builders, and before nav.js.

// The signed distance of every slide from the selected one, around the circle. The selected slide is 0, its neighbors are -1 and +1.
// An odd count is symmetric; an even count puts the one extra slide on the right (4 slides: -1, 0, 1, 2). A selection outside 0..count-1 wraps.
function slideOffsets(count, selected){
  const n = Math.max(0, Math.floor(count));
  if(!n) return [];
  const sel = ((Math.floor(selected) % n) + n) % n, half = Math.floor(n / 2);
  const out = [];
  for(let i = 0; i < n; i++){
    const d = ((i - sel) % n + n) % n;
    out.push(d <= half ? d : d - n);
  }
  return out;
}

// The index after moving `delta` slides from `index`, wrapping both ways. No slides gives 0.
function stepIndex(count, index, delta){
  const n = Math.floor(count);
  if(!(n > 0)) return 0;
  return (((Math.floor(index) + Math.floor(delta)) % n) + n) % n;
}

// What a finger or mouse drag means: 1 (next) for a swipe left, -1 (previous) for a swipe right, 0 for anything else. Only a mostly
// horizontal move of at least `threshold` pixels counts, so a vertical scroll that drifts sideways does not change the project.
function swipeDirection(dx, dy, threshold){
  const t = threshold === undefined ? 45 : threshold;
  if(Math.abs(dx) < t || !(Math.abs(dx) > Math.abs(dy))) return 0;
  return dx < 0 ? 1 : -1;
}

// While a finger or mouse drags the row of cards, they follow it one to one. A long drag stops at 90% of a card's width, so the row
// resists instead of running away. The first time the finger has moved more than this many pixels, its direction is decided: more
// sideways than vertical is a drag of the cards, anything else is a scroll of the page. The choice holds until the finger lifts.
const DRAG_LOCK = 10;
function dragOffset(dx, width){
  const max = Math.max(0, width) * 0.9;
  return Math.max(-max, Math.min(max, dx));
}

// What changes when the selection moves from `from` to `to`: the new offsets, the direction of the short way round (1 forward, -1 back,
// 0 for no change), and the slides that must jump (no transition). Moving forward, every card slides to the left; a card that would
// slide the other way is wrapping around behind the others and would otherwise fly across the middle of the stage, so it jumps. With two
// projects the cards simply swap places, so nothing jumps.
function slidePlan(count, from, to){
  const before = slideOffsets(count, from), offsets = slideOffsets(count, to);
  const dir = offsets.length ? Math.sign(before[stepIndex(count, to, 0)]) || 0 : 0;
  const jumps = [];
  if(offsets.length > 2) offsets.forEach((o, i) => { if((o - before[i]) * dir > 0) jumps.push(i); });
  return { dir, offsets, jumps };
}

// The index a key asks for, or null when the key means nothing to the slider: the arrows step, Home and End go to the ends.
function indexForKey(key, count, current){
  if(!(count > 0)) return null;
  if(key === 'ArrowLeft') return stepIndex(count, current, -1);
  if(key === 'ArrowRight') return stepIndex(count, current, 1);
  if(key === 'Home') return 0;
  if(key === 'End') return count - 1;
  return null;
}

// ---------- HTML builders: pure string functions, so Node tests can check the markup ----------
// One slide: the picture of a project in its frame, and where it sits (data-offset, 0 is the selected one). Only the selected slide is
// read by screen readers; the others are there to be seen and to be clicked.
function slideHtml(p, index, offset){
  const hidden = offset === 0 ? '' : ' aria-hidden="true"';
  return '<div class="slide" data-index="' + index + '" data-offset="' + offset + '" data-id="' + escapeHtml(p.id) + '"' + hidden + '>' +
    '<div class="slide-frame">' + visualHtml(p) + '</div></div>';
}

// The whole slider for the selected index (wrapped into range): the stage with its arrows, then the dots and the plate counter, then the
// selected project's panel. With one project there is nothing to move between, so no arrows, dots or counter. No projects, no slider.
function sliderHtml(list, selected){
  const items = filterProjects(list, 'all');
  const n = items.length;
  if(!n) return '';
  const sel = stepIndex(n, selected, 0), offsets = slideOffsets(n, sel), many = n > 1;
  const chevron = d => '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="' + d + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const arrow = (dir, label, d) => many ? '<button class="slider-arrow slider-' + dir + '" type="button" aria-label="' + label + '">' + chevron(d) + '</button>' : '';
  const dots = items.map((p, i) => '<button class="slider-dot" type="button" data-index="' + i + '" aria-label="Show ' + escapeHtml(p.title) + '"' + (i === sel ? ' aria-current="true"' : '') + '></button>').join('');
  return '<div class="slider-stage">' + arrow('prev', 'Previous project', 'M15 5l-7 7 7 7') +
    '<div class="slider-track">' + items.map((p, i) => slideHtml(p, i, offsets[i])).join('') + '</div>' +
    arrow('next', 'Next project', 'M9 5l7 7-7 7') + '</div>' +
    (many ? '<div class="slider-meta"><p class="cap slider-count">Plate ' + (sel + 1) + ' of ' + n + '.</p><div class="slider-dots" role="group" aria-label="Choose a project">' + dots + '</div></div>' : '') +
    '<div class="slider-panel" aria-live="polite">' + panelHtml(items[sel]) + '</div>';
}

// ---------- The page: selection, motion and events ----------
// The selected slide is kept here, so it survives a visit to a case view and back. Moving the selection changes attributes in place
// (nothing is re-rendered), so the CSS transitions run and keyboard focus stays on the button that was pressed.
let projectSlide = 0, panelTimer = null, sliderBound = false, dragFrom = null, justSwiped = false;

function currentProject(){
  return projectSlide;
}

function sliderItems(){
  return filterProjects(PROJECTS, 'all');
}

function prefersReducedMotion(){
  return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
}

// The words under the picture fade out, change, and fade in (180 ms each way). Every call restarts the wait and the swap shows whatever
// is selected when it runs, so fast clicking always ends on the right project. With reduced motion the words change at once.
function showPanel(root, dir){
  const box = root.querySelector('.slider-panel');
  if(!box) return;
  clearTimeout(panelTimer);
  if(prefersReducedMotion()){
    box.classList.remove('is-leaving');
    box.innerHTML = panelHtml(sliderItems()[projectSlide]);
    return;
  }
  box.dataset.dir = dir < 0 ? 'prev' : 'next';
  box.classList.add('is-leaving');
  panelTimer = setTimeout(() => {
    box.innerHTML = panelHtml(sliderItems()[projectSlide]);
    box.classList.remove('is-leaving');
    box.classList.add('is-entering');
    void box.offsetWidth;
    box.classList.remove('is-entering');
  }, 180);
}

// Selects a project (any number: it wraps) and moves the page to match. Selecting the project that is already selected does nothing.
function goToProject(index){
  const root = document.getElementById('projectSlider');
  const n = sliderItems().length;
  if(!root || !n) return;
  const plan = slidePlan(n, projectSlide, stepIndex(n, index, 0));
  if(!plan.dir) return;
  projectSlide = stepIndex(n, index, 0);
  const reduced = prefersReducedMotion();
  root.querySelectorAll('.slide').forEach((el, i) => {
    const jump = !reduced && plan.jumps.includes(i);
    if(jump) el.style.transition = 'none';
    el.setAttribute('data-offset', String(plan.offsets[i]));
    if(plan.offsets[i] === 0) el.removeAttribute('aria-hidden'); else el.setAttribute('aria-hidden', 'true');
    if(jump){ void el.offsetWidth; el.style.transition = ''; }
  });
  root.querySelectorAll('.slider-dot').forEach((d, i) => { if(i === projectSlide) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
  const count = root.querySelector('.slider-count');
  if(count) count.textContent = 'Plate ' + (projectSlide + 1) + ' of ' + n + '.';
  showPanel(root, plan.dir);
}

function stepProject(delta){
  goToProject(stepIndex(sliderItems().length, projectSlide, delta));
}

// The row of cards (the track) follows a drag: it gets a class that switches its glide off, and is moved with an inline transform, which
// is cheaper than a CSS variable that every card would inherit. Letting go clears both, so the track glides back to its place while the
// cards glide to theirs; the two movements add up, so nothing jumps.
function dragTrack(root){
  return root.querySelector('.slider-track');
}

function startDrag(root, pointerId){
  const track = dragTrack(root);
  if(track) track.classList.add('is-dragging');
  if(root.setPointerCapture){ try{ root.setPointerCapture(pointerId); }catch(e){} }   // the drag still ends here if the finger leaves the slider
}

function moveDrag(root, dx){
  const track = dragTrack(root);
  if(track) track.style.transform = 'translateX(' + dragOffset(dx, track.offsetWidth) + 'px)';
}

function endDrag(root){
  const track = dragTrack(root);
  if(!track) return;
  track.classList.remove('is-dragging');
  track.style.transform = '';
}

// One set of listeners on the slider root (events bubble to it): clicks, keys, and a swipe on the stage.
function bindProjectSlider(root){
  root.addEventListener('click', e => {
    if(justSwiped){ justSwiped = false; return; }
    const t = e.target;
    if(!t || !t.closest) return;
    if(t.closest('.slider-prev')){ stepProject(-1); return; }
    if(t.closest('.slider-next')){ stepProject(1); return; }
    const dot = t.closest('.slider-dot');
    if(dot){ goToProject(Number(dot.getAttribute('data-index'))); return; }
    const slide = t.closest('.slide');
    if(slide && slide.getAttribute('data-offset') !== '0') goToProject(Number(slide.getAttribute('data-index')));
  });
  root.addEventListener('keydown', e => {
    if(e.ctrlKey || e.altKey || e.metaKey) return;
    if(e.target && e.target.closest && e.target.closest('.slider-panel')) return;   // the panel's own link keeps its keys, and the swap never takes focus from it
    const to = indexForKey(e.key, sliderItems().length, projectSlide);
    if(to === null) return;
    e.preventDefault();
    goToProject(to);
  });
  root.addEventListener('pointerdown', e => {
    dragFrom = null;                                                    // a drag that was never released (the button came up outside) is over
    endDrag(root);
    if(e.button > 0 || !e.target || !e.target.closest || !e.target.closest('.slider-stage')) return;
    dragFrom = { x: e.clientX, y: e.clientY, id: e.pointerId, axis: null };   // null until the direction is decided, then 'x' (drag) or 'y' (scroll)
  });
  root.addEventListener('pointermove', e => {
    const d = dragFrom;
    if(!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if(!d.axis){                                                        // a tap's wobble decides nothing
      if(Math.max(Math.abs(dx), Math.abs(dy)) <= DRAG_LOCK) return;
      d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';                 // an exact diagonal counts as a scroll
      if(d.axis === 'x') startDrag(root, d.id);
    }
    if(d.axis === 'x') moveDrag(root, dx);                              // a drag follows the sideways part to the end; a scroll never moves the cards
  });
  // While the drag is sideways the page must not scroll, or the cards and the page would move at once. The browser only honors this
  // from a listener that is not passive, and only before it has started scrolling (a gesture that began vertical is the browser's).
  root.addEventListener('touchmove', e => {
    if(dragFrom && dragFrom.axis === 'x' && e.cancelable) e.preventDefault();
  }, { passive: false });
  root.addEventListener('pointerup', e => {
    const from = dragFrom;
    dragFrom = null;
    if(!from || e.pointerId !== from.id) return;
    endDrag(root);
    const dx = e.clientX - from.x, dy = e.clientY - from.y;
    if(Math.abs(dx) > 10 || Math.abs(dy) > 10){ justSwiped = true; setTimeout(() => { justSwiped = false; }, 0); }   // the click that ends a drag is not a choice
    const dir = from.axis === 'y' ? 0 : swipeDirection(dx, from.axis === 'x' ? 0 : dy);   // a decided direction is final; with none decided (a fast flick), the whole move is judged
    if(dir) stepProject(dir);
  });
  root.addEventListener('pointercancel', () => { dragFrom = null; endDrag(root); });
}

// Fills the slider for the current selection, and binds the listeners once. Safe to call again.
function initProjectSlider(){
  const root = document.getElementById('projectSlider');
  if(!root) return;
  clearTimeout(panelTimer);
  root.innerHTML = sliderHtml(PROJECTS, projectSlide);
  if(!sliderBound){ sliderBound = true; bindProjectSlider(root); }
}

if(typeof document !== 'undefined' && document.getElementById){
  initProjectSlider();
}
