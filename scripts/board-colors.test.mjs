import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const rootBlock = read('css/tokens.css').match(/(?:^|[}/])\s*:root\s*\{([^}]*)\}/)[1];
const token = (name) => rootBlock.match(new RegExp(name + '\\s*:\\s*(#[0-9a-f]{6})', 'i'))[1].toLowerCase();
const board = read('modules/board.js');

test('the board ink stays cream: the --board-ink token', () => {
  const ink = board.match(/const INK = '(#[0-9a-fA-F]{6})'/);
  assert.ok(ink, 'const INK in modules/board.js');
  assert.equal(ink[1].toLowerCase(), '#e8e4da');
  assert.equal(ink[1].toLowerCase(), token('--board-ink'));
});

test('gunmetal stays for the surname', () => {
  assert.match(read('css/home.css'), /h1\.name em\{[^}]*color:var\(--gunmetal\)/);
});

test('the board has no reading buttons and does not listen for a reading (one CV reading, owner 2026-11-06)', () => {
  assert.doesNotMatch(board, /LENS|mdb:lens|getLens|setLens|cv-board-tabs|dotFor/);
});
