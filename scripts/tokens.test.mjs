import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { contrastRatio } from './lib/contrast.mjs';

const css = fs.readFileSync(new URL('../css/tokens.css', import.meta.url), 'utf8');

// The custom properties declared in the block whose selector is exactly `sel` (top level only).
function block(sel) {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = css.match(new RegExp('(?:^|[}/])\\s*' + esc + '\\s*\\{([^}]*)\\}'));
  assert.ok(m, 'block not found: ' + sel);
  return Object.fromEntries([...m[1].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)].map((x) => [x[1], x[2].trim()]));
}

const DARK = {
  '--bg': '#15130f', '--panel': '#1c1a15', '--ink': '#f2ece1', '--text-2': '#cfc6b4', '--mute': '#968d7c', '--rule': '#322e26',
  '--gold': '#d9ae4c', '--gold-text': '#d9ae4c', '--gunmetal': '#9aa3b0', '--teal': '#3fcf8d', '--orange': '#ff7a4d',
};
const PAPER = {
  '--bg': '#f2ece1', '--panel': '#f8f3e9', '--ink': '#16130e', '--text-2': '#3d3829', '--mute': '#6a6355', '--rule': '#cdc3ae',
  '--gold': '#a47a16', '--gold-text': '#8a640f', '--gunmetal': '#4b5059', '--teal': '#0d7040', '--orange': '#b8431f',
};

test('contrastRatio: black on white is 21 and the dark and paper backgrounds give the brief number', () => {
  assert.equal(Math.round(contrastRatio('#000000', '#ffffff') * 100) / 100, 21);
  assert.ok(Math.abs(contrastRatio('#15130f', '#f2ece1') - 15.78) < 0.01);
});

test('the default :root is the dark column of the brief, token by token', () => {
  const root = block(':root');
  for (const [k, v] of Object.entries(DARK)) assert.equal(root[k], v, k);
});

test('the light theme (paper) holds the paper column of the brief, token by token', () => {
  const light = block(':root[data-theme="light"]');
  for (const [k, v] of Object.entries(PAPER)) assert.equal(light[k], v, k);
});

test('the objects stay dark in both themes: --board and --space are set once, in :root only', () => {
  const root = block(':root');
  assert.equal(root['--board'], '#101012');
  assert.equal(root['--space'], '#07070b');
  const light = block(':root[data-theme="light"]');
  assert.equal(light['--board'], undefined);
  assert.equal(light['--space'], undefined);
});

for (const [name, theme] of [['dark', DARK], ['paper', PAPER]]) {
  test(`${name}: text tokens are at least 4.5:1 on --bg and --panel, and --gold is at least 3:1 on --bg`, () => {
    for (const k of ['--ink', '--text-2', '--mute', '--gold-text', '--gunmetal', '--teal', '--orange']) {
      for (const surface of ['--bg', '--panel']) {
        const r = contrastRatio(theme[k], theme[surface]);
        assert.ok(r >= 4.5, `${k} on ${surface} is ${r.toFixed(2)}`);
      }
    }
    assert.ok(contrastRatio(theme['--gold'], theme['--bg']) >= 3, '--gold on --bg');
  });
}

test('every --font-* ends in a generic family, so a slow or blocked font never leaves the text unstyled', () => {
  const root = block(':root');
  const fonts = Object.entries(root).filter(([k]) => k.startsWith('--font-'));
  assert.deepEqual(fonts.map(([k]) => k).sort(), ['--font-cond', '--font-mono', '--font-sans', '--font-serif']);
  for (const [k, v] of fonts) assert.match(v, /(serif|monospace|sans-serif)\s*$/, k);
});

test('layout tokens: the lens colors point at the lens tokens, spacing, radii and widths match the brief', () => {
  const root = block(':root');
  assert.equal(root['--lens-chem'], 'var(--teal)');
  assert.equal(root['--lens-ops'], 'var(--gunmetal)');
  assert.equal(root['--lens-cust'], 'var(--orange)');
  const sp = { 4: '4px', 8: '8px', 12: '12px', 16: '16px', 24: '24px', 32: '32px', 48: '48px', 72: '72px' };
  for (const [n, v] of Object.entries(sp)) assert.equal(root['--sp-' + n], v, '--sp-' + n);
  assert.equal(root['--r-obj'], '12px');
  assert.equal(root['--r-card'], '6px');
  assert.equal(root['--wrap'], '1140px');
  assert.equal(root['--pad-x'], '48px');
  assert.match(css, /@media\s*\(max-width:\s*700px\)\s*\{[^}]*--pad-x:\s*18px/);
});


test('the dark objects have their own fixed palette: cream, muted, gold and edge, set once in :root and readable on --board', () => {
  const root = block(':root');
  const light = block(':root[data-theme="light"]');
  const want = { '--board-ink': '#e8e4da', '--board-mute': '#968d7c', '--board-gold': '#d9ae4c', '--board-edge': '#2e2e2e' };
  for (const [k, v] of Object.entries(want)) {
    assert.equal(root[k], v, k);
    assert.equal(light[k], undefined, k + ' must not change with the theme');
  }
  for (const k of ['--board-ink', '--board-mute', '--board-gold']) assert.ok(contrastRatio(root[k], root['--board']) >= 4.5, k + ' on --board');
});
