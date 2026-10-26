// Sanity check. Run after every edit:  node scripts/check.mjs
//  1. every <script> (inline and local src) parses, and the local scripts parse together in load order
//     (catches duplicate top-level const/let across files)
//  2. every local file referenced by index.html, css/*.css and js/*.js exists
//  3. every modules/*.js parses as an ES module, and the import map (if any) points only at local vendored files
// Exit code 1 on any problem.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseEsModule, checkImportMap, verifyManifest, checkLensVariants, findBannedText, checkBoardLines, checkLogoAssets, checkIntelciaFact, checkFonts, checkCssVars, checkViewport, checkDeparturesPreview, checkNoLoops, FONT_REQUIRED, checkFontCoverage, checkSiteGlyphs, checkProjectImages, checkNoVideo, checkProjectNames } from './lib/rules.mjs';
import { loadClassic } from './lib/load-classic.mjs';
import { checkTripList } from './lib/trip-list.mjs';
import { fontCodePoints } from './lib/woff2-cmap.mjs';
import { FONT_TEXT } from './lib/font-text.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const html = read('index.html');
let bad = 0;
const problem = (m) => { bad++; console.log('  FAIL', m); };
const ok = (m) => console.log('  ok  ', m);

// ---- 1. scripts ----
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
const localSrc = [];
scripts.forEach((m, i) => {
  const src = (m[1].match(/src="([^"]+)"/) || [])[1];
  if (/type=["']importmap["']/.test(m[1])) return;   // JSON, checked in section 3
  if (/type=["']application\/ld\+json["']/.test(m[1])) return;   // JSON (structured data), parsed and checked by scripts/seo.test.mjs
  if (src && /^https?:/.test(src)) return;
  if (src) { localSrc.push(src); return; }
  try { new Function(m[2]); ok(`inline script #${i} parses (${m[2].length} chars)`); }
  catch (e) { problem(`inline script #${i}: ${e.message}`); }
});
let combined = '';
for (const src of localSrc) {
  if (!fs.existsSync(path.join(root, src))) { problem('missing script ' + src); continue; }
  const code = read(src);
  try { new Function(code); ok(`${src} parses (${code.length} chars)`); combined += '\n' + code; }
  catch (e) { problem(`${src}: ${e.message}`); }
}
try { new Function(combined); ok(`all ${localSrc.length} local scripts parse together in load order`); }
catch (e) { problem('combined scripts: ' + e.message); }

// ---- 2. referenced files exist ----
const refs = new Set();
for (const m of html.matchAll(/\b(?:src|href)="([^"#?]+)"/g)) refs.add(m[1]);
for (const f of fs.readdirSync(path.join(root, 'css'))) for (const m of read('css/' + f).matchAll(/url\(\s*['"]?([^'")]+)/g)) if (!/^(#|%23)/.test(m[1])) refs.add(/^(https?:|data:|\/)/.test(m[1]) ? m[1] : path.posix.normalize('css/' + m[1]));   // css urls are relative to the css file
for (const f of fs.readdirSync(path.join(root, 'js'))) for (const m of read('js/' + f).matchAll(/['"]((?:img|css|js)\/[^'"]+\.[a-z0-9]+)['"]/gi)) refs.add(m[1]);
for (const r of refs) {
  if (/^(https?:|mailto:|data:|\/\/)/.test(r)) continue;
  if (r.startsWith('/')) { problem('absolute path (breaks under /MaxDB/): ' + r); continue; }
  if (!fs.existsSync(path.join(root, r))) problem('referenced file not found: ' + r);
}
ok(`${[...refs].filter((r) => !/^(https?:|mailto:|data:|\/\/)/.test(r)).length} local references checked`);

// ---- 3. ES modules and import map ----
const modDir = path.join(root, 'modules');
const mods = fs.existsSync(modDir) ? fs.readdirSync(modDir).filter((f) => f.endsWith('.js')) : [];
for (const f of mods) {
  const err = parseEsModule(read('modules/' + f));
  if (err) problem(`modules/${f}: ${err}`); else ok(`modules/${f} parses as an ES module`);
}
const mapProblems = checkImportMap(html, (rel) => fs.existsSync(path.join(root, rel)));
mapProblems.forEach(problem);
if (!mapProblems.length) ok('import map clean (or absent)');

// ---- 3b. lens text groups are complete ----
const lensProblems = checkLensVariants(html);
lensProblems.forEach(problem);
if (!lensProblems.length) ok('lens text groups complete (or none yet)');

// ---- 3a. board jobs fit the board ----
const boardProblems = checkBoardLines(html);
boardProblems.forEach(problem);
if (!boardProblems.length) ok('board jobs fit the board');

// ---- 3a2. Intelcia is one fact only ----
const intelciaProblems = checkIntelciaFact(html);
intelciaProblems.forEach(problem);
if (!intelciaProblems.length) ok('Intelcia described by the one approved fact');

// ---- 3a3. Home's departures preview repeats the first three jobs ----
const depProblems = checkDeparturesPreview(html);
depProblems.forEach(problem);
if (!depProblems.length) ok('departures preview matches the CV jobs (or is absent)');

// ---- 3b2. logo stills exist and are small ----
const logoFiles = [];
for (const rel of fs.existsSync(path.join(root, 'img/logo')) ? fs.readdirSync(path.join(root, 'img/logo')).map((n) => 'img/logo/' + n) : []) logoFiles.push({ name: rel, bytes: fs.statSync(path.join(root, rel)).size });
if (fs.existsSync(path.join(root, 'img/og.png'))) logoFiles.push({ name: 'img/og.png', bytes: fs.statSync(path.join(root, 'img/og.png')).size });
const logoProblems = checkLogoAssets(logoFiles);
logoProblems.forEach(problem);
if (!logoProblems.length) ok('logo stills present and small');

// ---- 3b3. fonts are self-hosted and small, every css variable is defined, the viewport allows zoom ----
const cssFiles = {};
for (const f of fs.readdirSync(path.join(root, 'css'))) if (f.endsWith('.css')) cssFiles['css/' + f] = read('css/' + f);
const fontBytes = {};
const fontDir = path.join(root, 'vendor/fonts');
if (fs.existsSync(fontDir)) for (const f of fs.readdirSync(fontDir)) if (f.endsWith('.woff2')) fontBytes['vendor/fonts/' + f] = fs.statSync(path.join(fontDir, f)).size;
const fontProblems = checkFonts({ css: cssFiles, fontBytes });
fontProblems.forEach(problem);
if (!fontProblems.length) ok(`fonts self-hosted with swap, ${Object.values(fontBytes).reduce((a, b) => a + b, 0)} bytes of woff2 (limit 120000)`);
// the files really hold the glyphs the site sets in them (a wrong Unicode subset loads without error and silently falls back)
const fontCoverage = {};
for (const rel of Object.keys(FONT_REQUIRED)) if (fs.existsSync(path.join(root, rel))) fontCoverage[rel] = fontCodePoints(fs.readFileSync(path.join(root, rel)));
const coverageProblems = checkFontCoverage(fontCoverage);
coverageProblems.forEach(problem);
if (!coverageProblems.length) ok('every font file has the glyphs the site sets in it');
// and the site's own text stays inside the character set the fonts were cut to
const glyphTexts = { 'index.html': html };
for (const f of fs.readdirSync(path.join(root, 'js'))) if (f.endsWith('.js')) glyphTexts['js/' + f] = read('js/' + f);
const glyphProblems = checkSiteGlyphs(glyphTexts, FONT_TEXT);
glyphProblems.forEach(problem);
if (!glyphProblems.length) ok('site text uses only characters the fonts were cut to');
const inlineStyles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');   // the noscript style
const varProblems = checkCssVars({ ...cssFiles, 'index.html <style>': inlineStyles });
varProblems.forEach(problem);
if (!varProblems.length) ok('every css variable is defined (or has a fallback)');
const loopProblems = checkNoLoops(cssFiles);
loopProblems.forEach(problem);
if (!loopProblems.length) ok('nothing loops on its own (except the gate and the story hint)');
const viewportProblems = checkViewport(html);
viewportProblems.forEach(problem);
if (!viewportProblems.length) ok('viewport allows pinch zoom');

// ---- 3d. Projects: the data, the loop files, the video markup, no client names ----
const routeApi = loadClassic(path.join(root, 'js/route.js'), ['CASE_IDS']);
const projectsApi = loadClassic(path.join(root, 'js/projects.js'), ['PROJECTS', 'validateProjects', 'homePicks'], { CASE_IDS: routeApi.CASE_IDS });
const mediaBytes = {};
(function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else mediaBytes[path.relative(root, full).split(path.sep).join('/')] = fs.statSync(full).size;
  }
})(path.join(root, 'img/projects'));
const caseSections = [...html.matchAll(/id="project-([a-z0-9-]+)"/g)].map((m) => m[1]);
const siteJs = Object.fromEntries(fs.readdirSync(path.join(root, 'js')).filter((f) => f.endsWith('.js')).map((f) => ['js/' + f, read('js/' + f)]));
const projectsPage = html.slice(html.indexOf('<section class="page" id="page-projects"'), html.indexOf('<div class="nutshell-overlay"'));
// Names that must stay off the Projects page but may not be written in this public repo: one per line in a git-ignored local file.
const privateNamesPath = path.join(root, 'scripts/private-names.local.txt');
const privateNames = fs.existsSync(privateNamesPath) ? fs.readFileSync(privateNamesPath, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean) : [];
const projectProblems = [
  ...projectsApi.validateProjects(projectsApi.PROJECTS, { caseSections }),
  ...checkProjectImages({
    projects: projectsApi.PROJECTS, fileBytes: mediaBytes,
    homeIds: projectsApi.homePicks(projectsApi.PROJECTS, 3).map((p) => p.id),
    extraCaseFiles: [...new Set([...html.matchAll(/img\/projects\/[a-z0-9\/-]+\.(?:webp|jpg|png)/g)].map((m) => m[0]))],
  }),
  ...checkNoVideo({ html, js: siteJs, files: Object.keys(mediaBytes) }),
  ...checkProjectNames({ projectsJs: siteJs['js/projects.js'], pageHtml: projectsPage, privateNames }),
];
projectProblems.forEach(problem);
if (!projectProblems.length) ok(`Projects: ${projectsApi.PROJECTS.length} entries valid, ${Object.keys(mediaBytes).length} media files within budget, no video, no client names`);
if (!privateNames.length) console.log('  note  scripts/private-names.local.txt is missing or empty: only the public client names are guarded (see CLAUDE.md)');

// ---- 3e. the plain Trip stop list in index.html matches modules/trip-stops.js ----
const { TRIP_STOPS } = await import(pathToFileURL(path.join(root, 'modules/trip-stops.js')).href);
const tripListProblems = checkTripList(html, TRIP_STOPS);
tripListProblems.forEach(problem);
if (!tripListProblems.length) ok(`trip stop list matches modules/trip-stops.js (${TRIP_STOPS.length} stops)`);

// ---- 3c. copy rules for everything visitors see ----
const copyFiles = ['index.html'];
for (const dir of ['css', 'js', 'modules']) if (fs.existsSync(path.join(root, dir))) for (const f of fs.readdirSync(path.join(root, dir))) if (/.(css|js|html)$/.test(f)) copyFiles.push(dir + '/' + f);
let copyBad = 0;
for (const f of copyFiles) for (const m of findBannedText(f, read(f))) { problem(m); copyBad++; }
if (!copyBad) ok(`copy rules clean in ${copyFiles.length} files`);

// ---- 4. vendored files match their recorded hashes ----
if (fs.existsSync(path.join(root, 'vendor/MANIFEST.json'))) {
  const manifest = JSON.parse(read('vendor/MANIFEST.json'));
  const vp = verifyManifest(manifest, (rel) => { try { return fs.readFileSync(path.join(root, rel)); } catch { return null; } });
  vp.forEach(problem);
  if (!vp.length) ok(`${Object.keys(manifest.files).length} vendored files match the manifest`);
}

console.log(bad ? `\n${bad} problem(s)` : '\nAll good.');
process.exit(bad ? 1 : 0);
