// Rewrites the plain no-JavaScript list of projects in index.html from PROJECTS in js/projects.js. Run it after changing a project's
// text, status or link: a test (projects-page.test.mjs) fails while the two differ.
//   node scripts/projects-list.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadClassic } from './lib/load-classic.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'index.html');
const { PROJECTS, noscriptListHtml } = loadClassic(path.join(root, 'js/projects.js'), ['PROJECTS', 'noscriptListHtml'], { CASE_IDS: ['site'] });

const html = fs.readFileSync(file, 'utf8');
const crlf = html.includes('\r\n');
const text = html.replace(/\r\n/g, '\n');
const pageAt = text.indexOf('<section class="page" id="page-projects"');
const re = /<noscript>\s*<ul class="shelf-list">[\s\S]*?<\/ul>\s*<\/noscript>/;
const m = re.exec(text.slice(pageAt));
if (pageAt < 0 || !m) { console.error('the noscript list in the Projects page was not found'); process.exit(1); }

const list = noscriptListHtml(PROJECTS).replace('<ul class="shelf-list"><li>', '<ul class="shelf-list">\n        <li>').replace(/<\/li><li>/g, '</li>\n        <li>').replace('</li></ul>', '</li>\n      </ul>');
const next = '<noscript>\n      ' + list + '\n    </noscript>';
const start = pageAt + m.index;
const out = text.slice(0, start) + next + text.slice(start + m[0].length);
if (out === text) { console.log('the list is already up to date'); process.exit(0); }
fs.writeFileSync(file, crlf ? out.replace(/\n/g, '\r\n') : out);
console.log('rewrote the noscript list in index.html (' + PROJECTS.length + ' projects)');
