import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadClassic } from './lib/load-classic.mjs';

// resolveTheme and readStoredTheme run in the inline <head> script, before first paint. They sit between markers so this
// test evaluates exactly what ships.
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const m = html.match(/\/\*theme:start\*\/([\s\S]*?)\/\*theme:end\*\//);
assert.ok(m, 'index.html must contain /*theme:start*/ ... /*theme:end*/');
const { resolveTheme, readStoredTheme } = new Function(m[1] + '\n;return { resolveTheme, readStoredTheme };')();

test('resolveTheme: only the exact stored value "light" gives paper', () => {
  assert.equal(resolveTheme('light'), 'light');
  for (const v of ['dark', null, undefined, '', 'LIGHT', 'purple', 1, {}]) assert.equal(resolveTheme(v), 'dark', String(v));
});

test('readStoredTheme: blocked storage reads as no choice, a stored value comes back as is', () => {
  assert.equal(readStoredTheme({ getItem() { throw new Error('SecurityError'); } }), null);
  assert.equal(readStoredTheme({ getItem: (k) => (k === 'mdb-theme' ? 'light' : null) }), 'light');
  assert.equal(readStoredTheme({ getItem: () => null }), null);
});

// theme.js against a fake page: an <html> with attributes and a class list, a storage, and timers we can run by hand
function setup({ attr = null, throwOnSet = false, reduced = false } = {}) {
  const attrs = attr ? { 'data-theme': attr } : {};
  const classes = new Set();
  const timers = [];
  const stored = {};
  const documentElement = {
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    setAttribute: (k, v) => { attrs[k] = v; },
    classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c) },
  };
  const localStorage = { setItem: (k, v) => { if (throwOnSet) throw new Error('QuotaExceeded'); stored[k] = v; } };
  const setTimeoutFake = (fn, ms) => { timers.push({ fn, ms }); return timers.length; };
  const matchMedia = (q) => ({ matches: reduced && /reduced-motion/.test(q) });
  const api = loadClassic('js/theme.js', ['currentTheme', 'toggleTheme'], { document: { documentElement }, localStorage, setTimeout: setTimeoutFake, matchMedia });
  return { ...api, attrs, classes, timers, stored };
}

test('currentTheme: reads the attribute and treats anything else as dark', () => {
  assert.equal(setup({ attr: 'light' }).currentTheme(), 'light');
  assert.equal(setup({ attr: 'dark' }).currentTheme(), 'dark');
  assert.equal(setup({}).currentTheme(), 'dark');
  assert.equal(setup({ attr: 'purple' }).currentTheme(), 'dark');
});

test('toggleTheme: dark to paper stores "light", paper to dark stores "dark", and returns the new theme', () => {
  const a = setup({ attr: 'dark' });
  assert.equal(a.toggleTheme(), 'light');
  assert.equal(a.attrs['data-theme'], 'light');
  assert.equal(a.stored['mdb-theme'], 'light');
  const b = setup({ attr: 'light' });
  assert.equal(b.toggleTheme(), 'dark');
  assert.equal(b.attrs['data-theme'], 'dark');
  assert.equal(b.stored['mdb-theme'], 'dark');
});

test('toggleTheme: blocked storage still flips the theme (it just is not remembered)', () => {
  const a = setup({ attr: 'dark', throwOnSet: true });
  assert.equal(a.toggleTheme(), 'light');
  assert.equal(a.attrs['data-theme'], 'light');
});

test('toggleTheme: the 250 ms crossfade class is added, then removed after 300 ms, and skipped under reduced motion', () => {
  const a = setup({ attr: 'dark' });
  a.toggleTheme();
  assert.ok(a.classes.has('theme-fade'));
  assert.equal(a.timers.length, 1);
  assert.equal(a.timers[0].ms, 300);
  a.timers[0].fn();
  assert.ok(!a.classes.has('theme-fade'));
  const calm = setup({ attr: 'dark', reduced: true });
  calm.toggleTheme();
  assert.ok(!calm.classes.has('theme-fade'));
  assert.equal(calm.timers.length, 0);
});

test('the head script sets data-theme before first paint through resolveTheme(readStoredTheme(...)), and the markup never hardcodes paper', () => {
  assert.match(html, /resolveTheme\(\s*readStoredTheme\(\s*window\.localStorage\s*\)\s*\)/);
  assert.match(html, /setAttribute\('data-theme',\s*theme\)/);
  assert.doesNotMatch(html, /data-theme="light"/);
});

test('js/theme.js loads before js/nav.js, and nav.js no longer defines toggleTheme', () => {
  const at = (s) => html.indexOf(`<script src="${s}"></script>`);
  assert.ok(at('js/theme.js') > 0, 'theme.js is in the script list');
  assert.ok(at('js/theme.js') < at('js/nav.js'));
  assert.doesNotMatch(fs.readFileSync(new URL('../js/nav.js', import.meta.url), 'utf8'), /function toggleTheme/);
});

test('base.css has the temporary crossfade rule: 250 ms on color, background and border', () => {
  const css = fs.readFileSync(new URL('../css/base.css', import.meta.url), 'utf8');
  const rule = css.match(/html\.theme-fade[^{]*\{([^}]*)\}/);
  assert.ok(rule, 'html.theme-fade rule');
  assert.match(rule[1], /background-color\s+\.25s/);
  assert.match(rule[1], /(^|[\s;])color\s+\.25s/);
  assert.match(rule[1], /border-color\s+\.25s/);
});
