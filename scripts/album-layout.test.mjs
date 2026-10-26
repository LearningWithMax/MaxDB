import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// The phone fixes the owner asked for on 2026-10-27, from screenshots of the live site on his iPhone:
// the album popup (a long caption ran over the photo, and a lone third photo sat at the left), the Albums buttons on the Trip page
// (a wrapped button sat under the label, not under the first button) and the footer (three unevenly spaced left-aligned lines).
const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const map = read('css/map.css');
const trip = read('css/trip.css');
const chrome = read('css/chrome.css');
const html = read('index.html');
const rule = (source, sel) => {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = source.match(new RegExp('(?:^|[}/])\\s*' + esc + '\\s*\\{([^}]*)\\}'));
  assert.ok(m, 'rule not found: ' + sel);
  return m[1];
};
const phone = (source) => source.match(/@media\s*\(max-width:\s*700px\)\s*\{[\s\S]*$/)[0];

test('album popup: a long caption sits under the photo inside the card, never over the photo', () => {
  const cap = rule(map, '.album-photo-caption');
  assert.doesNotMatch(cap, /position:\s*absolute/, 'in the flow, so a two-line caption grows the card');
  assert.match(cap, /padding:\s*0 28px/, 'room on both sides, so the text stays clear of the molecule mark in the corner');
  assert.match(cap, /text-align:\s*center/);
  assert.match(cap, /text-wrap:\s*balance/, 'a caption of three short lines breaks evenly');
  const card = rule(map, '.album-photo-card');
  assert.match(card, /display:\s*flex/);
  assert.match(card, /flex-direction:\s*column/);
});

test('album popup: three photos to a row, two on a phone, and a short last row is centered', () => {
  const grid = rule(map, '.album-photo-grid');
  assert.match(grid, /display:\s*flex/);
  assert.match(grid, /flex-wrap:\s*wrap/);
  assert.match(grid, /justify-content:\s*center/);
  assert.match(rule(map, '.album-photo-card'), /width:\s*calc\(\(100% - 36px\) \/ 3\)/);
  assert.match(phone(map), /\.album-photo-card\s*\{[^}]*width:\s*calc\(\(100% - 18px\) \/ 2\)/);
  assert.doesNotMatch(map, /grid-template-columns/, 'no fixed grid left: the last row would sit at the left');
});

test('Trip page: the Albums label stands beside the buttons, and a second row of buttons starts under the first button', () => {
  assert.match(html, /<span class="kicker">Albums<\/span>\s*<div class="trip-album-list">\s*(?:<button class="pill"[^>]*>\w+<\/button>\s*){4}<\/div>/);
  assert.match(rule(trip, '.trip-albums'), /align-items:\s*baseline/);
  assert.doesNotMatch(rule(trip, '.trip-albums'), /flex-wrap/, 'the buttons wrap inside their own list, not under the label');
  assert.match(rule(trip, '.trip-album-list'), /flex-wrap:\s*wrap/);
});

test('footer on a phone: one centered stack, the links, then the credit, then the copyright', () => {
  const p = phone(chrome);
  assert.match(p, /footer\s*\{[^}]*flex-direction:\s*column[^}]*align-items:\s*center/);
  assert.match(p, /footer \.footer-left, footer \.built-with, footer \.copyright\s*\{[^}]*flex:\s*0 0 auto[^}]*text-align:\s*center/);
  assert.match(p, /footer \.footer-left\s*\{[^}]*justify-content:\s*center/);
});
