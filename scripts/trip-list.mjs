// Rewrites the plain Trip stop list in index.html from modules/trip-stops.js.
//   node scripts/trip-list.mjs           rewrite the block between the trip-stops markers
//   node scripts/trip-list.mjs --check   only report whether it is up to date (exit 1 if not)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TRIP_STOPS } from '../modules/trip-stops.js';
import { tripListHtml, checkTripList, TRIP_LIST_START, TRIP_LIST_END } from './lib/trip-list.mjs';

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'index.html');
let html = fs.readFileSync(file, 'utf8');

if (process.argv.includes('--check')) {
  const problems = checkTripList(html, TRIP_STOPS);
  console.log(problems.length ? problems.join('\n') : 'ok: the trip stop list is up to date');
  process.exit(problems.length ? 1 : 0);
}

const a = html.indexOf(TRIP_LIST_START), b = html.indexOf(TRIP_LIST_END);
if (a < 0 || b < 0 || b < a) { console.error('The trip-stops markers are missing from index.html.'); process.exit(1); }
const nl = html.includes('\r\n') ? '\r\n' : '\n';               // keep the file's own line endings
const block = tripListHtml(TRIP_STOPS).split('\n').map((l) => '    ' + l).join(nl);
html = html.slice(0, a + TRIP_LIST_START.length) + nl + block + nl + '    ' + html.slice(b);
fs.writeFileSync(file, html);
console.log(`Rewrote the trip stop list (${TRIP_STOPS.length} stops).`);
