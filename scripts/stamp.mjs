// Stamps a new version word. Run it ONCE as the last step before a push to main (never for a branch push), commit the result, then
// merge. It bumps the number in scripts/lib/build-info.json and rewrites css/build.css; the footer shows the word next to
// "Built with Claude". Tell the owner the word it prints, so he can check it on his phone.
//   node scripts/stamp.mjs           a new word (bumps the number)
//   node scripts/stamp.mjs --again   rewrite css/build.css for the current number without bumping it (after editing the word list or the css template)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { wordFor, buildCss, nextBuild } from './lib/build.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const infoFile = path.join(root, 'scripts', 'lib', 'build-info.json');
const cssFile = path.join(root, 'css', 'build.css');

const last = JSON.parse(fs.readFileSync(infoFile, 'utf8'));
const info = process.argv.includes('--again') ? last : nextBuild(last, new Date());
if (info !== last) fs.writeFileSync(infoFile, JSON.stringify(info, null, 2) + '\n');
fs.writeFileSync(cssFile, buildCss(info.n));
console.log('Build ' + info.n + ': ' + wordFor(info.n) + ' (' + info.at + ')');
