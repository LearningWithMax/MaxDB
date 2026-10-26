// The plain list of Trip stops that sits in index.html for visitors without the globe (no JavaScript, no WebGL, or a failed load).
// It is generated from modules/trip-stops.js by `node scripts/trip-list.mjs`, and scripts/check.mjs fails when the two differ.
import { KINDS } from '../../modules/globe-data.js';

export const TRIP_LIST_START = '<!-- trip-stops:start -->';
export const TRIP_LIST_END = '<!-- trip-stops:end -->';

// Text only: & < > become entities, and an e acute becomes its entity like the rest of index.html writes it.
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/é/g, '&eacute;');

export function tripListHtml(stops) {
  const items = stops.map((s, i) => {
    const kind = KINDS[s.kind] ? s.kind : 'work';
    return `<li data-kind="${kind}"><span class="trip-stop-n">${String(i + 1).padStart(2, '0')}</span> <b class="trip-stop-city">${esc(s.city)}, ${esc(s.country)}</b> <span class="trip-stop-kind">${esc(KINDS[kind].label)}</span> <span class="trip-stop-when">${esc(s.when)}</span> <span class="trip-stop-what">${esc(s.what)}</span></li>`;
  });
  return `<ol class="trip-stops" data-when="fallback">\n${items.map((l) => '  ' + l).join('\n')}\n</ol>`;
}

const norm = (s) => s.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();

// Problems with the list in `html` (the whole index.html text), or an empty list when it matches `stops`.
export function checkTripList(html, stops) {
  const a = html.indexOf(TRIP_LIST_START), b = html.indexOf(TRIP_LIST_END);
  if (a < 0 || b < 0 || b < a) return ['index.html: the trip-stops markers are missing (run node scripts/trip-list.mjs)'];
  if (norm(html.slice(a + TRIP_LIST_START.length, b)) !== norm(tripListHtml(stops))) {
    return ['index.html: the static trip stop list differs from modules/trip-stops.js (run node scripts/trip-list.mjs)'];
  }
  return [];
}
