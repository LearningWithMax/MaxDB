import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const between = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, `markers ${a} / ${b}`); return html.slice(i, j); };

test('the banner logo is the balloon MDB image inside the logo trigger, keeping the long-press ring', () => {
  const trigger = between('id="logoTrigger"', '<div class="navlinks">');
  assert.match(trigger, /<img id="logoImg" class="logo-img" src="img\/logo\/chrome-banner\.webp" alt="MDB"/);
  assert.match(trigger, /class="logo-ring"/);
  assert.doesNotMatch(trigger, /logo-molecule|logo-icon/);
});

test('the hero text sits in .hero-main (kicker, name, one plain line, in that order) and the lens list follows it', () => {
  const hero = between('id="page-home"', 'class="stat-row"');
  const main = hero.match(/<div class="hero-main">([\s\S]*?)<\/div>\s*<ol class="lens-list/);
  assert.ok(main, '.hero-main must end right before the lens list');
  const at = ['class="kicker', 'class="name', 'class="role-line'].map((part) => { const i = main[1].indexOf(part); assert.ok(i >= 0, 'hero-main contains ' + part); return i; });
  assert.deepEqual(at, [...at].sort((a, b) => a - b), 'order: kicker, name, line');
  assert.match(main[1], /<h1 class="name[^"]*"[^>]*>Max Duffaud<br><em>Bibas<\/em><\/h1>/);
  assert.doesNotMatch(hero, /hero-watermark|marquee|cta-row/);
});

test('no OH molecule is left anywhere in the page', () => {
  assert.doesNotMatch(html, /logo-molecule/);
});
