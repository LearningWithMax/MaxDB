import test from 'node:test';
import assert from 'node:assert/strict';
import * as ffmpeg from './lib/ffmpeg.mjs';
import { findFfmpeg, webpArgs } from './lib/ffmpeg.mjs';

test('findFfmpeg prefers the FFMPEG_PATH variable, then a WinGet install, and gives null when there is none', () => {
  const exists = (p) => p === 'D:/tools/ffmpeg.exe' || p.endsWith('/bin/ffmpeg.exe');
  assert.equal(findFfmpeg({ env: { FFMPEG_PATH: 'D:/tools/ffmpeg.exe' }, exists, readdir: () => [] }), 'D:/tools/ffmpeg.exe');
  const readdir = (dir) => (dir.endsWith('/Packages') ? ['Other.Thing', 'Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe'] : ['ffmpeg-9.0.2-full_build']);
  const got = findFfmpeg({ env: { LOCALAPPDATA: 'C:/Users/me/AppData/Local' }, exists, readdir });
  assert.equal(got, 'C:/Users/me/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe');
  assert.equal(findFfmpeg({ env: {}, exists: () => false, readdir: () => [] }), null);
  assert.equal(findFfmpeg({ env: { FFMPEG_PATH: 'D:/missing.exe', LOCALAPPDATA: 'C:/x' }, exists: () => false, readdir: () => [] }), null, 'a path that does not exist is not used');
});

test('webpArgs scales with lanczos to the given width and height at the given quality', () => {
  const s = webpArgs({ input: 'a.png', w: 1600, h: 1000, quality: 82, out: 'b.webp' }).join(' ');
  assert.match(s, /-i a\.png/);
  assert.match(s, /scale=1600:1000:flags=lanczos/);
  assert.match(s, /-c:v libwebp/);
  assert.match(s, /-quality 82/);
  assert.match(s, /b\.webp$/);
});

test('the video helpers are gone: ffmpeg is only used to make WebP stills', () => {
  for (const gone of ['videoArgs', 'nextCrf', 'START_CRF']) assert.equal(ffmpeg[gone], undefined, gone);
});
