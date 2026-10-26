import test from 'node:test';
import assert from 'node:assert/strict';
import { checkBoardLines, checkIntelciaFact, findBannedText } from './lib/rules.mjs';

// Fixes from the final review: the check and the board must agree, and Intelcia is described by one fact only.
const jobTag = (over = {}) => {
  const a = { year: '2025', place: 'Yashresh', company: 'Cann.Edenn', 'line-all': 'A', 'line-chem': 'B', 'line-ops': 'C', 'line-cust': 'D', 'w-chem': '1', 'w-ops': '1', 'w-cust': '1', ...over };
  return `<div class="job" data-board ${Object.entries(a).filter(([, v]) => v !== null).map(([k, v]) => `data-${k}="${v}"`).join(' ')}></div>`;
};

test('checkBoardLines flags a character the flaps cannot show (the board would hide itself)', () => {
  const msgs = checkBoardLines(jobTag({ 'line-ops': 'WORLD&#39;S LARGEST' }));
  assert.equal(msgs.length, 1);
  assert.match(msgs[0], /unsupported character/);
});

test('checkBoardLines flags a missing or bad weight', () => {
  assert.match(checkBoardLines(jobTag({ 'w-ops': null })).join(' '), /weight/);
  assert.match(checkBoardLines(jobTag({ 'w-chem': '2' })).join(' '), /weight/);
});

test('checkBoardLines decodes entities before counting: R&amp;D is three characters', () => {
  const line = 'R&amp;D ' + 'A'.repeat(20);            // 28 characters once decoded, 32 raw
  assert.deepEqual(checkBoardLines(jobTag({ 'line-chem': line })), []);
});

const FACT = 'Onboarded every new hire as the team grew from about 10 to 35.';
const intelcia = (lis) => `<div class="job"><div class="job-head"><div class="job-title">Operations Support &amp; Team Coordinator, Intelcia</div></div><ul>${lis.map((t) => `<li>${t}</li>`).join('')}</ul></div><div class="job"><div class="job-title">Next job</div><ul><li>Other</li></ul></div>`;

test('checkIntelciaFact: the one approved bullet is clean, also repeated across lens variants', () => {
  assert.deepEqual(checkIntelciaFact(intelcia([FACT])), []);
  assert.deepEqual(checkIntelciaFact(intelcia([FACT, FACT, FACT, FACT])), []);
});

test('checkIntelciaFact: any other bullet under Intelcia is flagged (NDA: one fact only)', () => {
  const msgs = checkIntelciaFact(intelcia([FACT, 'Supported the shift to hybrid operations through Microsoft Teams sessions.']));
  assert.equal(msgs.length, 1);
  assert.match(msgs[0], /Intelcia/);
});

test('checkIntelciaFact: a page with no Intelcia entry is clean', () => {
  assert.deepEqual(checkIntelciaFact('<div class="job"><div class="job-title">Other</div><ul><li>x</li></ul></div>'), []);
});

test('findBannedText flags the Microsoft Teams product name (Intelcia is one fact only)', () => {
  assert.ok(findBannedText('f.html', 'through Microsoft Teams sessions').length >= 1);
});
