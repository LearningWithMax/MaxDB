import test from 'node:test';
import assert from 'node:assert/strict';
import { parseJobs, dotFor, rowsFromDom } from '../modules/board-data.js';

const row = (over = {}) => ({
  year: '2025', place: 'Yashresh', company: 'Cann.Edenn',
  lines: { all: 'Team lead, greenhouses', chem: 'Regulated production', ops: 'Ran daily greenhouse flow', cust: 'Link: crew and management' },
  weights: { chem: 0.6, ops: 1, cust: 0.5 },
  ...over,
});

test('parseJobs upper-cases every line, place and company', () => {
  const [job] = parseJobs([row()]);
  assert.equal(job.lines.all, 'TEAM LEAD, GREENHOUSES');
  assert.equal(job.lines.cust, 'LINK: CREW AND MANAGEMENT');
  assert.equal(job.place, 'YASHRESH');
  assert.equal(job.company, 'CANN.EDENN');
  assert.equal(job.weights.ops, 1);
});

test('parseJobs throws "line too long" for a 29-character line and accepts 28', () => {
  const ok = 'A'.repeat(28), tooLong = 'A'.repeat(29);
  assert.doesNotThrow(() => parseJobs([row({ lines: { all: ok, chem: ok, ops: ok, cust: ok } })]));
  assert.throws(() => parseJobs([row({ lines: { all: ok, chem: ok, ops: tooLong, cust: ok } })]), /line too long/);
});

test('parseJobs throws "missing lens" when a lens line is absent', () => {
  assert.throws(() => parseJobs([row({ lines: { all: 'A', chem: 'B', cust: 'D' } })]), /missing lens/);
});

test('parseJobs rejects a place or company wider than its column', () => {
  assert.throws(() => parseJobs([row({ place: 'Clermont-Ferrand' })]), /place too long/);
  assert.throws(() => parseJobs([row({ company: 'Laboratorios' })]), /company too long/);
});

test('parseJobs rejects a character the flaps cannot show', () => {
  assert.throws(() => parseJobs([row({ lines: { all: 'Plasson (Israel)', chem: 'B', ops: 'C', cust: 'D' } })]), /unsupported character/);
});

test('parseJobs rejects a weight outside 0 to 1', () => {
  assert.throws(() => parseJobs([row({ weights: { chem: 2, ops: 1, cust: 1 } })]), /weight/);
});

test('dotFor: full at 0.8, half at 0.45, empty below', () => {
  assert.equal(dotFor(1), '\u25cf');
  assert.equal(dotFor(0.8), '\u25cf');
  assert.equal(dotFor(0.5), '\u25d1');
  assert.equal(dotFor(0.2), '\u25cb');
});

test('rowsFromDom reads the data attributes of every .job[data-board]', () => {
  const el = { dataset: { year: '2024', place: 'Caracas', company: 'Avicampo', lineAll: 'A', lineChem: 'B', lineOps: 'C', lineCust: 'D', wChem: '0.4', wOps: '0.6', wCust: '1' } };
  const root = { querySelectorAll: (sel) => (sel === '.job[data-board]' ? [el] : []) };
  const rows = rowsFromDom(root);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].lines, { all: 'A', chem: 'B', ops: 'C', cust: 'D' });
  assert.deepEqual(rows[0].weights, { chem: 0.4, ops: 0.6, cust: 1 });
  assert.equal(rows[0].company, 'Avicampo');
});
