// Downloads the site fonts into vendor/fonts/ and merges their entries into vendor/MANIFEST.json (other entries are untouched).
//   node scripts/vendor-fonts.mjs
// Source: the Google Fonts CSS API (fonts.googleapis.com) for the woff2 files, which live on fonts.gstatic.com, and the licence texts
// from github.com/google/fonts. All four families are under the SIL Open Font License.
//
// Every face is requested as a TEXT SUBSET (the API's `text=` parameter): only the glyphs for the characters in FONT_TEXT. That keeps
// the fonts small, and it can not pick the wrong Unicode block. (An earlier version filtered Google's "/* latin */" blocks by their
// comment, but the comment comes BEFORE its @font-face, so it picked the latin-ext files, which have almost no ASCII. scripts/
// font-cmap.test.mjs now reads each file's glyph table and fails if a face lacks the characters the site sets in it.)
// A character outside FONT_TEXT falls back to the system font for that glyph only.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { FONT_TEXT } from './lib/font-text.mjs';        // printable ASCII plus the few other characters the site shows

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const families = [
  { query: 'Instrument+Serif:ital@0;1', licence: ['instrumentserif', 'OFL-InstrumentSerif.txt'], name: (style) => (style === 'italic' ? 'InstrumentSerif-400-italic.woff2' : 'InstrumentSerif-400.woff2') },
  { query: 'JetBrains+Mono:wght@400', licence: ['jetbrainsmono', 'OFL-JetBrainsMono.txt'], name: () => 'JetBrainsMono-400.woff2' },
  { query: 'Inter:wght@400..600', licence: ['inter', 'OFL-Inter.txt'], name: () => 'Inter-400-600.woff2' },
  { query: 'Roboto+Condensed:wght@700', licence: ['robotocondensed', 'OFL-RobotoCondensed.txt'], name: () => 'RobotoCondensed-700.woff2' },
];

async function get(url, opts) {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(`${r.status} for ${url}`);
  return Buffer.from(await r.arrayBuffer());
}
const entry = (buf, source, note) => ({
  sha256: crypto.createHash('sha256').update(buf).digest('hex'), bytes: buf.length, gzipBytes: zlib.gzipSync(buf, { level: 9 }).length, source, ...(note ? { note } : {}),
});

const manifestPath = path.join(root, 'vendor/MANIFEST.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
for (const key of Object.keys(manifest.files)) if (key.startsWith('vendor/fonts/')) delete manifest.files[key];      // rebuilt below, so a renamed file leaves no stale entry
fs.mkdirSync(path.join(root, 'vendor/fonts'), { recursive: true });
for (const stale of fs.readdirSync(path.join(root, 'vendor/fonts'))) fs.unlinkSync(path.join(root, 'vendor/fonts', stale));

for (const fam of families) {
  const api = `https://fonts.googleapis.com/css2?family=${fam.query}&text=${encodeURIComponent(FONT_TEXT)}&display=swap`;
  const css = (await get(api, { headers: { 'User-Agent': UA } })).toString();
  const blocks = css.split('@font-face').slice(1);
  if (!blocks.length) throw new Error('no @font-face in the Google Fonts CSS for ' + fam.query);
  for (const b of blocks) {
    const url = (b.match(/url\((https:[^)]+)\)/) || [])[1];
    const style = (b.match(/font-style:\s*([a-z]+)/) || [])[1];
    if (!url) throw new Error('no woff2 url for ' + fam.query);
    const rel = 'vendor/fonts/' + fam.name(style);
    const buf = await get(url);
    fs.writeFileSync(path.join(root, rel), buf);
    manifest.files[rel] = entry(buf, url, 'text subset: ASCII, Latin-1 and a few symbols (see scripts/vendor-fonts.mjs)');
  }
  const [dir, out] = fam.licence;
  const src = `https://raw.githubusercontent.com/google/fonts/main/ofl/${dir}/OFL.txt`;
  const lic = await get(src);
  fs.writeFileSync(path.join(root, 'vendor/fonts', out), lic);
  manifest.files['vendor/fonts/' + out] = entry(lic, src);
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

let total = 0;
for (const f of fs.readdirSync(path.join(root, 'vendor/fonts')).filter((n) => n.endsWith('.woff2')).sort()) {
  const bytes = fs.statSync(path.join(root, 'vendor/fonts', f)).size;
  total += bytes;
  console.log(String(bytes).padStart(8), f);
}
console.log(String(total).padStart(8), 'woff2 total (limit 120000)');
