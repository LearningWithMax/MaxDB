import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SEO, seoHeadHtml, sitemapXml, robotsTxt } from './lib/seo.mjs';
import { findBannedText } from './lib/rules.mjs';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const html = read('index.html');
const head = (cfg = SEO) => seoHeadHtml(cfg);
const attr = (tag, name, h = head()) => { const m = h.match(new RegExp('<' + tag + '[^>]*?\\b' + name + '="([^"]*)"')); return m ? m[1] : null; };
const meta = (key, value, h = head()) => { const m = h.match(new RegExp('<meta [^>]*\\b' + key + '="' + value + '"[^>]*\\bcontent="([^"]*)"')); return m ? m[1] : null; };
const unescape = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

test('the config: an https site address ending in a slash, a short title with the name, a description of a search result length', () => {
  assert.match(SEO.site, /^https:\/\/[a-z0-9.-]+\/(?:[A-Za-z0-9-]+\/)?$/);
  assert.ok(SEO.title.includes('Max Duffaud Bibas'));
  assert.ok(SEO.title.length <= 60, 'a title longer than about 60 characters is cut in a search result (' + SEO.title.length + ')');
  assert.ok(SEO.description.length >= 70 && SEO.description.length <= 160, 'a description is 70 to 160 characters (' + SEO.description.length + ')');
  assert.ok(SEO.imageAlt.length > 20 && SEO.imageAlt.length <= 125);
  assert.deepEqual(findBannedText('seo config', [SEO.title, SEO.description, SEO.imageAlt].join('\n')), [], 'the copy rules: no dashes, American spelling, straight quotes');
  assert.match([SEO.title, SEO.description, SEO.imageAlt].join(''), /^[\x20-\x7e]+$/, 'plain characters only: a search engine or a chat app may not show anything else');
});

test('seoHeadHtml: the title, the description and the canonical address of the one page', () => {
  const h = head();
  assert.equal(h.match(/<title>([^<]*)<\/title>/)[1], SEO.title);
  assert.equal([...h.matchAll(/<title>/g)].length, 1);
  assert.equal(meta('name', 'description'), SEO.description);
  assert.equal(attr('link rel="canonical"', 'href'), SEO.site);
  assert.doesNotMatch(h, /noindex|nofollow/i, 'the page must be indexable');
});

test('seoHeadHtml: Open Graph tags (LinkedIn, WhatsApp, Facebook, Slack, iMessage): type, site name, title, description, address, and a 1200 by 630 image with a description', () => {
  const h = head();
  assert.equal(meta('property', 'og:type'), 'website');
  assert.equal(meta('property', 'og:site_name'), SEO.name);
  assert.equal(meta('property', 'og:title'), SEO.title);
  assert.equal(meta('property', 'og:description'), SEO.description);
  assert.equal(meta('property', 'og:url'), SEO.site);
  assert.equal(meta('property', 'og:locale'), 'en_US');
  assert.equal(meta('property', 'og:image'), SEO.site + SEO.image);
  assert.equal(meta('property', 'og:image:width'), '1200');
  assert.equal(meta('property', 'og:image:height'), '630');
  assert.equal(meta('property', 'og:image:alt'), SEO.imageAlt);
  assert.ok(h.includes('<meta property="og:image" '));
});

test('seoHeadHtml: the same card for X (Twitter): a large image card with title, description, image and its description', () => {
  assert.equal(meta('name', 'twitter:card'), 'summary_large_image');
  assert.equal(meta('name', 'twitter:title'), SEO.title);
  assert.equal(meta('name', 'twitter:description'), SEO.description);
  assert.equal(meta('name', 'twitter:image'), SEO.site + SEO.image);
  assert.equal(meta('name', 'twitter:image:alt'), SEO.imageAlt);
});

test('seoHeadHtml: structured data says who the page is about, and only what the page says: the name, the address, the LinkedIn profile and the four languages', () => {
  const m = head().match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(m, 'one JSON-LD script');
  const data = JSON.parse(m[1]);
  assert.equal(data['@context'], 'https://schema.org');
  const byType = Object.fromEntries(data['@graph'].map((n) => [n['@type'], n]));
  assert.equal(byType.WebSite.url, SEO.site);
  assert.equal(byType.WebSite.name, SEO.name);
  assert.equal(byType.Person.name, SEO.name);
  assert.equal(byType.Person.url, SEO.site);
  assert.deepEqual(byType.Person.sameAs, [SEO.linkedin]);
  assert.deepEqual(byType.Person.knowsLanguage, ['fr', 'es', 'en', 'he']);
  assert.deepEqual(Object.keys(byType.Person).sort(), ['@id', '@type', 'knowsLanguage', 'name', 'sameAs', 'url'], 'no claim beyond what the page shows');
});

