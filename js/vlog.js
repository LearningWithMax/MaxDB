//= Visitor log: the live activity feed and its open/close widget.

// ---------- Visitor log: live activity feed ----------
const vlogEvents = [];
function pad(n){ return n < 10 ? '0'+n : ''+n; }
function logVlogEvent(text){
  const now = new Date();
  vlogEvents.unshift({ text, time: pad(now.getHours())+':'+pad(now.getMinutes())+':'+pad(now.getSeconds()) });
  if(vlogEvents.length > 8) vlogEvents.pop();
  renderVlogLive();
}
function renderVlogLive(){
  const el = document.getElementById('vlogLiveList');
  if(!el) return;
  if(!vlogEvents.length){
    el.innerHTML = '<div class="vlog-live-item"><span class="vlog-live-time">--:--:--</span><span>Just watching for now.</span></div>';
    return;
  }
  el.innerHTML = vlogEvents.map(ev =>
    '<div class="vlog-live-item"><span class="vlog-live-time">'+ev.time+'</span><span>'+ev.text+'</span></div>'
  ).join('');
}

function toggleVlog(){
  document.getElementById('vlogWidget').classList.toggle('open');
}
document.addEventListener('click', (e)=>{
  const widget = document.getElementById('vlogWidget');
  if(widget && widget.classList.contains('open') && !widget.contains(e.target)){
    widget.classList.remove('open');
  }
});
renderVlogLive();
