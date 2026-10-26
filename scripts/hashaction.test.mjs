import test from 'node:test';
import assert from 'node:assert/strict';
import { loadClassic } from './lib/load-classic.mjs';

const { hashAction } = loadClassic('js/route.js', ['hashAction']);

test('hashAction: a hash that already matches is left alone', () => {
  assert.equal(hashAction('#cv/ops', '#cv/ops', true), 'none');
  assert.equal(hashAction('#home', '#home', false), 'none');
});

test('hashAction: normalizing the hash a visitor arrived with REPLACES the entry, so Back does not bounce (Review Focus 4)', () => {
  assert.equal(hashAction('', '#home', true), 'replace');
  assert.equal(hashAction('#CV/OPS', '#cv/ops', true), 'replace');
  assert.equal(hashAction('#cv/foo', '#cv', true), 'replace');
});

test('hashAction: the visitor navigating pushes a new entry', () => {
  assert.equal(hashAction('#home', '#cv', false), 'push');
});
