import test from 'node:test';
import assert from 'node:assert/strict';
import { loadClassic } from './lib/load-classic.mjs';

const { normalizeLens, buildHash } = loadClassic('js/route.js', ['normalizeLens', 'buildHash']);

function setup({ active = true, hash = '#cv' } = {}) {
  const events = [];
  const attrs = { 'data-lens': 'all' };
  const el = {
    classList: { contains: (c) => c === 'active' && active },
    setAttribute: (k, v) => { attrs[k] = v; },
    getAttribute: (k) => attrs[k] ?? null,
  };
  const document = { getElementById: (id) => (id === 'page-cv' ? el : null), dispatchEvent: (e) => { events.push(e); return true; } };
  const window = { location: { hash } };
  window.history = { replaceState: (a, b, h) => { window.location.hash = h; } };
  const api = loadClassic('js/lens.js', ['setLens', 'getLens'], { normalizeLens, buildHash, document, window, history: window.history, CustomEvent });
  return { ...api, events, attrs, window };
}

test('setLens sets data-lens on #page-cv, returns the lens and dispatches one mdb:lens event', () => {
  const { setLens, events, attrs } = setup();
  assert.equal(setLens('ops'), 'ops');
  assert.equal(attrs['data-lens'], 'ops');
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'mdb:lens');
  assert.equal(events[0].detail.lens, 'ops');
});

test('setLens with an unknown lens falls back to all', () => {
  const { setLens } = setup();
  assert.equal(setLens('zzz'), 'all');
});

test('setLens dispatches only when the lens actually changes (the board must not re-flip on a no-op)', () => {
  const { setLens, events } = setup();
  setLens('ops'); setLens('ops'); setLens('all');
  assert.equal(events.length, 2);
});

test('setLens updates the hash without adding history when the CV is active', () => {
  const { setLens, window } = setup({ active: true, hash: '#cv' });
  setLens('chem');
  assert.equal(window.location.hash, '#cv/chem');
  setLens('all');
  assert.equal(window.location.hash, '#cv');
});

test('setLens leaves the hash alone when the CV is not the active page', () => {
  const { setLens, window } = setup({ active: false, hash: '#home' });
  setLens('chem');
  assert.equal(window.location.hash, '#home');
});

test('getLens reads the attribute and normalizes it', () => {
  const { setLens, getLens } = setup();
  assert.equal(getLens(), 'all');
  setLens('cust');
  assert.equal(getLens(), 'cust');
});
