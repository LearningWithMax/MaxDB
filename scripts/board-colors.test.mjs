import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const rootBlock = read('css/tokens.css').match(/(?:^|[}/])\s*:root\s*\{([^}]*)\}/)[1];
const token = (name) => rootBlock.match(new RegExp(name + '\\s*:\\s*(#[0-9a-f]{6})', 'i'))[1].toLowerCase();
const board = read('modules/board.js');
const lensColor = (key) => board.match(new RegExp('\\b' + key + ':\\s*\\{[^}]*color:\\s*\'(#[0-9a-fA-F]{6})\''))[1].toLowerCase();

test('the board lens colors are the dark-theme tokens: Chemistry teal, Operations gunmetal, Customer-Facing orange', () => {
  assert.equal(lensColor('chem'), token('--teal'));
  assert.equal(lensColor('ops'), token('--gunmetal'));
  assert.equal(lensColor('cust'), token('--orange'));
});

test('the blended reading keeps the board cream', () => {
  assert.equal(lensColor('all'), '#e8e4da');
  assert.equal(lensColor('all'), token('--board-ink'));
});
