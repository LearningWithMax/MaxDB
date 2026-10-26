// Dev tool (not part of the site): turns a sharp capture into a WebP still under img/projects/<id>/, as sharp as its size limit allows.
//   node scripts/clips/still.mjs captures/site/05-board.png img/projects/site/screen-cv.webp --w 1600 --h 1000 [--limit 200000]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findFfmpeg } from '../lib/ffmpeg.mjs';
import { webpUnder } from '../lib/ffmpeg-run.mjs';
import { safeSavePath } from '../lib/savepath.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const [input, rel] = args;
const w = Number(opt('--w', 1600)), h = Number(opt('--h', 1000)), limit = Number(opt('--limit', 200000));
const capture = input && path.join(root, 'scripts/clips', input);
const dest = rel && safeSavePath(root, rel);
if (!input || !/^captures\/[a-z0-9-]+\/[a-z0-9._-]+\.png$/.test(input) || !dest || !/\.webp$/.test(rel) || !Number.isInteger(w) || !Number.isInteger(h) || !(limit > 0)) {
  console.error('usage: node scripts/clips/still.mjs captures/<id>/<file>.png img/projects/<id>/<name>.webp [--w 1600] [--h 1000] [--limit 200000]');
  process.exit(1);
}
fs.mkdirSync(path.dirname(dest), { recursive: true });   // a new project has no folder yet
const r = webpUnder({ ffmpeg: findFfmpeg() || 'ffmpeg', input: capture, w, h, limit, out: dest });
console.log(`saved ${rel} (${r.size} bytes, ${w} by ${h}, quality ${r.quality})`);
