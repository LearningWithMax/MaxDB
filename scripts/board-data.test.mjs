import test from 'node:test';
import assert from 'node:assert/strict';
import * as boardData from '../modules/board-data.js';
const { parseJobs, rowsFromDom } = boardData;

const row = (over = {}) => ({ year: '2025', place: 'Yashresh', company: 'Cann.Edenn', line: 'Operator to team lead', ...over });

test('parseJobs upper-cases the line, the place and the company', () => {
  const [job] = parseJobs([row()]);
  assert.equal(job.line, 'OPERATOR TO TEAM LEAD');
  assert.equal(job.place, 'YASHRESH');
  assert.equal(job.company, 'CANN.EDENN');
  assert.equal(job.year, '2025');
});

test('parseJobs throws "line too long" for a 29-character line and accepts 28', () => {
  assert.doesNotThrow(() => parseJobs([row({ line: 'A'.repeat(28) })]));
  assert.throws(() => parseJobs([row({ line: 'A'.repeat(29) })]), /line too long/);
});

test('parseJobs throws "missing line" when a job has no line', () => {
  assert.throws(() => parseJobs([row({ line: undefined })]), /missing line/);
});

test('parseJobs rejects a place or company wider than its column', () => {
  assert.throws(() => parseJobs([row({ place: 'Clermont-Ferrand' })]), /place too long/);
  assert.throws(() => parseJobs([row({ company: 'Laboratorios' })]), /company too long/);
});

test('parseJobs rejects a character the flaps cannot show', () => {
  assert.throws(() => parseJobs([row({ line: 'Plasson (Israel)' })]), /unsupported character/);
});

test('rowsFromDom reads the year, place, company and line of every .job[data-board]', () => {
  const el = { dataset: { year: '2024', place: 'Caracas', company: 'Avicampo', line: 'Clients at IPPE Atlanta' } };
  const root = { querySelectorAll: (sel) => (sel === '.job[data-board]' ? [el] : []) };
  assert.deepEqual(rowsFromDom(root), [{ year: '2024', place: 'Caracas', company: 'Avicampo', line: 'Clients at IPPE Atlanta' }]);
});

test('no reading is left in the board data: no lens order, no weights, no dots (one CV reading, owner 2026-11-06)', () => {
  assert.equal('LENS_ORDER' in boardData, false);
  assert.equal('dotFor' in boardData, false);
  assert.doesNotMatch(JSON.stringify(parseJobs([row()])), /weights|lines/);
});
