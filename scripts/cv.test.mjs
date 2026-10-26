import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const html = read('index.html');
const cv = html.slice(html.indexOf('id="page-cv"'), html.indexOf('id="page-trip"'));
const css = read('css/cv.css');
const boardCss = read('css/board.css');
// the declarations of the first rule whose selector is exactly `sel`
const rule = (source, sel) => {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = source.match(new RegExp('(?:^|[}/])\\s*' + esc + '\\s*\\{([^}]*)\\}'));
  assert.ok(m, 'rule not found: ' + sel);
  return m[1];
};

test('CV header: a mono kicker with the place, the name with an italic surname, then the lens headline, then the contact row without the place', () => {
  const head = cv.slice(cv.indexOf('<div class="cv-header">'), cv.indexOf('<section class="cv-board"'));
  const at = ['<p class="kicker">Central Israel &middot; open to remote</p>', '<h1>Max Duffaud <em>Bibas</em></h1>', 'data-lens-group="headline"', 'class="contact-row"'].map((s) => { const i = head.indexOf(s); assert.ok(i >= 0, s); return i; });
  assert.deepEqual(at, [...at].sort((a, b) => a - b));
  assert.doesNotMatch(head.slice(head.indexOf('class="contact-row"')), /Israel/);
  assert.match(head, /duffaud\.max@gmail\.com/);
  assert.match(head, /linkedin\.com\/in\/max-duffaud/);
});

test('the board section has the figure caption between the frame and the existing note', () => {
  const sec = cv.slice(cv.indexOf('<section class="cv-board"'), cv.indexOf('</section>', cv.indexOf('<section class="cv-board"')));
  const frame = sec.indexOf('class="cv-board-frame"'), cap = sec.indexOf('<p class="cap cv-board-cap">Fig. 1. Seven jobs, three readings.</p>'), note = sec.indexOf('class="cv-board-note"');
  assert.ok(frame >= 0 && cap > frame && note > cap, 'frame, then caption, then note');
});

test('css: the name, the headline and the section headings are in the serif and Inter voices at the brief sizes', () => {
  assert.match(rule(css, '.cv-header h1'), /clamp\(56px,\s*10vw,\s*120px\)/);
  assert.match(rule(css, '.cv-header h1'), /var\(--font-serif\)/);
  assert.match(rule(css, '.cv-header h1 em'), /font-style:\s*italic/);
  assert.match(rule(css, '.cv-header h1 em'), /color:\s*var\(--gunmetal\)/);
  assert.match(rule(css, '.cv-header .role'), /var\(--font-sans\)/);
  assert.match(rule(css, '.cv-section h2'), /font:\s*400 34px\/[\d.]+ var\(--font-serif\)/);
});

test('css: certificates, skills and education are panel cards with a 1px rule and 6px corners', () => {
  for (const sel of ['.skill-card', '.cert-item', '.edu-item']) {
    const r = rule(css, sel);
    assert.match(r, /background:\s*var\(--panel\)/, sel);
    assert.match(r, /border:\s*1px solid var\(--rule\)/, sel);
    assert.match(r, /border-radius:\s*var\(--r-card\)/, sel);
  }
  assert.match(rule(css, '.skills-grid'), /gap:\s*var\(--sp-16\)/);
});

test('css: experience is a ruled table, dates left and the serif title and bullets right, one column on phones', () => {
  assert.match(rule(css, '.job'), /display:\s*grid/);
  assert.match(rule(css, '.job'), /grid-template-columns:\s*minmax\(150px,\s*220px\)\s+1fr/);
  assert.match(rule(css, '.job-head'), /display:\s*contents/);
  assert.match(rule(css, '.job-title'), /var\(--font-serif\)/);
  assert.match(rule(css, '.job-meta'), /var\(--font-mono\)/);
  assert.match(rule(css, '.cv-section h2 + .job'), /border-top:\s*1px solid var\(--ink\)/);
  assert.match(css, /@media\s*\(max-width:\s*700px\)\s*\{[^@]*\.job\s*\{[^}]*grid-template-columns:\s*1fr/);
});

test('css: the language items are outlined mono pills', () => {
  const r = rule(css, '.lang-item');
  assert.match(r, /border-radius:\s*999px/);
  assert.match(r, /var\(--font-mono\)/);
});

test('board.css: the tabs are outlined mono pills, the active one is filled ink, and the dot colors come from the tokens in both themes', () => {
  assert.match(rule(boardCss, '.cv-board-tabs button'), /border-radius:\s*999px/);
  assert.match(rule(boardCss, '.cv-board-tabs button'), /var\(--font-mono\)/);
  const on = rule(boardCss, '.cv-board-tabs button[aria-pressed=true]');
  assert.match(on, /background:\s*var\(--ink\)/);
  assert.match(on, /color:\s*var\(--bg\)/);
  for (const [l, tok] of [['all', '--ink'], ['chem', '--lens-chem'], ['ops', '--lens-ops'], ['cust', '--lens-cust']]) {
    assert.match(rule(boardCss, `.cv-board-tabs button[data-l="${l}"]`), new RegExp(`--lc:\\s*var\\(${tok}\\)\\s*!important`), l);
  }
});

test('board.css: the real board is the one star (gold outline, offset 4px) with a deep shadow, and it is not rotated (a rotated canvas softens the flap text)', () => {
  const f = rule(boardCss, '.cv-board-frame');
  assert.match(f, /outline:\s*1\.5px solid var\(--gold\)/);
  assert.match(f, /outline-offset:\s*4px/);
  assert.match(f, /box-shadow:\s*0 18px 50px rgba\(0,0,0,\.45\)/);
  assert.doesNotMatch(boardCss, /rotate\(/, 'no rotation anywhere in board.css');
});
