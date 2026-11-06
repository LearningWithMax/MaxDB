// Pure data side of the split-flap board: read the jobs from the CV page, validate them, shape them for the board.
// No DOM and no three.js here, so Node tests can import it. The page is the source of truth: each job on the CV
// carries data-board attributes, and the board only reads them (a fact is written once).
// One line per job since the refocus (2026-11-06): the four readings, their weights and the dots are gone.

export const LIMITS = { note: 28, place: 12, company: 10 };
// The characters the flaps can show (the board's glyph wheel).
export const BOARD_CHARS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,-+:&/';

function checkText(label, job, text, max) {
  if (text.length > max) throw new Error(`${label} too long (${text.length} > ${max}) in job "${job}": ${text}`);
  for (const ch of text) if (!BOARD_CHARS.includes(ch)) throw new Error(`unsupported character "${ch}" in ${label} of job "${job}": ${text}`);
}

// rows: [{year, place, company, line}]
// Returns the same shape with year, place, company and line upper-cased. Throws on anything the board cannot show.
export function parseJobs(rows) {
  return rows.map((r) => {
    const name = r.company;
    if (typeof r.line !== 'string') throw new Error(`missing line in job "${name}"`);
    if (typeof r.place !== 'string') throw new Error(`missing place in job "${name}"`);
    if (typeof r.company !== 'string') throw new Error('missing company in a board job');
    const line = r.line.toUpperCase(), place = r.place.toUpperCase(), company = r.company.toUpperCase();
    checkText('line', name, line, LIMITS.note);
    checkText('place', name, place, LIMITS.place);
    checkText('company', name, company, LIMITS.company);
    return { year: String(r.year), place, company, line };
  });
}

// Reads every .job[data-board] under root (data-year, data-place, data-company, data-line).
export function rowsFromDom(root) {
  return [...root.querySelectorAll('.job[data-board]')].map((el) => {
    const d = el.dataset;
    return { year: d.year, place: d.place, company: d.company, line: d.line };
  });
}
