//= World map: tooltips, click to open albums, zoom and pan (mouse + touch).

// Map interactions
const wrap = document.getElementById('mapWrap');
const tooltip = document.getElementById('tooltip');
const ttName = document.getElementById('tt-name');
const ttNote = document.getElementById('tt-note');
const ttTier = document.getElementById('tt-tier');

function showTooltip(el, evt){
  const id = el.getAttribute('data-id');
  const data = countryData[id];
  if(!data) return;
  ttName.textContent = data.name;
  ttNote.textContent = data.note;
  ttTier.textContent = tierLabels[data.tier];
  tooltip.classList.add('show');
  positionTooltip(evt);
}
function positionTooltip(evt){
  const rect = wrap.getBoundingClientRect();
  let x = (evt.clientX - rect.left) + 14;
  let y = (evt.clientY - rect.top) + 14;
  const maxX = rect.width - 190;
  if(x > maxX) x = (evt.clientX - rect.left) - 190;
  tooltip.style.left = x + 'px';
  tooltip.style.top = y + 'px';
}
function hideTooltip(){ tooltip.classList.remove('show'); }

const SPECIAL_COUNTRIES = ['VE','IL','FR','ES'];
document.querySelectorAll('.country.interactive').forEach(el=>{
  el.addEventListener('mousemove', (e)=>showTooltip(el, e));
  el.addEventListener('mouseleave', hideTooltip);
  el.addEventListener('click', (e)=>{
    const id = el.getAttribute('data-id');
    const d = countryData[id];
    if(SPECIAL_COUNTRIES.includes(id)){
      openCountryAlbum(id);
    } else {
      showTooltip(el, e);
      if(d) logVlogEvent('Clicked ' + d.name + ' on the map');
    }
  });
  el.addEventListener('focus', (e)=>{
    const rect = wrap.getBoundingClientRect();
    showTooltip(el, {clientX: rect.left + rect.width/2, clientY: rect.top + rect.height/2});
  });
  el.addEventListener('blur', hideTooltip);
});

// ---------- Zoom & pan ----------
const svgEl = document.getElementById('worldmap');
let scale = 1, tx = 0, ty = 0;
const MIN_SCALE = 1, MAX_SCALE = 9;
let isDragging = false, dragMoved = false, lastX = 0, lastY = 0;

function applyTransform(){
  svgEl.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
}
function clampPan(rect){
  const minTx = rect.width * (1 - scale);
  const minTy = rect.height * (1 - scale);
  tx = Math.min(0, Math.max(minTx, tx));
  ty = Math.min(0, Math.max(minTy, ty));
}
function zoomAt(cx, cy, newScaleRaw, rect){
  const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScaleRaw));
  tx = cx - (cx - tx) * (newScale / scale);
  ty = cy - (cy - ty) * (newScale / scale);
  scale = newScale;
  clampPan(rect);
  applyTransform();
}
function smoothZoomBy(factor, center){
  const rect = wrap.getBoundingClientRect();
  const cx = center ? center.x : rect.width / 2;
  const cy = center ? center.y : rect.height / 2;
  svgEl.style.transition = 'transform .25s ease';
  zoomAt(cx, cy, scale * factor, rect);
  setTimeout(()=>{ svgEl.style.transition = ''; }, 260);
}

wrap.addEventListener('wheel', (e)=>{
  e.preventDefault();
  hideTooltip();
  const rect = wrap.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  const factor = e.deltaY < 0 ? 1.15 : 1/1.15;
  zoomAt(mx, my, scale * factor, rect);
}, {passive:false});

wrap.addEventListener('dblclick', (e)=>{
  const rect = wrap.getBoundingClientRect();
  smoothZoomBy(1.7, {x:e.clientX-rect.left, y:e.clientY-rect.top});
});

wrap.addEventListener('mousedown', (e)=>{
  isDragging = true; dragMoved = false;
  lastX = e.clientX; lastY = e.clientY;
  wrap.classList.add('dragging');
});
window.addEventListener('mousemove', (e)=>{
  if(!isDragging) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  if(Math.abs(dx) > 2 || Math.abs(dy) > 2) dragMoved = true;
  lastX = e.clientX; lastY = e.clientY;
  tx += dx; ty += dy;
  clampPan(wrap.getBoundingClientRect());
  applyTransform();
  if(dragMoved) hideTooltip();
});
window.addEventListener('mouseup', ()=>{
  if(isDragging && dragMoved) logVlogEvent('Panned around the map');
  isDragging = false;
  wrap.classList.remove('dragging');
});

// touch: one-finger pan, two-finger pinch zoom
let pinchStartDist = 0, pinchStartScale = 1, pinchMid = {x:0,y:0};
function touchDist(t0, t1){
  return Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
}
wrap.addEventListener('touchstart', (e)=>{
  hideTooltip();
  if(e.touches.length === 1){
    isDragging = true;
    lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
  } else if(e.touches.length === 2){
    isDragging = false;
    pinchStartDist = touchDist(e.touches[0], e.touches[1]);
    pinchStartScale = scale;
    const rect = wrap.getBoundingClientRect();
    pinchMid = {
      x: (e.touches[0].clientX + e.touches[1].clientX)/2 - rect.left,
      y: (e.touches[0].clientY + e.touches[1].clientY)/2 - rect.top
    };
  }
}, {passive:true});

wrap.addEventListener('touchmove', (e)=>{
  e.preventDefault();
  if(e.touches.length === 1 && isDragging){
    const dx = e.touches[0].clientX - lastX, dy = e.touches[0].clientY - lastY;
    lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
    tx += dx; ty += dy;
    clampPan(wrap.getBoundingClientRect());
    applyTransform();
  } else if(e.touches.length === 2){
    const rect = wrap.getBoundingClientRect();
    const d = touchDist(e.touches[0], e.touches[1]);
    zoomAt(pinchMid.x, pinchMid.y, pinchStartScale * (d / pinchStartDist), rect);
  }
}, {passive:false});

wrap.addEventListener('touchend', (e)=>{
  if(e.touches.length === 0) isDragging = false;
});

document.getElementById('zoomInBtn').addEventListener('click', ()=>{ smoothZoomBy(1.5); logVlogEvent('Zoomed into the map'); });
document.getElementById('zoomOutBtn').addEventListener('click', ()=>smoothZoomBy(1/1.5));
document.getElementById('zoomResetBtn').addEventListener('click', ()=>{
  const rect = wrap.getBoundingClientRect();
  svgEl.style.transition = 'transform .3s ease';
  scale = 1; tx = 0; ty = 0;
  applyTransform();
  setTimeout(()=>{ svgEl.style.transition = ''; }, 310);
});
