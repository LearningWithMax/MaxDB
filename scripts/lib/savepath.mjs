// Where the dev server may write files when started with --save (used by scripts/stills/ for the logo images and the Trip card image),
// and where scripts/clips/still.mjs may write a project still. Only png/webp files under img/logo/ and img/<name>.png, the one image
// img/trip-preview.webp, and webp files under img/projects/<id>/ are allowed: lowercase names, one folder level, no traversal.
import path from 'node:path';

const ALLOWED = /^(?:img\/logo\/[a-z0-9-]+\.(?:png|webp)|img\/[a-z0-9-]+\.png|img\/trip-preview\.webp|img\/projects\/[a-z0-9-]+\/[a-z0-9-]+\.webp)$/;

export function safeSavePath(root, rel) {
  if (typeof rel !== 'string' || !ALLOWED.test(rel)) return null;
  return path.join(root, rel);
}
