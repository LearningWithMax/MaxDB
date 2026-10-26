// Dev helper for scripts/clips/ (not part of the site): run ffmpeg, and make a WebP as sharp as a size limit allows.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { webpArgs } from './ffmpeg.mjs';

export function runFfmpeg(ffmpeg, args) {
  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', ...args], { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.error) throw new Error('cannot run ffmpeg (' + ffmpeg + '): ' + r.error.message);
  if (r.status !== 0) throw new Error('ffmpeg failed: ' + (r.stderr || '').trim().slice(-500));
}

// Writes `out` as a WebP of w by h from the PNG `input`, at the highest quality (from 92 down in steps of 4) whose file fits `limit` bytes.
export function webpUnder({ ffmpeg, input, w, h, limit, out }) {
  for (let quality = 92; quality >= 40; quality -= 4) {
    runFfmpeg(ffmpeg, webpArgs({ input, w, h, quality, out }));
    const size = fs.statSync(out).size;
    if (size <= limit) return { quality, size };
  }
  throw new Error(`cannot get ${out} under ${limit} bytes at ${w} by ${h}`);
}
