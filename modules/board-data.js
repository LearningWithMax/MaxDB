// Pure data side of the split-flap board: read the jobs from the CV page, validate them, shape them for the board.
// No DOM and no three.js here, so Node tests can import it. The page is the source of truth: each job on the CV
// carries data-board attributes, and the board only reads them (a fact is written once).

export const LENS_ORDER = ['all', 'chem', 'ops', 'cust'];
export const LIMITS = { note: 28, place: 12, company: 10 };
// The characters the flaps can show (the board's glyph wheel, without the weight dots).
export const BOARD_CHARS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,-+:&/';
const WEIGHT_LENSES = ['chem', 'ops', 'cust'];

// How central a job is to the chosen lens: full, half or empty dot.
export function dotFor(w) {
  return w >= 0.8 ? '●' : w >= 0.45 ? '◑' : '○';
}

function checkText(label, job, text, max, extra = '') {
  if (text.length > max) throw new Error(`${label} too long (${text.length} > ${max}) in job "${job}"${extra}: ${text}`);
  for (const ch of text) if (!BOARD_CHARS.includes(ch)) throw new Error(`unsupported character "${ch}" in ${label} of job "${job}": ${text}`);
}

// rows: [{year, place, company, lines: {all, chem, ops, cust}, weights: {chem, ops, cust}}]
// Returns the same shape with year, place, company and every line upper-cased. Throws on anything the board cannot show.
export function parseJobs(rows) {
  return rows.map((r) => {
    const name = r.company;
    const lines = {};
    for (const l of LENS_ORDER) {
      if (typeof r.lines?.[l] !== 'string') throw new Error(`missing lens "${l}" in job "${name}"`);
      lines[l] = r.lines[l].toUpperCase();
      checkText('line', name, lines[l], LIMITS.note, ` lens ${l}`);
    }
    if (typeof r.place !== 'string') throw new Error(`missing place in job "${name}"`);
    if (typeof r.company !== 'string') throw new Error('missing company in a board job');
    const place = r.place.toUpperCase(), company = r.company.toUpperCase();
    checkText('place', name, place, LIMITS.place);
    checkText('company', name, company, LIMITS.company);
    const weights = {};
    for (const l of WEIGHT_LENSES) {
      const w = Number(r.weights?.[l]);
      if (!(w >= 0 && w <= 1)) throw new Error(`weight for "${l}" must be between 0 and 1 in job "${name}"`);
      weights[l] = w;
    }
    return { year: String(r.year), place, company, lines, weights };
  });
}

// Reads every .job[data-board] under root (data-year, data-place, data-company, data-line-all|chem|ops|cust, data-w-chem|ops|cust).
export function rowsFromDom(root) {
  return [...root.querySelectorAll('.job[data-board]')].map((el) => {
    const d = el.dataset;
    return {
      year: d.year, place: d.place, company: d.company,
      lines: { all: d.lineAll, chem: d.lineChem, ops: d.lineOps, cust: d.lineCust },
      weights: { chem: Number(d.wChem), ops: Number(d.wOps), cust: Number(d.wCust) },
    };
  });
}
