import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// The definite errors found by the proofreading pass of 2026-10-25 (grammar, punctuation, a Spanish calque, inconsistent forms),
// kept fixed. Each entry: the file, the wrong text, the right text, and how many times the right text appears. A count of 0 means
// the refocus (2026-11-06, one CV reading) removed the text that carried the fix; the wrong text stays banned all the same.
const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const FIXES = [
  ['index.html', "molecular level, I'm French", "molecular level. I'm French", 1, 'a comma where a sentence ends'],
  ['index.html', 'reproductive farms', 'breeder farms', 0, 'granjas reproductoras is "breeder farms" in English'],
  ['index.html', 'QC/QA', 'Laboratory, QA/QC &amp; R&amp;D Support', 0, 'QA/QC everywhere else'],
  ['index.html', 'Lean/5S', 'process improvement (Lean / 5S)', 0, 'Lean / 5S, with spaces, everywhere else'],
  ['js/data.js', 'Visited, England', 'Visited England, Scotland and Wales.', 1, 'a stray comma'],
  ['js/data.js', 'pride seriously, arguing', 'pride seriously. Arguing about food', 1, 'a comma splice before a gerund subject'],

  // Wording batch the owner approved on 2026-10-25 (he confirmed each one or gave the replacement himself).
  ['index.html', 'trusted to represent international brands solo', 'trusted to handle a key client solo at a major trade show early on.', 0, 'the entries describe one key client at one trade show, so the profile claims no more'],
  ['index.html', 'Countries visited across 5 continents', '<div class="label">Countries visited</div>', 1, 'the map and the list do not back a continent count, so the label drops it'],
  ['index.html', 'layer installations', 'broiler and layer facilities', 0, '"installations" is a calque of the Spanish; "facilities" is the English word'],
  ['index.html', 'technical-commercial professional', 'Multilingual technical professional bridging', 0, 'a calque of the Spanish "tecnico-comercial"'],
  ['index.html', "(Nationwide + Int'l)", 'Caracas, Venezuela (nationwide and international)', 0, 'no plus sign or abbreviation in a place line'],
  ['index.html', 'Brazil (SIAVS, S&atilde;o Paulo)', 'Brazil (SIAVS trade show, S&atilde;o Paulo)', 0, 'a reader who does not know SIAVS learns what it is'],
  ['index.html', 'Israel (Central)', 'Central Israel &middot; open to remote', 2, 'one form, the one the Home line and the map already use'],
  ['index.html', 'two words after the copyright', 'the tiny dot at the end of the copyright', 1, 'the dot follows the name, at the end of the copyright line'],
  ['index.html', 'cylinder mixing', 'open mill mixing', 0, 'French "melangeur externe" is an open mill in English'],
  ['index.html', 'Born and raised. The route starts here.', 'trip-stop-what">The route starts here.<', 1, 'stop 1 said "born" three times'],
  ['modules/trip-stops.js', 'Born and raised. The route starts here.', "what: 'The route starts here.'", 1, 'stop 1 said "born" three times'],

  // Second batch, the same day: "commercial" is the French and Spanish word for the sales side, so the bullets say "sales" (job titles keep "Commercial").
  ['index.html', 'technical and commercial staff', 'senior technical and sales staff', 0, 'commercial staff means sales staff'],
  ['index.html', 'senior commercial and technical staff', 'senior sales and technical staff', 0, 'commercial staff means sales staff'],
  ['index.html', 'commercial meetings', '10-12 sales meetings', 1, 'a meeting with clients is a sales meeting'],
  ['index.html', 'commercial quotations', 'sales quotations', 0, 'a quotation for a deal is a sales quotation'],
  ['index.html', 'the commercial team', 'the sales team', 1, 'commercial team means the sales team'],
  ['index.html', 'commercial operations for laboratory', 'sales operations for laboratory analysis services', 0, 'commercial operations means sales operations'],
  ['index.html', 'ongoing commercial projects', 'ongoing client projects', 0, 'these are projects for clients, not "commercial" ones'],
  ['index.html', "I've been promoted fast everywhere I've worked, I just don't sit still.", '<span>I went from Operator to Team Lead within months.</span>', 1, 'the owner disliked the second half; the first half claimed more than the CV shows'],
  ['js/data.js', "caption: 'Sunset in the Jungle'", "caption: 'Sunset in the jungle'", 1, 'sentence case like the other captions'],
  ['js/data.js', "caption: 'Oyster Parks'", "caption: 'Oyster beds'", 1, 'oyster beds is the English term; sentence case'],
];

test('only job titles and one skills heading keep the word "Commercial"; the bullets say sales', () => {
  const html = read('index.html');
  assert.doesNotMatch(html, /commercial/, 'lowercase "commercial" is gone from the page');
  const left = [...html.matchAll(/[^<>]*Commercial[^<>]*/g)].map((m) => m[0].trim());
  const allowed = /^(Commercial Operations|Commercial Technician, Avicampo|Commercial Technical Representative, Laboratorios Chacao|Commercial [a-z ]+ at [A-Z][^.]*.?)$/;
  for (const s of left) assert.match(s, allowed, 'unexpected "Commercial" in: ' + s);
});

for (const [file, bad, good, times, why] of FIXES) {
  test(times === 0 ? `${file}: "${bad}" stays gone (${why}; the refocus removed the fixed text)` : `${file}: "${bad}" is gone and "${good}" is there${times > 1 ? ' ' + times + ' times' : ''} (${why})`, () => {
    const text = read(file);
    assert.ok(!text.includes(bad), `still has: ${bad}`);
    assert.equal(text.split(good).length - 1, times, `expected ${times} of: ${good}`);
  });
}

// ---- claims the page makes, as the owner decided them (2026-10-25) ----
test('the consent banner says what Google Analytics really does, and no longer claims no data is shared', () => {
  const html = read('index.html');
  assert.ok(html.includes('<p>This site uses Google Analytics to count visits and see which pages people open. I do not sell any data.</p>'));
  assert.doesNotMatch(html, /No data is sold or shared|just visit counts/);
});

test('"material output" never comes back (the owner confirmed the Cann.Edenn duty was waste output; since the refocus the job no longer lists it)', () => {
  assert.doesNotMatch(read('index.html'), /material output/);
});
