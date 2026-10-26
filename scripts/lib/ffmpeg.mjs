// Dev helpers for scripts/clips/ (not part of the site): find ffmpeg and build its command line for a WebP still. ffmpeg is free
// (winget install Gyan.FFmpeg --source winget); scripts/clips/still.mjs runs this through scripts/lib/ffmpeg-run.mjs.
import fs from 'node:fs';

// FFMPEG_PATH if it exists, else the WinGet install of Gyan.FFmpeg, else null.
export function findFfmpeg({ env = process.env, exists = fs.existsSync, readdir = fs.readdirSync } = {}) {
  if (env.FFMPEG_PATH && exists(env.FFMPEG_PATH)) return env.FFMPEG_PATH;
  if (!env.LOCALAPPDATA) return null;
  const packages = env.LOCALAPPDATA.replace(/\\/g, '/') + '/Microsoft/WinGet/Packages';
  try {
    for (const pkg of readdir(packages)) {
      if (!/^Gyan\.FFmpeg/.test(pkg)) continue;
      for (const sub of readdir(`${packages}/${pkg}`)) {
        const p = `${packages}/${pkg}/${sub}/bin/ffmpeg.exe`;
        if (exists(p)) return p;
      }
    }
  } catch { /* no WinGet folder */ }
  return null;
}

// The command line that turns one PNG into a WebP of w by h (a still).
export function webpArgs({ input, w, h, quality, out }) {
  return ['-y', '-i', input, '-vf', `scale=${w}:${h}:flags=lanczos`, '-c:v', 'libwebp', '-quality', String(quality), '-compression_level', '6', out];
}
