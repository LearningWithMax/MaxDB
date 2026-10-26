// Check rules for the Projects page: the size of its images, no video anywhere, and no client names. Re-exported from rules.mjs.
// Pure functions over plain data, so Node tests can run them on fixtures; scripts/check.mjs feeds them the real files.

export const STILL_LIMIT_BYTES = 250000;         // an HD still (a slide, a case screen), per file
export const THUMB_LIMIT_BYTES = 80000;          // a thumb for the Home band, per file
export const PAGE_MEDIA_LIMIT_BYTES = 3000000;   // all the images one view may fetch

// projects: the PROJECTS array; fileBytes: path to size for everything under img/projects/; homeIds: the ids the Home band shows;
// extraCaseFiles: the images the case view references in index.html.
export function checkProjectImages({ projects, fileBytes, homeIds = [], extraCaseFiles = [] }) {
  const out = [];
  const withImage = projects.filter((p) => p.image);
  for (const p of withImage) {
    for (const [path, limit] of [[p.image.src, STILL_LIMIT_BYTES], [p.image.thumb, THUMB_LIMIT_BYTES]]) {
      if (!(path in fileBytes)) { out.push(`${p.id}: file missing: ${path}`); continue; }
      if (fileBytes[path] > limit) out.push(`${p.id}: ${path} is ${fileBytes[path]} bytes (limit ${limit})`);
    }
  }
  for (const path of extraCaseFiles) {
    if (!(path in fileBytes)) { out.push(`the case view: file missing: ${path}`); continue; }
    if (fileBytes[path] > STILL_LIMIT_BYTES) out.push(`the case view: ${path} is ${fileBytes[path]} bytes (limit ${STILL_LIMIT_BYTES})`);
  }
  const sum = (paths) => paths.reduce((n, path) => n + (fileBytes[path] || 0), 0);
  const slider = sum(withImage.map((p) => p.image.src));
  if (slider >= PAGE_MEDIA_LIMIT_BYTES) out.push(`the slider fetches ${slider} bytes of images (limit ${PAGE_MEDIA_LIMIT_BYTES})`);
  const home = sum(withImage.filter((p) => homeIds.includes(p.id)).map((p) => p.image.thumb));
  if (home >= PAGE_MEDIA_LIMIT_BYTES) out.push(`the Home band fetches ${home} bytes of images (limit ${PAGE_MEDIA_LIMIT_BYTES})`);
  const caseTotal = sum(extraCaseFiles);
  if (caseTotal >= PAGE_MEDIA_LIMIT_BYTES) out.push(`the case view fetches ${caseTotal} bytes of images (limit ${PAGE_MEDIA_LIMIT_BYTES})`);
  return out;
}

// html: index.html text; js: path to text for every js/*.js; files: every path under img/projects/. The site has no video: no <video> in
// the page or in any script, nothing that autoplays, and no video file left in the repo to be fetched by accident.
export function checkNoVideo({ html, js, files = [] }) {
  const out = [];
  const sources = { 'index.html': html, ...js };
  for (const [file, text] of Object.entries(sources)) {
    if (/<video\b/i.test(text)) out.push(`${file}: the site has no video`);
    if (/\bautoplay\b/i.test(text)) out.push(`${file}: autoplay is not allowed`);
  }
  for (const file of files) if (/\.(?:mp4|webm)$/i.test(file)) out.push(`${file}: a video file is still in the repo`);
  return out;
}

// The data file and the Projects page never name a client: the real portal and the real client sites stay out.
// Chacao and Laboratorios are already public on the CV, so they are listed here. Any other name (a person, a company) comes in as
// `privateNames`, read by check.mjs from a git-ignored local file, so the public repo never has to contain it.
export function checkProjectNames({ projectsJs, pageHtml, privateNames = [] }) {
  const out = [];
  const literal = privateNames.map((n) => String(n).trim()).filter(Boolean).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(['chacao', 'laboratorios', ...literal].join('|'), 'i');
  if (re.test(projectsJs)) out.push('js/projects.js: names a client (' + projectsJs.match(re)[0] + ')');
  if (re.test(pageHtml)) out.push('the Projects page: names a client (' + pageHtml.match(re)[0] + ')');
  return out;
}
