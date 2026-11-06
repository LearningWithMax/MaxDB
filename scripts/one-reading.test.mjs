// The refocus (owner, approved in rounds on 2026-11-06): the CV is one reading, Customer Success & Onboarding, and the
// three reading buttons are gone. The site's design stays; only the content changed. The words below are his approved
// wording, pinned so a later edit cannot drift from what he said yes to. The site before the refocus is the tag v2-three-readings.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SEO } from './lib/seo.mjs';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const html = read('index.html');
const cv = html.slice(html.indexOf('id="page-cv"'), html.indexOf('id="page-trip"'));
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&middot;/g, '·').replace(/&atilde;/g, 'ã');
const text = (s) => decode(s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());

test('one reading: no lens script, no lens attributes and no reading address anywhere in the page', () => {
  assert.equal(fs.existsSync(new URL('../js/lens.js', import.meta.url)), false, 'js/lens.js is deleted');
  assert.doesNotMatch(html, /js\/lens\.js|data-lens|#cv\//);
});

test('the profile is one paragraph and ends on trust (owner, 2026-11-06)', () => {
  const ps = [...cv.matchAll(/<p class="profile-text">([\s\S]*?)<\/p>/g)].map((m) => text(m[1]));
  assert.equal(ps.length, 1);
  assert.equal(ps[0], 'Multilingual customer onboarding and support professional, native in French and Spanish (Latin American) and fluent in English. ' +
    'Trained and onboarded 30+ agents as a resale marketplace operation expanded to new markets, ran weekly quality evaluations and built the tracking tools behind them. ' +
    'Background in chemistry and B2B technical sales support, explaining technical products to clients in Venezuela and the US. ' +
    'Builds and deploys web apps with AI (Claude Code, Supabase, Vercel). ' +
    'Earns trust and responsibility fast: promoted from Operator to Team Lead within months at Cann.Edenn, became the go-to person who reviewed, trained and supported the other agents at Intelcia without a title change, and led a new R&D project as a work-study student at Michelin. ' +
    'Reliable, learns quickly and does more than the job asks.');
});

test('the seven jobs: titles, places and board lines in order', () => {
  const jobs = [...cv.matchAll(/<div class="job" data-board ([^>]*)>\s*<div class="job-head"><div class="job-title">([^<]+)<\/div><div class="job-meta">([^<]+)<\/div>/g)]
    .map((m) => [decode(m[2]), decode(m[3]), (m[1].match(/data-line="([^"]+)"/) || [])[1]]);
  assert.deepEqual(jobs, [
    ['Team Lead, Cann.Edenn', 'Yashresh, Israel · Jul 2025 to May 2026', 'OPERATOR TO TEAM LEAD'],
    ['Commercial Technician, Avicampo', 'Caracas, Venezuela · Aug 2024 to Mar 2025', 'CLIENTS AT IPPE ATLANTA'],
    ['Customer Service Agent, Intelcia', 'Madrid, Spain · Aug 2023 to Feb 2024', 'TRAINED 30+ NEW AGENTS'],
    ['Commercial Technical Representative, Laboratorios Chacao', 'Caracas, Venezuela · Aug 2022 to Jul 2023', 'CLIENT ACCOUNT FOLLOW-UP'],
    ['Laboratory Assistant, Weizmann Institute of Science', 'Rehovot, Israel · Jun 2021 to Aug 2021', 'ALGAE CALCITE RESEARCH'],
    ['R&D Technician (Work-Study), Michelin, ESBN Team', 'Clermont-Ferrand, France · Sep 2019 to Feb 2021', 'LED A NEW SIMULATION PROJECT'],
    ['Laboratory Technician (Research Internship), ICPF, Czech Academy of Sciences', 'Prague, Czech Republic · Mar 2019 to Jun 2019', 'HPLC RESEARCH INTERNSHIP'],
  ]);
});

test('the job bullets are the approved ones (Intelcia has its own rule in check.mjs)', () => {
  const blocks = cv.split('<div class="job" data-board').slice(1).map((b) => [...b.slice(0, b.indexOf('</ul>')).matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => text(m[1])));
  assert.equal(blocks.length, 7);
  assert.deepEqual(blocks[0], ['Promoted from Operator to Team Lead within months.', 'Trained new team members and coordinated daily workflow across multiple greenhouses, acting as the link between workers and management.']);
  assert.deepEqual(blocks[1], [
    'Joined field visits to 7-8 major clients, assessing technical needs and equipment status.',
    // his PDF wording with his own 2026-10-25 rules applied ("sales", not "commercial"; SIAVS named as a trade show)
    "Took part in 10-12 sales meetings, including IPPE in Atlanta (the world's largest poultry trade show) and the SIAVS trade show in São Paulo.",
    'Handled a French-speaking client alone at IPPE on behalf of the Plasson team, gathering technical requirements. Worked in Spanish and English.',
  ]);
  assert.equal(blocks[2].length, 6);
  assert.deepEqual(blocks[3], [
    'Provided technical guidance and follow-up for long-standing client accounts on lab analysis services, feed supplements and sanitation products.',
    'Assisted with about 10 quotations.',
    'Automated Excel reporting for the sales team.',
  ]);
  assert.deepEqual(blocks[4], ['Supported biochemistry research on calcite biomineralization in algae.']);
  assert.deepEqual(blocks[5], [
    'Started and led a new R&D project in elastomer research: modeled rubber and additives in Materials Studio, then made and tested the same compounds in the lab and compared the results.',
    'The aim: find the right additives by simulation before any lab work, saving time and materials. Presented the results to the team and management.',
  ]);
  assert.deepEqual(blocks[6], ['Ran HPLC and HPLC-MS analyses and reported the results to research teams.']);
  assert.doesNotMatch(cv, /\bfirst\b[^<]*Michelin|Michelin[^<]*\bfirst\b/i, 'never "first at Michelin" (he cannot confirm it)');
});

test('Core Skills: one set of four cards with the approved words', () => {
  assert.equal([...cv.matchAll(/class="skills-grid"/g)].length, 1);
  const cards = [...cv.matchAll(/<div class="skill-card">\s*<h3>([^<]+)<\/h3>\s*<p>([^<]+)<\/p>/g)].map((m) => [decode(m[1]), decode(m[2])]);
  assert.deepEqual(cards, [
    ['Customer Success & Onboarding', 'Customer onboarding, account follow-up, live support, technical product explanation, cross-cultural client communication.'],
    ['Team Support & Training', 'New-hire training and tests, weekly quality evaluations, Excel scoreboards, daily workflow coordination, the link between a team and management.'],
    ['Tools & AI', 'Google Sheets, Excel (formulas, pivot tables). Claude Code, Supabase and Vercel to build and deploy web apps.'],
    ['Technical Background', 'Chemistry, lab analysis (HPLC), polymer formulation and molecular simulation. At ease explaining technical products to clients.'],
  ]);
});

test('Education: one text each, the Master\'s leads with sales', () => {
  const edu = cv.slice(cv.indexOf('<h2>Education</h2>'));
  const ps = [...edu.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => text(m[1]));
  assert.deepEqual(ps, [
    'Chemical industry management, with sales, marketing and finance alongside QA/QC and operations. Thesis: applying 5S / Lean methodology to R&D laboratory environments, based on the Michelin experience.',
    'Completed alongside the Michelin work-study program in an industrial R&D environment.',
    'Analytical chemistry, synthetic chemistry, laboratory methods and instrumental analysis foundations.',
  ]);
});

test('the nutshell story says Customer Success, and Customer-Facing is gone from the page', () => {
  assert.match(html, /<div class="icon-node" data-label="Customer Success">/);
  assert.doesNotMatch(html, /Customer-Facing/);
});

test('the search and sharing preview says the goal (owner, 2026-11-06)', () => {
  assert.equal(SEO.title, 'Max Duffaud Bibas | Customer Success & Onboarding');
  assert.equal(SEO.description, 'Customer success and onboarding in French, Spanish and English. 30+ new agents trained, seven jobs across five countries. CV, projects and trip. Open to remote.');
});