test('every address in the tags starts with the one site address, so moving to another domain is one change', () => {
  const urls = [...head().matchAll(/https?:\/\/[^"\s<,\]]+/g)].map((m) => m[0]).filter((u) => !u.startsWith('https://schema.org') && !u.startsWith(SEO.linkedin));
  assert.ok(urls.length >= 8, 'found ' + urls.length);
  for (const u of urls) assert.ok(u.startsWith(SEO.site), u);
});

test('seoHeadHtml: a hostile title or description cannot break out of its attribute or the JSON', () => {
  const evil = { ...SEO, title: 'A "quoted" <b>title</b> & more', description: '"><script>alert(1)</script>' + 'x'.repeat(80), imageAlt: 'It\'s "alt"' };
  const h = seoHeadHtml(evil);
  assert.doesNotMatch(h, /<script>alert|<b>title/);
  assert.equal(unescape(meta('property', 'og:title', h)), evil.title);
  assert.equal(unescape(meta('name', 'description', h)), evil.description);
  assert.ok(JSON.parse(h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]), 'the JSON still parses');
  assert.doesNotMatch(h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1], /<\//, 'no closing tag inside the JSON');
});

test('index.html carries exactly the generated block between its markers, and no other title, canonical or Open Graph tag', () => {
  const m = html.match(/<!-- seo:start -->([\s\S]*?)<!-- seo:end -->/);
  assert.ok(m, 'the markers');
  const squash = (s) => s.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();
  assert.equal(squash(m[1]), squash(seoHeadHtml(SEO)));
  const outside = html.replace(m[0], '');
  assert.doesNotMatch(outside, /<title>|rel="canonical"|property="og:|name="twitter:|name="description"|application\/ld\+json/);
  assert.ok(html.indexOf('<!-- seo:start -->') < html.indexOf('rel="stylesheet"'), 'in the head, before the stylesheets');
  assert.ok(html.indexOf('<!-- seo:end -->') < html.indexOf('</head>'));
});

test('the LinkedIn address in the tags is the one the page links to', () => {
  const links = [...html.matchAll(/href="(https:\/\/linkedin\.com\/in\/[^"]+)"/g)].map((m) => m[1]);
  assert.ok(links.length >= 2);
  for (const l of links) assert.equal(l, SEO.linkedin);
});

test('the four languages in the structured data are the four the page names', () => {
  for (const word of ['French', 'Spanish', 'English', 'Hebrew']) assert.ok(html.includes(word), word);
});

test('the share image exists in the repo: a PNG of 1200 by 630 under 1 MB', () => {
  const file = new URL('../' + SEO.image, import.meta.url);
  assert.ok(fs.existsSync(file), SEO.image);
  const b = fs.readFileSync(file);
  assert.equal(b.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(b.readUInt32BE(16), 1200);
  assert.equal(b.readUInt32BE(20), 630);
  assert.ok(b.length < 1000000, b.length + ' bytes');
});

test('sitemap.xml lists the one page, and robots.txt allows everything and points at the sitemap; both files are what the generator writes', () => {
  const sm = sitemapXml(SEO);
  assert.match(sm, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.deepEqual([...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]), [SEO.site]);
  assert.doesNotMatch(sm, /#/, 'a fragment (#cv) is not a separate page for a search engine');
  const rb = robotsTxt(SEO);
  assert.match(rb, /^User-agent: \*\nAllow: \/\nSitemap: /m);
  assert.ok(rb.includes('Sitemap: ' + SEO.site + 'sitemap.xml'));
  assert.equal(read('sitemap.xml').replace(/\r\n/g, '\n'), sm);
  assert.equal(read('robots.txt').replace(/\r\n/g, '\n'), rb);
});

test('every image in the page has an alt attribute (empty for a decorative one)', () => {
  const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  assert.ok(imgs.length > 0);
  for (const tag of imgs) assert.match(tag, /\balt="/, tag.slice(0, 80));
});
