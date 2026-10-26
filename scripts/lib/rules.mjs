// Pure check rules used by scripts/check.mjs and tested in scripts/*.test.mjs.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

// Returns null when `src` parses as an ES module, else the syntax error text.
export function parseEsModule(src) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'esm-'));
  const file = path.join(dir, 'm.mjs');
  fs.writeFileSync(file, src);
  try {
    const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (r.status === 0) return null;
    const text = (r.stderr || '').split('\n').filter((l) => /Error/.test(l)).join(' ').trim();
    return text || 'SyntaxError: module does not parse';
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Import map rules: every target is a relative path that exists. No absolute paths (the site lives under
// /MaxDB/) and no remote URLs (libraries are vendored).
export function checkImportMap(html, exists) {
  const m = html.match(/<script[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return [];
  let map;
  try { map = JSON.parse(m[1]); } catch (e) { return ['import map is not valid JSON: ' + e.message]; }
  const out = [];
  for (const [spec, target] of Object.entries(map.imports || {})) {
    if (/^https?:\/\//i.test(target)) out.push(`import map "${spec}": remote URL ${target} (vendor it instead)`);
    else if (target.startsWith('/')) out.push(`import map "${spec}": absolute path ${target} (breaks under /MaxDB/)`);
    else if (!exists(target.replace(/^\.\//, ''))) out.push(`import map "${spec}": file not found ${target}`);
  }
  return out;
}

// Vendored files must match the sha256 recorded in vendor/MANIFEST.json (no silent edits, no missing files).
export function verifyManifest(manifest, read) {
  const out = [];
  for (const [rel, meta] of Object.entries(manifest.files || {})) {
    const buf = read(rel);
    if (!buf) { out.push(`vendor file missing: ${rel}`); continue; }
    const got = crypto.createHash('sha256').update(buf).digest('hex');
    if (got !== meta.sha256) out.push(`vendor file changed: ${rel}`);
  }
  return out;
}

// Lens text variants: every [data-lens-group] must contain exactly one variant per lens (all, chem, ops, cust).
// Groups are siblings and variants never contain groups, so a variant belongs to the nearest group before it.
const LENS_KEYS = ['all', 'chem', 'ops', 'cust'];
export function checkLensVariants(html) {
  const out = [];
  const groups = [...html.matchAll(/data-lens-group="([^"]+)"/g)].map((m) => ({ name: m[1], at: m.index }));
  const texts = [...html.matchAll(/data-lens-text="([^"]*)"/g)].map((m) => ({ lens: m[1], at: m.index }));
  const firstGroup = groups.length ? groups[0].at : Infinity;
  if (texts.some((t) => t.at < firstGroup)) out.push('data-lens-text outside any data-lens-group');
  groups.forEach((g, i) => {
    const end = i + 1 < groups.length ? groups[i + 1].at : Infinity;
    const mine = texts.filter((t) => t.at > g.at && t.at < end);
    for (const t of mine) if (!LENS_KEYS.includes(t.lens)) out.push(`lens group "${g.name}": unknown lens "${t.lens}"`);
    for (const key of LENS_KEYS) {
      const n = mine.filter((t) => t.lens === key).length;
      if (n === 0) out.push(`lens group "${g.name}": missing variant "${key}"`);
      if (n > 1) out.push(`lens group "${g.name}": duplicate variant "${key}"`);
    }
  });
  return out;
}

// Copy rules for everything shipped to visitors (owner's rules): no em or en dashes (as characters or entities),
// straight quotes only, American spelling, the company is Cann.Edenn, the lens is Customer-Facing, and nothing
// from the NDA'd employer's listing work. Each message names the file.
const BANNED = [
  [/\u2014/, 'em dash'], [/\u2013/, 'en dash'], [/&mdash;/i, '&mdash; entity'], [/&ndash;/i, '&ndash; entity'],
  [/[\u2018\u2019]/, 'curly apostrophe (use a straight one)'], [/[\u201c\u201d]/, 'curly quote (use a straight one)'],
  [/&[lr]squo;/i, 'curly apostrophe entity'], [/&[lr]dquo;/i, 'curly quote entity'],
  [/Technical Sales/, '"Technical Sales" (the lens is Customer-Facing)'],
  [/Cann\.Eden(?!n)/, '"Cann.Eden" (the company is Cann.Edenn)'],
  [/\borganis(?:e|ed|es|ing|ation|ations|er|ers)\b/i, 'British spelling "organis-"'],
  [/\bcolour/i, 'British spelling "colour"'], [/\bcentres?\b/i, 'British spelling "centre"'], [/\bprogrammes?\b/i, 'British spelling "programme"'],
  [/\banalys(?:e|ed|ing)\b/i, 'British spelling "analyse"'], [/\bbehaviour/i, 'British spelling "behaviour"'], [/\bfavour/i, 'British spelling "favour"'],
  [/\brealis(?:e|ed|es|ing|ation)\b/i, 'British spelling "realis-"'], [/\boptimis(?:e|ed|es|ing|ation)\b/i, 'British spelling "optimis-"'],
  [/\bspecialis(?:e|ed|es|ing|ation)\b/i, 'British spelling "specialis-"'],
  [/\b\w+isations?\b/i, 'British spelling "-isation" (use -ization)'],
  [/listing review/i, 'NDA: no listing review'],
  [/Microsoft Teams/, 'NDA: Intelcia is described by one fact only (no product names)'],
];

export function findBannedText(name, text) {
  const out = [];
  for (const [re, label] of BANNED) if (re.test(text)) out.push(`${name}: ${label}`);
  return out;
}

// Board jobs on the CV page: every .job[data-board] must be something the board can show. It runs the same parseJobs the
// board runs at start-up, so a line the flaps cannot show (or a bad weight) fails the check instead of silently hiding the board.
import { parseJobs } from '../../modules/board-data.js';
const decodeEntities = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
export function checkBoardLines(html) {
  const out = [];
  for (const tag of html.matchAll(/<[^>]*\bdata-board\b[^>]*>/g)) {
    const attrs = Object.fromEntries([...tag[0].matchAll(/\bdata-([a-z-]+)="([^"]*)"/g)].map((m) => [m[1], decodeEntities(m[2])]));
    const row = {
      year: attrs.year, place: attrs.place, company: attrs.company,
      lines: { all: attrs['line-all'], chem: attrs['line-chem'], ops: attrs['line-ops'], cust: attrs['line-cust'] },
      weights: { chem: attrs['w-chem'], ops: attrs['w-ops'], cust: attrs['w-cust'] },
    };
    try { parseJobs([row]); } catch (e) { out.push(`board job "${attrs.company || '(no company)'}": ${e.message}`); }
  }
  return out;
}

// Intelcia is described by one fact only (NDA). Every bullet under that job must be exactly the approved sentence
// (it may repeat, once per lens variant).
export const INTELCIA_FACT = 'Onboarded every new hire as the team grew from about 10 to 35.';
export function checkIntelciaFact(html) {
  const at = html.search(/class="job-title">[^<]*Intelcia/);
  if (at < 0) return [];
  const start = html.lastIndexOf('<div class="job"', at);
  const next = html.indexOf('<div class="job"', at);
  const block = html.slice(start < 0 ? at : start, next < 0 ? html.length : next);
  const bullets = [...block.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => decodeEntities(m[1].replace(/<[^>]+>/g, '').trim()));
  if (!bullets.length) return ['Intelcia entry has no bullet: it must carry the one approved fact'];
  return bullets.filter((t) => t !== INTELCIA_FACT).map((t) => `Intelcia: only the one approved fact is allowed (NDA), found: "${t.slice(0, 60)}"`);
}

// Logo assets made by scripts/stills/ from the chrome render: one banner logo (30 KB at most), two favicons and the sharing image.
// The banner logo no longer follows the lens, so a leftover per-finish banner still is a mistake.
export function checkLogoAssets(files) {
  const out = [];
  const have = new Map(files.map((f) => [f.name, f.bytes]));
  const required = ['img/logo/chrome-banner.webp', 'img/logo/favicon-32.png', 'img/logo/favicon-180.png', 'img/og.png'];
  for (const name of required) if (!have.has(name)) out.push(`logo asset missing: ${name} (run scripts/stills/)`);
  for (const [name, bytes] of have) if (/^img\/logo\/.*\.webp$/.test(name) && bytes > 30000) out.push(`logo asset too big: ${name} is ${bytes} bytes (limit 30000)`);
  for (const name of have.keys()) if (/^img\/logo\/(gold|emerald|gunmetal|orange)-banner\.webp$/.test(name)) out.push(`leftover lens-finish logo: ${name} (the banner logo is one fixed chrome image)`);
  return out;
}

// Fonts (brief section 4): self-hosted only, font-display swap, every src on disk, 120 KB of woff2 at most in total.
// `css` maps a css file path (css/x.css) to its text; `fontBytes` maps a font path (vendor/fonts/x.woff2) to its size.
export const FONT_BUDGET_BYTES = 120000;
export function checkFonts({ css, fontBytes }) {
  const out = [];
  for (const [file, text] of Object.entries(css)) {
    for (const host of ['fonts.googleapis.com', 'fonts.gstatic.com']) if (text.includes(host)) out.push(`${file}: outside font request to ${host} (fonts are self-hosted)`);
    for (const face of text.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
      if (!/font-display\s*:\s*swap/.test(face[1])) out.push(`${file}: @font-face without font-display: swap`);
      for (const u of face[1].matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
        if (/^(https?:)?\/\//.test(u[1])) continue;
        const rel = path.posix.normalize(path.posix.join(path.posix.dirname(file), u[1]));
        if (!(rel in fontBytes)) out.push(`${file}: font file not found: ${rel}`);
      }
    }
  }
  const total = Object.values(fontBytes).reduce((a, b) => a + b, 0);
  if (total > FONT_BUDGET_BYTES) out.push(`fonts total ${total} bytes (limit ${FONT_BUDGET_BYTES})`);
  return out;
}

// Every var(--name) without a fallback must be defined by some stylesheet (a typo or a deleted token fails here).
export function checkCssVars(css) {
  const defined = new Set();
  for (const text of Object.values(css)) for (const m of text.matchAll(/(--[a-z0-9-]+)\s*:/gi)) defined.add(m[1]);
  const out = new Set();
  for (const [file, text] of Object.entries(css)) {
    for (const m of text.matchAll(/var\(\s*(--[a-z0-9-]+)\s*\)/gi)) if (!defined.has(m[1])) out.add(`${file}: var(${m[1]}) is not defined anywhere and has no fallback`);
  }
  return [...out];
}

// The viewport tag must exist and must not block pinch zoom.
export function checkViewport(html) {
  const m = html.match(/<meta[^>]*name=["']viewport["'][^>]*content=["']([^"']*)["']/i);
  if (!m) return ['index.html: no viewport meta tag'];
  const out = [];
  if (/maximum-scale\s*=/i.test(m[1])) out.push('viewport sets maximum-scale (it blocks pinch zoom)');
  if (/user-scalable\s*=\s*(no|0)/i.test(m[1])) out.push('viewport sets user-scalable=no (it blocks pinch zoom)');
  return out;
}

// Home's departures preview: its three .dep-row elements must repeat the first three CV jobs (year, place, company and the "all"
// board line), so a fact is written once and the preview cannot drift. The "N MORE JOBS" line counts the rest.
export function checkDeparturesPreview(html) {
  const jobs = [...html.matchAll(/<[^>]*\bdata-board\b[^>]*>/g)].map((m) => Object.fromEntries([...m[0].matchAll(/\bdata-([a-z-]+)="([^"]*)"/g)].map((a) => [a[1], decodeEntities(a[2])])));
  const rows = [...html.matchAll(/<div class="dep-row">([\s\S]*?)<\/div>/g)].map((m) => m[1]);
  if (!rows.length && !/class="dep-more"/.test(html)) return [];               // no preview on the page
  const out = [];
  if (rows.length !== 3) out.push(`departures preview: expected three rows, found ${rows.length}`);
  const field = (row, cls) => { const m = row.match(new RegExp('<span class="dep-' + cls + '">(.*?)</span>', 's')); return m ? decodeEntities(m[1].trim()) : ''; };
  rows.slice(0, 3).forEach((row, i) => {
    const job = jobs[i];
    if (!job) { out.push(`dep-row ${i + 1}: there is no CV job to match`); return; }
    for (const [cls, attr] of [['year', 'year'], ['place', 'place'], ['company', 'company'], ['line', 'line-all']]) {
      const got = field(row, cls);
      if (got !== job[attr]) out.push(`dep-row ${i + 1}: ${cls} "${got}" does not match the CV job (data-${attr}="${job[attr]}")`);
    }
  });
  const more = html.match(/<div class="dep-more">\s*(\d+) MORE JOBS/);
  if (!more) out.push('departures preview: the "N MORE JOBS" line is missing');
  else if (Number(more[1]) !== jobs.length - 3) out.push(`departures preview: says ${more[1]} MORE JOBS but the CV has ${jobs.length} jobs (expected ${jobs.length - 3})`);
  return out;
}

// Nothing on the site may loop on its own (brief section 7), except the Welcome gate's breathing and the story's scroll hint.
// Flags every rule that carries an endless animation, naming the file and the selector.
export const ALLOWED_LOOPS = ['gateBreathe', 'hintBounce'];
export function checkNoLoops(css) {
  const out = [];
  for (const [file, text] of Object.entries(css)) {
    for (const m of text.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
      if (!/\binfinite\b/.test(m[2])) continue;
      if (ALLOWED_LOOPS.some((name) => m[2].includes(name))) continue;
      const selector = m[1].replace(/\s+/g, ' ').trim();
      out.push(`${file}: an endless animation in "${selector}" (only ${ALLOWED_LOOPS.join(' and ')} may loop)`);
    }
  }
  return out;
}

// Font glyph coverage: a vendored file must really hold the characters the site sets in it. (A "latin-ext" subset file loads without
// error and has almost no ASCII, so the page silently used a fallback font.) `required` is, per file, a string of characters.
const ASCII_PRINTABLE = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('');
const WESTERN = '·éçã';                                   // middle dot, e acute, c cedilla, a tilde (place names, "Universite")
export const FONT_REQUIRED = {
  'vendor/fonts/InstrumentSerif-400.woff2': ASCII_PRINTABLE + WESTERN,
  'vendor/fonts/InstrumentSerif-400-italic.woff2': ASCII_PRINTABLE + WESTERN,
  'vendor/fonts/JetBrainsMono-400.woff2': ASCII_PRINTABLE + WESTERN + '→−',
  'vendor/fonts/Inter-400-600.woff2': ASCII_PRINTABLE + WESTERN + '→',
  'vendor/fonts/RobotoCondensed-700.woff2': ASCII_PRINTABLE,                     // the board and the gate: capitals, digits and punctuation
};
export function checkFontCoverage(coverage, required = FONT_REQUIRED) {
  const out = [];
  for (const [file, chars] of Object.entries(required)) {
    const have = coverage[file];
    if (!have) { out.push(`${file}: no glyph table was read for this font`); continue; }
    const missing = [...chars].filter((ch) => !have.has(ch.codePointAt(0)));
    if (missing.length) out.push(`${file}: no glyph for ${missing.map((c) => `"${c}" U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`).join(', ')} (wrong Unicode subset? the page would fall back to another font)`);
  }
  return out;
}

// Every character the site's own text shows beyond ASCII must be in the font subset (FONT_TEXT in scripts/lib/font-text.mjs), or that
// glyph silently falls back to a system font. `texts` maps a file name to its source text. Unknown named entities are reported too.
import { decodeSiteEntities, siteExtraChars } from './font-text.mjs';
export function checkSiteGlyphs(texts, fontText) {
  const out = [];
  for (const [file, text] of Object.entries(texts)) {
    for (const entity of decodeSiteEntities(text).unknown) out.push(`${file}: the entity ${entity} is not in the decoder table (scripts/lib/font-text.mjs), so its character cannot be checked`);
    for (const ch of siteExtraChars(text)) {
      if (!fontText.includes(ch)) out.push(`${file}: "${ch}" U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')} is shown on the site but is not in the font subset: add it to FONT_TEXT (scripts/lib/font-text.mjs) and run node scripts/vendor-fonts.mjs`);
    }
  }
  return out;
}

// The Projects page rules live in their own file.
export * from './project-rules.mjs';
