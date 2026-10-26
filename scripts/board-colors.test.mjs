import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const rootBlock = read('css/tokens.css').match(/(?:^|[}/])\s*:root\s*\{([^}]*)\}/)[1];
const token = (name) => rootBlock.match(new RegExp(name + '\\s*:\\s*(#[0-9a-f]{6})', 'i'))[1].toLowerCase();
const board = read('modules/board.js');
const lensColor = (key) => board.match(new RegExp('\\b' + key + ':\\s*\\{[^}]*color:\\s*\'(#[0-9a-fA-F]{6})\''))[1].toLowerCase();

test('the board lens colors are the dark-theme tokens: Chemistry teal, Operations blue, Customer-Facing orange', () => {
  assert.equal(lensColor('chem'), token('--teal'));
  assert.equal(lensColor('ops'), token('--blue'));
  assert.equal(lensColor('cust'), token('--orange'));
});

test('the blended reading keeps the board cream', () => {
  assert.equal(lensColor('all'), '#e8e4da');
  assert.equal(lensColor('all'), token('--board-ink'));
});

// ---- Operations is a vivid blue and the reading buttons run all, customer-facing, operations, chemistry (owner, 2026-10-27) ----
test('the Home dots use the same Operations blue as the board and the tabs; gunmetal stays for the surname', () => {
  const home = read('css/home.css');
  assert.match(home, /\.dot-ops\{background:var\(--blue\);\}/);
  assert.doesNotMatch(home, /\.dot-ops\{[^}]*gunmetal/);
  assert.match(home, /h1\.name em\{[^}]*color:var\(--gunmetal\)/);
});

test('the board builds its reading buttons from the data order', () => {
  assert.match(board, /const ORDER = LENS_ORDER;/);
});
