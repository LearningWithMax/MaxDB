// Writes the search and sharing tags into index.html (between the seo markers, or in place of the old <title>), and sitemap.xml and
// robots.txt, from the config in scripts/lib/seo.mjs. Run it after changing the title, the description, the share image or the site address;
// a test (seo.test.mjs) fails while index.html and the config differ.
//   node scripts/seo.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEO, seoHeadHtml, sitemapXml, robotsTxt } from './lib/seo.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'index.html');
const raw = fs.readFileSync(file, 'utf8');
const crlf = raw.includes('\r\n');
let text = raw.replace(/\r\n/g, '\n');

const block = '<!-- seo:start -->\n' + seoHeadHtml(SEO) + '\n<!-- seo:end -->';
if (/<!-- seo:start -->[\s\S]*?<!-- seo:end -->/.test(text)) text = text.replace(/<!-- seo:start -->[\s\S]*?<!-- seo:end -->/, () => block);
else if (/<title>[^<]*<\/title>/.test(text)) text = text.replace(/<title>[^<]*<\/title>/, () => block);
else { console.error('no seo markers and no <title> found in index.html'); process.exit(1); }

const out = crlf ? text.replace(/\n/g, '\r\n') : text;
const changed = out !== raw;
if (changed) fs.writeFileSync(file, out);
for (const [name, body] of [['sitemap.xml', sitemapXml(SEO)], ['robots.txt', robotsTxt(SEO)]]) {
  const p = path.join(root, name);
  if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n') !== body) { fs.writeFileSync(p, body); console.log('wrote', name); }
}
console.log(changed ? 'wrote the tags into index.html' : 'index.html already up to date');
