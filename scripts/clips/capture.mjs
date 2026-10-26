// Dev tool (not part of the site): captures real pages, sharp, for the stills of the Projects page. A real Chrome renders each page at
// 1280 by 800 CSS pixels at 2x, so every PNG is 2560 by 1600 and lossless. Needs Chrome or Edge on this PC.
//   node scripts/serve.mjs                                        (the site, port 5317)
//   node scripts/clips/capture.mjs site [--base http://localhost:5317]
//   node scripts/clips/capture.mjs car-broker [--url https://mdesigns-broker-demo.vercel.app]     (the public pages of the demo, no sign-in)
// Writes scripts/clips/captures/<id>/NN-name.png (git-ignored); still.mjs turns one into a WebP under img/projects/<id>/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome } from '../lib/cdp.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const id = args[0];
const opt = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback).replace(/\/$/, '');
if (id !== 'site' && id !== 'car-broker') { console.error('usage: node scripts/clips/capture.mjs site [--base http://localhost:5317]   or   car-broker [--url https://mdesigns-broker-demo.vercel.app]'); process.exit(1); }

const outDir = path.join(root, 'scripts/clips/captures', id);
fs.mkdirSync(outDir, { recursive: true });
const save = async (b, name) => { const p = path.join(outDir, name); fs.writeFileSync(p, await b.shot()); console.log('saved', path.relative(root, p), fs.statSync(p).size, 'bytes'); };

// The website: the opening gate and letters, Home, the CV and its board, and the Trip globe.
async function captureSite(b) {
  const base = opt('--base', 'http://localhost:5317');
  // Quiet page: no consent banner and (unless asked) no opening.
  const quiet = "try{localStorage.setItem('mdb-consent','declined');localStorage.setItem('mdb-theme','dark')}catch(e){}";
  // 1 and 2. The opening: the gate with the bead cloud, then the beads held as the letters (the opening's own holdFrame).
  await b.goto(base + '/?again#home');
  await b.eval(quiet);
  await b.goto(base + '/?again#home');
  await b.waitFor("window.__intro && window.__intro.state === 'gate'", 20000, 'the gate');
  await b.sleep(3500);
  await save(b, '01-gate.png');
  await b.eval("document.getElementById('gateEnter').click()");
  await b.waitFor('window.__intro && window.__intro.opening', 30000, 'the opening to load');
  await b.eval('window.__intro.opening.holdFrame()');
  await b.sleep(900);
  await save(b, '02-letters.png');

  // 3. Home, once the opening is out of the way (a session that has seen it), after the items have faded in.
  await b.eval("try{sessionStorage.setItem('mdb-opening','1')}catch(e){}");
  await b.goto(base + '/#home');
  await b.waitFor("!document.documentElement.classList.contains('intro')", 20000, 'the opening to end');
  await b.sleep(4500);
  await save(b, '03-home.png');

  // 4 and 5. The CV, then the board flipped to the Operations reading with its tabs and caption in view.
  await b.goto(base + '/#cv');
  await b.sleep(3500);
  await b.eval('window.scrollTo(0, 0)');
  await save(b, '04-cv.png');
  await b.eval("[...document.querySelectorAll('.cv-board-tabs button')].find(x => /operations/i.test(x.textContent)).click()");
  await b.eval("(() => { const s = document.querySelector('.cv-board-sub').getBoundingClientRect(); window.scrollBy(0, s.top - 90); })()");
  await b.sleep(5000);
  await save(b, '05-board.png');

  // 6. Trip: the globe on stop 3 of 11 (Prague), with the plane in flight.
  await b.goto(base + '/#trip');
  await b.waitFor("document.getElementById('page-trip').dataset.globe === 'on'", 30000, 'the globe');
  await b.eval("(() => { const f = document.querySelector('.trip-globe-frame').getBoundingClientRect(); window.scrollBy(0, f.top - 78); })()");
  await b.waitFor("/STOP 03 OF 11/i.test(document.querySelector('.globe-card')?.textContent || '')", 60000, 'the flight to reach stop 3');
  await b.sleep(1200);
  await save(b, '06-trip.png');
}

// The car broker demo: its public pages only (no sign-in), with the cookie banner declined so nothing covers the page.
async function captureCarBroker(b) {
  const url = opt('--url', 'https://mdesigns-broker-demo.vercel.app');
  const decline = async () => { await b.eval("(() => { const x = [...document.querySelectorAll('button')].find((e) => /^decline$/i.test(e.textContent.trim())); if (x) x.click(); })()"); await b.sleep(900); };
  await b.goto(url + '/');
  await b.sleep(4000);
  await decline();
  await b.eval('window.scrollTo(0, 0)');
  await b.sleep(500);
  await save(b, '01-home.png');
  await b.goto(url + '/rentals');
  await b.sleep(4000);
  await decline();
  await b.eval('window.scrollTo(0, 0)');
  await b.sleep(500);
  await save(b, '02-rentals.png');
}

const b = await launchChrome({ width: 1280, height: 800, scale: 2 });
try {
  await (id === 'site' ? captureSite(b) : captureCarBroker(b));
} finally {
  await b.close();
}
