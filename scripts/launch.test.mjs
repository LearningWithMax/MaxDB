import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// What the site no longer carries at launch (owner, 2026-10-27): the site-wide "under construction" banner and the CV's
// "Under Construction" tag on the Certificates heading. The cookie consent banner is a different thing and stays.
const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('no construction banner: not in the page, the early inline script, the styles or the scripts', () => {
  const html = read('index.html');
  assert.doesNotMatch(html, /constructionBanner|construction-banner|Website under construction|dismissBanner|close-banner/);
  assert.doesNotMatch(html, /mdb-banner-dismissed|--banner-display/, 'the early script no longer reads a dismissal');
  assert.doesNotMatch(read('css/base.css'), /construction-banner|close-banner|--banner-display/);
  assert.doesNotMatch(read('js/consent.js'), /constructionBanner|dismissBanner|mdb-banner-dismissed|construction/i);
  assert.doesNotMatch(read('scripts/clips/capture.mjs'), /mdb-banner-dismissed|construction banner/i);
});

test('the Certificates heading has no "Under Construction" tag, and the certificates are all still there', () => {
  const html = read('index.html');
  assert.doesNotMatch(html, /construction-tag|Under Construction/i);
  assert.doesNotMatch(read('css/cv.css'), /construction-tag/);
  assert.match(html, /<h2>Certificates<\/h2>/);
  assert.ok([...html.matchAll(/class="cert-item"/g)].length >= 2, 'the certificates themselves stay');
  assert.match(html, /openCert\('Claude 101'/);
  assert.match(html, /openCert\('AI Fluency: Framework &amp; Foundations'/);
});

test('the cookie consent banner is untouched: markup, script and styles', () => {
  const html = read('index.html');
  assert.match(html, /<div class="consent-banner"[^>]*id="consentBanner"|<div class="consent-banner" id="consentBanner"/);
  assert.match(read('js/consent.js'), /document\.getElementById\('consentBanner'\)\.classList\.add\('show'\)/);
  assert.match(read('css/widgets.css'), /\.consent-banner/);
});

// The three early prototypes (lab/) were reference only; they are archived outside the repo and gone from the site (owner, 2026-10-27).
test('lab/ is gone, and nothing the site serves or CLAUDE.md describes points into it', () => {
  assert.equal(fs.existsSync(new URL('../lab', import.meta.url)), false, 'the lab folder is removed');
  assert.doesNotMatch(read('CLAUDE.md'), /^lab\/ /m, 'the structure list no longer describes lab/');
  assert.doesNotMatch(read('index.html'), /["'(]lab\//, 'the page never loads anything from lab/');
});
