//= Hash routing helpers (pure, no DOM). '#cv' -> { page: 'cv' }. Loaded before nav.js.
// The CV is one reading since the refocus (2026-11-06): the old '#cv/cust', '#cv/ops' and '#cv/chem' addresses open the CV
// and the address bar is rewritten to '#cv'.

const PAGES = ['home', 'cv', 'projects', 'trip'];
const CASE_IDS = ['site'];                 // projects with a case view (#projects/<id>); each needs a section#project-<id> in index.html
const PAGE_ALIASES = { map: 'trip' };      // the old #map link lands on the Trip page

function parseRoute(hash){
  const parts = String(hash || '').replace(/^#/, '').toLowerCase().split('/');
  const named = PAGE_ALIASES[parts[0]] || parts[0];
  return { page: PAGES.includes(named) ? named : 'home' };
}

// What to do with the address bar once the wanted hash is known: nothing if it already matches; replace the entry when the
// visitor arrived with a hash that needed normalizing (so Back does not bounce); push when the visitor navigated.
function hashAction(current, wanted, fromHash){
  if(current === wanted) return 'none';
  return fromHash ? 'replace' : 'push';
}

// '#projects/site' -> 'site'. Only a known case id on the Projects page counts; anything else is null (the shelf).
function parseProject(hash){
  const parts = String(hash == null ? '' : hash).replace(/^#/, '').toLowerCase().split('/');
  return parts[0] === 'projects' && CASE_IDS.includes(parts[1]) ? parts[1] : null;
}

function buildHash(page, project){
  if(page === 'projects') return CASE_IDS.includes(project) ? '#projects/' + project : '#projects';
  return '#' + page;
}
