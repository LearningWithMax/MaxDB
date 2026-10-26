import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { safeSavePath } from './lib/savepath.mjs';

const root = path.resolve('/site');

test('safeSavePath accepts a logo webp and the sharing png', () => {
  assert.equal(safeSavePath(root, 'img/logo/chrome-banner.webp'), path.join(root, 'img/logo/chrome-banner.webp'));
  assert.equal(safeSavePath(root, 'img/logo/favicon-32.png'), path.join(root, 'img/logo/favicon-32.png'));
  assert.equal(safeSavePath(root, 'img/og.png'), path.join(root, 'img/og.png'));
});

for (const rel of ['img/projects/car-broker/home.webp', 'img/projects/car-broker/home-thumb.webp', 'img/projects/site/opening.webp']) {
  test(`safeSavePath accepts the project still ${rel}`, () => {
    assert.equal(safeSavePath(root, rel), path.join(root, rel));
  });
}

test('safeSavePath accepts the Home card image for the Trip page', () => {
  assert.equal(safeSavePath(root, 'img/trip-preview.webp'), path.join(root, 'img/trip-preview.webp'));
});

for (const bad of ['img/trip-preview.WEBP', 'img/../trip-preview.webp', 'img/other.webp', 'img/trip-preview.webp/x', 'img/trip-preview.webp.png']) {
  test(`safeSavePath rejects ${JSON.stringify(bad)} (only the one Home card image is a root-level webp)`, () => {
    assert.equal(safeSavePath(root, bad), null);
  });
}

for (const bad of ['../x.png', 'img/../x.png', 'img/logo/a.svg', 'js/a.png', '/etc/x', 'img/logo/A.png', 'img/logo/a/b.png', 'img/x.webp', 'img/logo/.png', '',
  'img/projects/x/loop.gif', 'img/projects/../x.webp', 'img/projects/Car/home.webp', 'img/projects/a/b/home.webp', 'img/projects/home.webp', 'img/projects//home.webp', 'img/projects/a/home.WEBP',
  'img/projects/car-broker/loop.mp4', 'img/projects/car-broker/loop.webm', 'img/projects/site/case-loop.mp4']) {
  test(`safeSavePath rejects ${JSON.stringify(bad)}`, () => {
    assert.equal(safeSavePath(root, bad), null);
  });
}
