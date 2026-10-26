import test from 'node:test';
import assert from 'node:assert/strict';
import { isServable } from './lib/servable.mjs';

for (const ok of ['/', '/index.html', '/js/nav.js', '/img/logo/gold-banner.webp', '/vendor/three/three.module.min.js', '/lab/index.html', '/docs/superpowers/specs/x.md']) {
  test(`isServable allows ${ok}`, () => assert.equal(isServable(ok), true));
}
for (const no of ['/.git/config', '/.gitignore', '/.superpowers/sdd/x/progress.md', '/.claude/launch.json', '/PROJECT-NOTES.local.md', '/lens-text-draft.local.md', '/originals/photo.jpg', '/node_modules/x/index.js', '/a/../.git/config', '/%2e%67it/config']) {
  test(`isServable refuses ${no}`, () => assert.equal(isServable(no), false));
}
