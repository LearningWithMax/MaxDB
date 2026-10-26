import test from 'node:test';
import assert from 'node:assert/strict';
import { findChrome, CHROME_CANDIDATES } from './lib/cdp.mjs';

test('findChrome returns the first candidate that exists, in the order listed', () => {
  const have = new Set([CHROME_CANDIDATES[1], CHROME_CANDIDATES[2]]);
  assert.equal(findChrome((p) => have.has(p)), CHROME_CANDIDATES[1]);
  assert.equal(findChrome(() => true), CHROME_CANDIDATES[0]);
});

test('findChrome returns null when no browser is installed, and a custom list is honored', () => {
  assert.equal(findChrome(() => false), null);
  assert.equal(findChrome((p) => p === 'b', ['a', 'b', 'c']), 'b');
});

test('Chrome comes before Edge in the candidates, and every candidate is an absolute .exe path', () => {
  const firstEdge = CHROME_CANDIDATES.findIndex((p) => /msedge/i.test(p));
  const lastChrome = CHROME_CANDIDATES.map((p) => /chrome\.exe$/i.test(p)).lastIndexOf(true);
  assert.ok(lastChrome >= 0 && firstEdge > lastChrome);
  for (const p of CHROME_CANDIDATES) assert.match(p, /^[A-Za-z]:\/.*\.exe$/);
});
