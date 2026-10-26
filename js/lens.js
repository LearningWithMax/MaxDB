//= Lens state for the CV: which of the four readings (all, chem, ops, cust) is showing. Loaded after route.js, before nav.js.
// Every variant of a text block is in the HTML (data-lens-text); CSS shows the one matching #page-cv[data-lens].

function getLens(){
  const el = document.getElementById('page-cv');
  return normalizeLens(el && el.getAttribute('data-lens'));
}

function setLens(lens){
  const l = normalizeLens(lens);
  const el = document.getElementById('page-cv');
  if(!el) return l;
  const changed = getLens() !== l;
  el.setAttribute('data-lens', l);
  if(el.classList.contains('active')){
    const want = buildHash('cv', l);
    if(window.location.hash !== want) window.history.replaceState(null, '', want);   // no history entry per lens click
  }
  if(changed) document.dispatchEvent(new CustomEvent('mdb:lens', { detail: { lens: l } }));
  return l;
}
// The banner logo is one fixed chrome image, made by scripts/stills/. The lens does not change it.
