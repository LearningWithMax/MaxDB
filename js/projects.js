//= The Projects page: the data and the functions that turn it into the slider, the Home band and the plain list. Loaded before projects-slider.js and nav.js.
// This file is public on GitHub Pages, so a project that must stay private is simply not in it (there is no "public" flag), and no login
// is ever written here. Each entry has either an image (an HD still, with a thumb at half size) or a figure (a drawn diagram), never both,
// and no video. Only a live project may link: `href` opens the real thing in a new tab, `case` opens its case view (#projects/<case>).
// `access: 'request'` shows an "Ask for access" email button for a project whose demo sits behind a login; accessTo names the private part ("the dashboard") when the rest is public;
// `soon: true` adds "coming soon" to that button and asks to be told when access opens.
// An optional note (one short sentence) shows under the title, for something a visitor should know before they look, such as a redesign on its way.
// An optional dashboard (up to 300 characters) adds an "Inside the dashboard" row for a project with a private side that cannot be shown.

const CONTACT_EMAIL = 'duffaud.max@gmail.com';      // the address already on the CV
const STATUS_LABELS = { live: 'Live', building: 'Building and testing', planned: 'Planned' };

const PROJECTS = [
  {
    id: 'car-broker', title: 'Car broker template', status: 'live', order: 1, access: 'request', accessTo: 'the dashboard', href: 'https://mdesigns-broker-demo.vercel.app',
    oneLine: 'A website template for a vehicle broker. Visitors choose a path (rentals, leases, no credit check, car sourcing, or selling their car), pick a car and send a request, and the broker contacts them. A private dashboard runs it all. Each client gets their own version, starting with the look.',
    dashboard: 'Requests with a status for each car, private notes, reply templates and a calendar. Cars with photos, prices and tags for each path. Switch paths on or off, manage locations and site images, and see top customers.',
    builtWith: 'Next.js, React, TypeScript, Tailwind, Supabase, Resend and Vercel.',
    stands: 'Live as a demo on invented data. It is an earlier version, and a newer one is built but not live yet.',
    note: 'A new look for the site and the dashboard is coming, so this picture and the demo will change.',
    image: {
      src: 'img/projects/car-broker/home.webp', thumb: 'img/projects/car-broker/home-thumb.webp', w: 1600, h: 1000,
      alt: 'The home page of the car broker demo: a headline about finding any car in the U.S., a Browse cars button, and four steps from request to confirmed deal over an outline of a car.',
    },
  },
  {
    id: 'site', title: 'This website', status: 'live', order: 2, case: 'site',
    oneLine: 'A showcase of me: my professional experience in the CV, my creative side in the look, and my tech side in the site itself and its animations, including a 3D flight over the places where I was born, studied and worked. I bring the vision and lead, and Claude brainstorms and builds it with me.',
    builtWith: 'Claude, in plain HTML, CSS and JavaScript, with three.js and GSAP for the 3D. No framework.',
    stands: 'Live and still growing. It will keep growing as new projects happen and I keep expanding it.',
    image: {
      src: 'img/projects/site/home.webp', thumb: 'img/projects/site/home-thumb.webp', w: 1600, h: 1000,
      alt: 'The home page of this website: the name in large serif type, one line about seven jobs across five countries, and three rows for the CV readings.',
    },
  },
  {
    id: 'organizer', title: 'Voice organizer', status: 'building', order: 3,
    oneLine: "A voice-first to-do and memory system. I talk to Claude on my phone, even in a long ramble, and it files what I said into Notion as tasks, reminders, appointments, notes and ideas. It checks for repeats, plans my day, wraps it up with me and keeps a searchable daily log.",
    dashboard: "A Notion dashboard with the list for today, what slipped from earlier, an inbox, a calendar, build ideas, ideas and notes, and a daily log that keeps everything I said.",
    builtWith: 'The Claude app on my phone and Notion, with a written set of instructions. Nothing to host.',
    stands: "Built and in testing on my own phone. More features are planned, and it is not public.",
    figure: { kind: 'flow', items: ['talk', 'file', 'plan my day'] },
  },
  {
    id: 'broker-markets', title: 'Broker template for any market', status: 'planned', order: 4,
    oneLine: "One template for any broker business, built from the car broker. The skeleton stays the same: a catalog, requests with a status, private notes, reply templates and a calendar. For each market, the paths visitors choose, the details of each item and the look change.",
    builtWith: 'The same stack as the car broker: Next.js, TypeScript, Tailwind CSS and Supabase.',
    stands: 'Planned. It starts once the car version is complete.',
    figure: { kind: 'words', items: ['homes', 'boats', 'equipment', 'collectibles', 'villas'] },
  },
  {
    id: 'quote-market', title: 'Quote marketplace', status: 'building', order: 5, access: 'request', soon: true,
    oneLine: "A B2B portal where companies sign up and are vetted by the seller's staff. Once approved, they browse the catalog and send an inquiry for products or services, and the seller replies with a quote. If it suits them, they accept and pay, then send the details for delivery, all inside the portal.",
    dashboard: "Vetting queue for new companies, requests with a status and a message thread, quotes and payment confirmation, a catalog with stock and prices, editable ranks and permissions, and an audit log.",
    builtWith: "Plain HTML, CSS and JavaScript, with a small Node server on Vercel and a Supabase database. English and Spanish.",
    stands: "A working private demo on invented data. Coming soon.",
    figure: { kind: 'flow', items: ['request', 'quote', 'confirm'] },
  },
];

