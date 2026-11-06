import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('without JavaScript every page is shown, so the CV text is readable (and findable by search engines)', () => {
  assert.match(html, /<noscript>\s*<style>[^<]*section\.page\s*\{[^}]*display:\s*block\s*!important/);
});

test('without JavaScript the CV is the same one reading (there is no other since the refocus)', () => {
  assert.match(html, /<section class="page" id="page-cv">/);
});

test('the raw HTML never ships the intro class: only the inline script adds it', () => {
  assert.doesNotMatch(html, /<html[^>]*class="[^"]*intro/);
});
