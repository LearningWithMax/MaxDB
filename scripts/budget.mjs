// Size budget. Run: node scripts/budget.mjs
// Prints the compressed (gzip) size of what a visitor downloads before the gate can show (index.html, the stylesheets and
// the classic scripts it references), and of the vendored three.js and GSAP that load after first paint.
// Exits 1 if the first total is over 150 KB.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIMIT = 150 * 1024;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const gz = (rel) => zlib.gzipSync(fs.readFileSync(path.join(root, rel)), { level: 9 }).length;
const kb = (n) => (n / 1024).toFixed(1).padStart(7) + ' KB';

const pre = ['index.html'];
for (const m of html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)) if (!/^https?:/.test(m[1])) pre.push(m[1]);
for (const m of html.matchAll(/<script[^>]*src="([^"]+)"/g)) if (!/^https?:/.test(m[1])) pre.push(m[1]);

let total = 0;
console.log('Before the gate (HTML, CSS, classic scripts), gzip:');
for (const f of pre) { const n = gz(f); total += n; console.log(kb(n), f); }
console.log(kb(total), 'TOTAL  (limit ' + LIMIT / 1024 + ' KB)\n');

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'vendor/MANIFEST.json'), 'utf8')).files;
const sum = (re) => Object.entries(manifest).filter(([k]) => re.test(k)).reduce((a, [, v]) => a + v.gzipBytes, 0);
const libs = { 'three core + module': sum(/three\.(module|core)\.min\.js$/), 'three addons': sum(/three\/addons\//), 'gsap': sum(/gsap\/(index|gsap-core|CSSPlugin)\.js$/) };
const libTotal = Object.values(libs).reduce((a, b) => a + b, 0);
console.log('Loaded after first paint, for the opening (gzip):');
for (const [k, v] of Object.entries(libs)) console.log(kb(v), k);
console.log(kb(libTotal), 'TOTAL libraries');
console.log(kb(gz('modules/opening.js') + gz('modules/opening-config.js') + gz('img/logo/mdb-shape.jpg')), 'opening module + shape image');

if (total > LIMIT) { console.log('\nOVER BUDGET before the gate.'); process.exit(1); }
console.log('\nWithin budget.');
