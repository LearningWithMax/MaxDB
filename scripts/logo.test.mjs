import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const bytes = (p) => fs.readFileSync(new URL('../' + p, import.meta.url));
const html = read('index.html');

test('the banner logo is one fixed chrome image', () => {
  assert.equal([...html.matchAll(/class="logo-img"/g)].length, 1);
  assert.match(html, /<img id="logoImg" class="logo-img" src="img\/logo\/chrome-banner\.webp" alt="MDB"/);
});

test('the lens never changes the banner logo: lens.js does not touch it or load other stills', () => {
  assert.doesNotMatch(read('js/lens.js'), /logoImg|-banner\.webp|LENS_FINISH|logoSrcFor|swapLogo/);
});

test('no script swaps or fades the logo image (the glide path may still read its position)', () => {
  for (const f of fs.readdirSync(new URL('../js/', import.meta.url)).filter((n) => n.endsWith('.js'))) {
    const src = read('js/' + f);
    assert.doesNotMatch(src, /getElementById\(\s*['"]logoImg['"]\s*\)\s*\.(src|style|setAttribute)\b/, f + ' changes the logo image');
    for (const m of src.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*document\.getElementById\(\s*['"]logoImg['"]\s*\)/g)) {
      assert.doesNotMatch(src, new RegExp(`\\b${m[1]}\\.(src|style|setAttribute)\\b`), `${f} changes the logo image through ${m[1]}`);
    }
  }
});

test('the chrome banner still is a real transparent webp (alpha flag set) within the 30 KB logo limit', () => {
  const b = bytes('img/logo/chrome-banner.webp');
  assert.equal(b.toString('ascii', 0, 4), 'RIFF');
  assert.equal(b.toString('ascii', 8, 12), 'WEBP');
  assert.equal(b.toString('ascii', 12, 16), 'VP8X', 'extended format, so it can carry alpha');
  assert.ok(b[20] & 0x10, 'alpha flag');
  assert.ok(b.length <= 30000, `${b.length} bytes`);
});

test('the four old lens-finish stills are gone', () => {
  for (const f of ['gold', 'emerald', 'gunmetal', 'orange']) {
    assert.equal(fs.existsSync(new URL(`../img/logo/${f}-banner.webp`, import.meta.url)), false, f);
  }
});

test('the opening plays in the chrome finish', () => {
  assert.match(read('js/home-intro.js'), /createOpening\(\{[^}]*finish:\s*'chrome'/);
});
