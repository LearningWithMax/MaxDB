import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { checkNoLoops, checkCssVars } from './lib/rules.mjs';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const cssFiles = Object.fromEntries(fs.readdirSync(new URL('../css/', import.meta.url)).filter((f) => f.endsWith('.css')).map((f) => ['css/' + f, read('css/' + f)]));

test('checkNoLoops: the old decorative loops are flagged with the file and the selector', () => {
  const cases = [
    ['marquee', '.marquee-track{display:inline-block; animation:marquee 38s linear infinite;}'],
    ['vlogBlink', '.vlog-dot{animation:vlogBlink 2.4s ease-in-out infinite;}'],
    ['eggPulse', '.egg{animation:eggPulse 4s ease-in-out infinite;}'],
    ['nutshellWobble', '.nutshell-sticker{animation: nutshellWobble 10s ease-in-out infinite;}'],
  ];
  for (const [name, rule] of cases) {
    const out = checkNoLoops({ 'css/x.css': rule });
    assert.equal(out.length, 1, name);
    assert.ok(out[0].includes('css/x.css'), name + ' names the file');
    assert.ok(out[0].includes(rule.split('{')[0]), name + ' names the selector');
  }
});

test('checkNoLoops: the gate breathing and the story hint bounce are the only loops allowed, and one-shot animations are fine', () => {
  assert.deepEqual(checkNoLoops({ 'css/opening.css': '@media (prefers-reduced-motion:no-preference){ html.intro #gateEnter{animation:gateBreathe 3.4s ease-in-out infinite;} }' }), []);
  assert.deepEqual(checkNoLoops({ 'css/story.css': '.scroll-hint{\n  animation:hintBounce 1.8s ease-in-out infinite;\n}' }), []);
  assert.deepEqual(checkNoLoops({ 'css/x.css': '.a{animation:fadeUp .7s both;} .b{animation:nutshellWobble 1.1s ease-in-out .6s 1;}' }), []);
});

test('the real stylesheets have no endless animation outside the two allowed', () => {
  assert.deepEqual(checkNoLoops(cssFiles), []);
});

test('base.css: reduced motion makes every transition and animation instant and turns smooth scrolling off', () => {
  const css = cssFiles['css/base.css'];
  const m = css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(m, 'a prefers-reduced-motion: reduce block');
  assert.match(m[1], /\*,\s*\*::before,\s*\*::after/);
  assert.match(m[1], /animation-duration:\s*\.001ms\s*!important/);
  assert.match(m[1], /animation-iteration-count:\s*1\s*!important/);
  assert.match(m[1], /transition-duration:\s*\.001ms\s*!important/);
  assert.match(m[1], /scroll-behavior:\s*auto\s*!important/);
});

test('the temporary alias block is gone, and every variable the stylesheets and the noscript style use is defined', () => {
  assert.doesNotMatch(cssFiles['css/tokens.css'], /LEGACY ALIASES/);
  for (const old of ['--soft', '--soft-2', '--text:', '--muted', '--muted-2', '--line', '--title-1', '--title-2', '--accent', '--accent-soft', '--accent-2', '--accent-2-soft', '--bg-translucent-90']) {
    assert.ok(!new RegExp(old.replace(/[:]/g, '') + '(?![a-z0-9-])\\s*[:)]').test(Object.values(cssFiles).join('\n')), old + ' is not used or defined any more');
  }
  const inline = [...read('index.html').matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
  assert.deepEqual(checkCssVars({ ...cssFiles, 'index.html <style>': inline }), []);
});

// every rule that carries the warm glow colour, with its selector and body
const glowRules = Object.entries(cssFiles).flatMap(([file, text]) => [...text.matchAll(/([^{}]+)\{([^{}]*226,\s*180,\s*84[^{}]*)\}/g)].map((m) => ({ file, sel: m[1].trim(), body: m[2] })));

test('paper glow: the wash behind the name, a second one at the top right, the halos and the card highlight, with the brief numbers', () => {
  const home = cssFiles['css/home.css'], chrome = cssFiles['css/chrome.css'];
  assert.match(home, /:root\[data-theme="light"\] \.hero\s*\{[^}]*radial-gradient\([^)]*rgba\(226,\s*180,\s*84,\s*\.24\)[^)]*transparent 72%\)[^}]*radial-gradient\([^)]*rgba\(226,\s*180,\s*84,\s*\.12\)/);
  assert.match(chrome, /0 0 70px rgba\(226,\s*180,\s*84,\s*\.34\)/);
  assert.match(chrome, /0 0 34px rgba\(226,\s*180,\s*84,\s*\.16\)[^;}]*inset 0 1px 0 #ffffff/);
  assert.match(home, /@media\s*\(max-width:\s*700px\)\s*\{[^@]*:root\[data-theme="light"\] \.hero\s*\{[^}]*background:\s*radial-gradient\([^)]*\.24\)[^)]*transparent 72%\);/, 'phones keep only the first wash');
});

test('paper glow: dark mode has none, and it is static (no animation, no blur filter, no blend layer)', () => {
  assert.ok(glowRules.length >= 4, 'the glow rules are there');
  for (const r of glowRules) {
    assert.match(r.sel, /\[data-theme="light"\]/, `${r.file}: "${r.sel}" carries the glow outside the paper theme`);
    assert.doesNotMatch(r.body, /animation|filter|mix-blend-mode|transition/, `${r.file}: "${r.sel}" is not static`);
  }
});
