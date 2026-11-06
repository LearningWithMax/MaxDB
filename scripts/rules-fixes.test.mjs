import test from 'node:test';
import assert from 'node:assert/strict';
import { checkBoardLines, checkIntelciaFact, findBannedText, INTELCIA_FACTS } from './lib/rules.mjs';

// Fixes from the final review: the check and the board must agree, and Intelcia is described by approved sentences only.
const jobTag = (over = {}) => {
  const a = { year: '2025', place: 'Yashresh', company: 'Cann.Edenn', line: 'A', ...over };
  return `<div class="job" data-board ${Object.entries(a).filter(([, v]) => v !== null).map(([k, v]) => `data-${k}="${v}"`).join(' ')}></div>`;
};

test('checkBoardLines flags a character the flaps cannot show (the board would hide itself)', () => {
  const msgs = checkBoardLines(jobTag({ line: 'WORLD&#39;S LARGEST' }));
  assert.equal(msgs.length, 1);
  assert.match(msgs[0], /unsupported character/);
});

test('checkBoardLines decodes entities before counting: R&amp;D is three characters', () => {
  const line = 'R&amp;D ' + 'A'.repeat(20);            // 28 characters once decoded, 32 raw
  assert.deepEqual(checkBoardLines(jobTag({ line })), []);
});

// The six sentences the owner approved on 2026-11-06 (his choice B: "resale marketplace" and "retail sector" are fine,
// product names are not). The page may carry them in any order, but nothing else.
test('INTELCIA_FACTS are the six approved sentences, word for word', () => {
  assert.deepEqual(INTELCIA_FACTS, [
    'Reviewed and approved resale marketplace listings (second-hand items in the retail sector) against brand guidelines before publication.',
    "As the team grew from about 10 to 35 agents across new markets, took on the team's quality, onboarding and support on top of the agent role.",
    'Trained and onboarded 30+ new agents and ran their tests.',
    'Served as the live support line for all agents, joining calls to answer case, procedural and technical questions.',
    'Ran weekly quality evaluations of every agent and built an Excel scoreboard to track performance.',
    'Worked daily in French and Spanish.',
  ]);
});

const esc = (t) => t.replace(/&/g, '&amp;').replace(/'/g, '&#39;');
const intelcia = (lis) => `<div class="job"><div class="job-head"><div class="job-title">Customer Service Agent, Intelcia</div></div><ul>${lis.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div><div class="job"><div class="job-title">Next job</div><ul><li>Other</li></ul></div>`;

test('checkIntelciaFact: the approved bullets are clean, with entities decoded', () => {
  assert.deepEqual(checkIntelciaFact(intelcia(INTELCIA_FACTS)), []);
});

test('checkIntelciaFact: any other bullet under Intelcia is flagged (NDA: approved sentences only)', () => {
  const msgs = checkIntelciaFact(intelcia([...INTELCIA_FACTS, 'Supported the shift to hybrid operations through Microsoft Teams sessions.']));
  assert.equal(msgs.length, 1);
  assert.match(msgs[0], /Intelcia/);
});

test('checkIntelciaFact: an entry with no bullet is flagged, and a page with no Intelcia entry is clean', () => {
  assert.equal(checkIntelciaFact(intelcia([])).length, 1);
  assert.deepEqual(checkIntelciaFact('<div class="job"><div class="job-title">Other</div><ul><li>x</li></ul></div>'), []);
});

test('findBannedText flags the Microsoft Teams product name (no product names for Intelcia)', () => {
  assert.ok(findBannedText('f.html', 'through Microsoft Teams sessions').length >= 1);
});