function statusLabel(status){
  return STATUS_LABELS[status] || '';
}

// Every rule the data must keep. Returns a list of problems, each starting with the entry's id; an empty list means clean.
// opts.caseSections lists the case ids that have a section#project-<id> in index.html.
function validateProjects(list, opts){
  const caseSections = (opts && opts.caseSections) || [];
  const out = [];
  const ids = new Set(), orders = new Set();
  list.forEach(p => {
    const at = p && p.id ? p.id : '(no id)';
    const bad = msg => out.push(at + ': ' + msg);
    if(!/^[a-z0-9-]+$/.test(p.id || '')) bad('id must be lowercase letters, digits and hyphens');
    if(ids.has(p.id)) bad('duplicate id'); ids.add(p.id);
    if(!STATUS_LABELS[p.status]) bad('unknown status "' + p.status + '"');
    if(!Number.isInteger(p.order)) bad('order must be an integer');
    else { if(orders.has(p.order)) bad('duplicate order ' + p.order); orders.add(p.order); }
    if(!p.title) bad('title is empty');
    const line = p.oneLine || '';
    if(!line) bad('oneLine is empty');
    if(line.length > 300) bad('oneLine is longer than 300 characters');
    if(hasBannedDash(line)) bad('oneLine has a dash the copy rules ban');
    for(const f of ['builtWith', 'stands']){
      const text = p[f] || '', max = f === 'builtWith' ? 120 : 140;
      if(!text) bad(f + ' is empty');
      if(text.length > max) bad(f + ' is longer than ' + max + ' characters');
      if(hasBannedDash(text)) bad(f + ' has a dash the copy rules ban');
    }
    if(p.dashboard !== undefined){
      if(typeof p.dashboard !== 'string') bad('dashboard must be text');
      else {
        if(!p.dashboard) bad('dashboard is empty');
        if(p.dashboard.length > 300) bad('dashboard is longer than 300 characters');
        if(hasBannedDash(p.dashboard)) bad('dashboard has a dash the copy rules ban');
      }
    }
    if(p.note !== undefined){
      if(typeof p.note !== 'string') bad('note must be text');
      else {
        if(!p.note) bad('note is empty');
        if(p.note.length > 140) bad('note is longer than 140 characters');
        if(hasBannedDash(p.note)) bad('note has a dash the copy rules ban');
      }
    }
    if(p.loop) bad('loop is not allowed: the site has no video');
    if(p.caseLoop) bad('caseLoop is not allowed: the site has no video');
    if(p.image && p.figure) bad('has both image and figure');
    if(!p.image && !p.figure) bad('has neither image nor figure');
    if(p.image){
      const img = p.image;
      for(const f of ['src', 'thumb', 'w', 'h', 'alt']) if(img[f] === undefined || img[f] === '') bad('image is missing ' + f);
      const own = new RegExp('^img/projects/' + (/^[a-z0-9-]+$/.test(p.id || '') ? p.id : 'invalid') + '/[a-z0-9-]+\\.webp$');
      for(const f of ['src', 'thumb']) if(img[f] !== undefined && !own.test(img[f])) bad('image ' + f + ' must be a .webp under img/projects/' + p.id + '/');
      if(img.w !== undefined && img.h !== undefined && !(Number.isInteger(img.w) && Number.isInteger(img.h))) bad('image w and h must be whole numbers');
      if(typeof img.alt === 'string'){
        if(img.alt.length > 200) bad('image alt is longer than 200 characters');
        if(hasBannedDash(img.alt)) bad('image alt has a dash the copy rules ban');
      }
    }
    if(p.access !== undefined){
      if(p.access !== 'request') bad('access must be "request"');
      if(p.status === 'planned') bad('a planned project cannot ask for access');
    }
    if(p.accessTo !== undefined){
      if(p.access !== 'request') bad('accessTo needs access "request"');
      if(typeof p.accessTo !== 'string') bad('accessTo must be text');
      else {
        if(!p.accessTo) bad('accessTo is empty');
        if(p.accessTo.length > 40) bad('accessTo is longer than 40 characters');
        if(hasBannedDash(p.accessTo)) bad('accessTo has a dash the copy rules ban');
      }
    }
    if(p.soon !== undefined){
      if(p.access !== 'request') bad('soon needs access "request"');
      if(p.soon !== true) bad('soon must be true');
    }
    if(p.figure){
      if(p.figure.kind !== 'words' && p.figure.kind !== 'flow') bad('figure kind must be words or flow');
      if(!p.figure.items || !p.figure.items.length) bad('figure has no items');
    }
    if(p.href && !/^https:\/\//.test(p.href)) bad('href must start with https://');
    if((p.href || p.case) && p.status !== 'live') bad('only a live project may link');
    if(p.href && p.case) bad('has both href and case');
    if(p.case){
      if(typeof CASE_IDS !== 'undefined' && !CASE_IDS.includes(p.case)) bad('case "' + p.case + '" is not a known case id');
      if(!caseSections.includes(p.case)) bad('case "' + p.case + '" has no section#project-' + p.case + ' in index.html');
    }
  });
  return out;
}

// The en and em dash, found by code, so check.mjs does not read this line as site text.
function hasBannedDash(text){
  return Array.from(text).some(ch => ch.charCodeAt(0) === 8211 || ch.charCodeAt(0) === 8212);
}

// The projects with this status in order, or all of them for 'all' or anything unknown. The input is not changed.
function filterProjects(list, status){
  const sorted = list.slice().sort((a, b) => a.order - b.order);
  return STATUS_LABELS[status] ? sorted.filter(p => p.status === status) : sorted;
}

// The first n projects, in order, that are not planned: what the Home band shows.
function homePicks(list, n){
  return filterProjects(list, 'all').filter(p => p.status !== 'planned').slice(0, n);
}

// Where a tile goes, or null when it goes nowhere.
function tileTarget(p){
  if(p.href) return { href: p.href, newTab: true, label: 'Open ' + p.title + ' (opens in a new tab)' };
  if(p.case) return { href: '#projects/' + p.case, newTab: false, label: 'Open ' + p.title };
  return null;
}

// ---------- HTML builders: pure string functions, so Node tests can check the markup ----------
function escapeHtml(s){
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// A drawn still: words joined by a middle dot, or steps joined by an arrow.
function figureHtml(fig){
  const sep = fig.kind === 'words' ? '&middot;' : '&rarr;';
  return '<div class="figure figure-' + fig.kind + '">' + fig.items.map(i => '<span>' + escapeHtml(i) + '</span>').join('<i>' + sep + '</i>') + '</div>';
}

// The picture of a project: its HD still, or its drawn figure. opts.thumb asks for the small still (half size, no description: a
// decorative picture next to a title that says the same thing) and has no effect on a figure.
function visualHtml(p, opts){
  if(!p.image) return figureHtml(p.figure);
  const i = p.image, thumb = !!(opts && opts.thumb);
  const src = thumb ? i.thumb : i.src, w = thumb ? Math.round(i.w / 2) : i.w, h = thumb ? Math.round(i.h / 2) : i.h;
  return '<img class="shot" src="' + escapeHtml(src) + '" width="' + w + '" height="' + h + '" alt="' + (thumb ? '' : escapeHtml(i.alt)) +
    '" loading="lazy" decoding="async" draggable="false">';       // not draggable: a mouse swipe on the picture must reach the slider, not start the browser's image drag
}

// The email a visitor sends to ask for a project's demo login. The login itself is given on a call and is never written here.
function accessHref(p){
  const subject = 'Demo access: ' + p.title;
  const want = p.soon ? 'to be told when I can get access' + (p.accessTo ? ' to ' + p.accessTo : '') : p.accessTo ? 'access to ' + p.accessTo : 'to see the demo';
  const body = 'Hi Max,\n\nI saw ' + p.title + ' on your site and would like ' + want + '.';
  return 'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
}

// The buttons of a project, in this order, and none when there is nothing to open or ask for: a public address visits (new tab), a case
// view opens inside the page, a request asks for access. A project can have two: a public site with a private dashboard has its address
// and an access request. label is the button text; name is the full description for screen readers and for the plain list.
function projectActions(p){
  const out = [];
  if(p.href) out.push({ kind: 'visit', href: p.href, label: 'Visit', name: 'Visit ' + p.title + ' (opens in a new tab)', newTab: true });
  if(p.case) out.push({ kind: 'case', href: '#projects/' + p.case, label: 'See how it is built', name: 'See how ' + p.title + ' is built', newTab: false });
  if(p.access === 'request') out.push({ kind: 'access', href: accessHref(p), label: (p.accessTo ? 'Ask for access to ' + p.accessTo : 'Ask for access') + (p.soon ? ' · coming soon' : ''), name: (p.accessTo ? 'Ask for access to ' + p.accessTo + ' of ' + p.title : 'Ask for access to ' + p.title) + (p.soon ? ', coming soon' : ''), newTab: false });
  return out;
}

// The words under the selected project: its title and status, what it does, what it is built with, where it stands, and its buttons.
function panelHtml(p){
  const actions = projectActions(p);
  const button = actions.length
    ? '<p class="panel-action">' + actions.map(a => '<a class="pill panel-button" href="' + escapeHtml(a.href) + '"' + (a.newTab ? ' target="_blank" rel="noopener"' : '') +
      ' aria-label="' + escapeHtml(a.name) + '">' + escapeHtml(a.label) + '</a>').join('') + '</p>'
    : '';
  const row = (label, text) => '<div><dt>' + label + '</dt><dd>' + escapeHtml(text) + '</dd></div>';
  return '<article class="panel" data-id="' + escapeHtml(p.id) + '" data-status="' + escapeHtml(p.status) + '">' +
    '<div class="panel-head"><h2 class="panel-title">' + escapeHtml(p.title) + '</h2><span class="chip chip-' + escapeHtml(p.status) + '">' + escapeHtml(statusLabel(p.status)) + '</span>' +
    (p.note ? '<p class="panel-note">' + escapeHtml(p.note) + '</p>' : '') + '</div>' +
    '<dl class="panel-facts">' + row('What it does', p.oneLine) + (p.dashboard ? row('Inside the dashboard', p.dashboard) : '') + row('Built with', p.builtWith) + row('Where it stands', p.stands) + '</dl>' + button + '</article>';
}

// One compact tile, for the Home band: the small still or the figure, the title (not a heading: Home has no h2 above it) and the status chip.
function tileHtml(p){
  const target = tileTarget(p);
  const link = target
    ? '<a class="tile-link" href="' + escapeHtml(target.href) + '"' + (target.newTab ? ' target="_blank" rel="noopener"' : '') + ' aria-label="' + escapeHtml(target.label) + '"></a>'
    : '';
  return '<article class="tile tile-compact' + (target ? ' has-link' : '') + '" data-id="' + escapeHtml(p.id) + '" data-status="' + escapeHtml(p.status) + '">' + link +
    '<div class="tile-visual">' + visualHtml(p, { thumb: true }) + '</div>' +
    '<div class="tile-text"><p class="tile-title">' + escapeHtml(p.title) + '</p><span class="chip chip-' + escapeHtml(p.status) + '">' + escapeHtml(statusLabel(p.status)) + '</span></div></article>';
}

// The Home band: a pill to the projects page and the first three projects that are not planned. Empty when there is nothing to show.
function homeBandHtml(list){
  const picks = homePicks(list, 3);
  if(!picks.length) return '';
  return '<div class="band-head"><p class="kicker">Projects</p><a class="pill" href="#projects">all projects &rarr;</a></div><div class="band-grid">' +
    picks.map(p => tileHtml(p)).join('') + '</div>';
}

// What a visitor without JavaScript reads: every project with its status and its three facts, and its link where it has one.
function noscriptListHtml(list){
  return '<ul class="shelf-list">' + filterProjects(list, 'all').map(p => {
    const link = projectActions(p).map(a => ' <a href="' + escapeHtml(a.href) + '"' + (a.newTab ? ' target="_blank" rel="noopener"' : '') + '>' + escapeHtml(a.name) + '</a>').join('');
    return '<li><strong>' + escapeHtml(p.title) + '</strong>, ' + escapeHtml(statusLabel(p.status)) + '. ' + escapeHtml(p.oneLine) +
      (p.dashboard ? ' Inside the dashboard: ' + escapeHtml(p.dashboard) : '') + ' Built with: ' + escapeHtml(p.builtWith) + ' Where it stands: ' + escapeHtml(p.stands) + (p.note ? ' Note: ' + escapeHtml(p.note) : '') + link + '</li>';
  }).join('') + '</ul>';
}

// ---------- The page: which view shows, and the Home band ----------
// The page shows the list of projects (the slider), or one project's case view (#projects/<id>). nav.js calls setProjectView from goTo.
function projectViewState(project){
  return typeof CASE_IDS !== 'undefined' && CASE_IDS.includes(project) ? { view: 'case', id: project } : { view: 'shelf', id: null };
}

function renderHomeBand(){
  const band = document.getElementById('homeProjects');
  if(!band) return;
  band.innerHTML = homeBandHtml(PROJECTS);
}

function setProjectView(project){
  const el = document.getElementById('page-projects');
  if(!el) return;
  const state = projectViewState(project);
  el.setAttribute('data-view', state.view);
  if(state.id) el.setAttribute('data-case', state.id);
  else el.removeAttribute('data-case');
}

if(typeof document !== 'undefined' && document.getElementById){
  renderHomeBand();
}
