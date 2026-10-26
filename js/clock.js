//= The banner clock: the time in Tel Aviv, wherever the visitor is. Loaded after theme.js.

// 'tel aviv 21:04'. 24 hour clock (hourCycle h23, so midnight is 00:04 and never 24:04); the zone handles daylight saving.
function formatClock(date){
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
  return 'tel aviv ' + time;
}

// Renders now, then again at every minute boundary. If Intl or the zone is missing the clock hides itself:
// no clock is better than a wrong one.
function startClock(el){
  if(!el) return;
  const render = () => {
    try{ el.textContent = formatClock(new Date()); el.hidden = false; return true; }
    catch(e){ el.textContent = ''; el.hidden = true; return false; }
  };
  if(!render()) return;
  const untilNextMinute = () => 60000 - (Date.now() % 60000) + 50;
  const tick = () => { if(render()) setTimeout(tick, untilNextMinute()); };
  setTimeout(tick, untilNextMinute());
  if(typeof document !== 'undefined' && document.addEventListener) document.addEventListener('visibilitychange', () => { if(!document.hidden) render(); });   // a backgrounded tab catches up when it returns
}

if(typeof document !== 'undefined' && document.getElementById && document.getElementById('clock')) startClock(document.getElementById('clock'));

// Whole years from a year-month ("2019-03") to `now`; 0 for a bad value or a date before it. The Home stat "Years in" uses it, so it grows by itself.
function yearsSince(since, now){
  const m = typeof since === 'string' ? since.match(/^(\d{4})-(0[1-9]|1[0-2])$/) : null;
  const t = now instanceof Date ? now : new Date(now);
  if(!m || isNaN(t.getTime())) return 0;
  const months = (t.getUTCFullYear() - Number(m[1])) * 12 + (t.getUTCMonth() + 1 - Number(m[2]));
  return Math.max(0, Math.floor(months / 12));
}
