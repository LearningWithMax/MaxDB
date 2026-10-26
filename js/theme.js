//= Theme: dark is the default, paper is the light theme. Loaded before nav.js (the logo long-press calls toggleTheme).
// resolveTheme and readStoredTheme live in the inline script in <head>, because the theme must be set before first paint.

function currentTheme(){
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

// Flip between dark and paper, remember the choice, and crossfade the colors for 250 ms (css/base.css, html.theme-fade).
// Blocked storage still flips the theme, it just is not remembered. Reduced motion skips the crossfade.
function toggleTheme(){
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  const root = document.documentElement;
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!calm){
    root.classList.add('theme-fade');
    setTimeout(() => root.classList.remove('theme-fade'), 300);
  }
  root.setAttribute('data-theme', next);
  try{ localStorage.setItem('mdb-theme', next); }catch(e){}
  return next;
}
