// The page's search and sharing tags, generated from one config so a change is one edit and one command (node scripts/seo.mjs):
// the title and description a search result shows, the canonical address, the Open Graph tags that LinkedIn, WhatsApp, Facebook, Slack and
// iMessage read for a link preview, the X (Twitter) card, and a little structured data. Also the sitemap and robots files.
// The addresses here are absolute on purpose (a crawler needs them); the rest of the site uses relative paths. If the site moves to its own
// domain, change `site` below and run the command.

export const SEO = {
  site: 'https://learningwithmax.github.io/MaxDB/',
  name: 'Max Duffaud Bibas',
  title: 'Max Duffaud Bibas | CV, projects and trip',
  description: 'Seven jobs across five countries, from the lab bench to the greenhouse floor and client visits. The CV, projects and trip of Max Duffaud Bibas. Open to remote.',
  image: 'img/og.png',
  imageAlt: 'The chrome balloon letters MDB on a black background, with the name Max Duffaud Bibas below.',
  linkedin: 'https://linkedin.com/in/max-duffaud',
  languages: ['fr', 'es', 'en', 'he'],
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// The tags for the page head, one per line.
export function seoHeadHtml(c) {
  const image = c.site + c.image;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': c.site + '#website', name: c.name, url: c.site },
      { '@type': 'Person', '@id': c.site + '#person', name: c.name, url: c.site, sameAs: [c.linkedin], knowsLanguage: c.languages },
    ],
  };
  return [
    `<title>${esc(c.title)}</title>`,
    `<meta name="description" content="${esc(c.description)}">`,
    `<link rel="canonical" href="${esc(c.site)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${esc(c.name)}">`,
    `<meta property="og:title" content="${esc(c.title)}">`,
    `<meta property="og:description" content="${esc(c.description)}">`,
    `<meta property="og:url" content="${esc(c.site)}">`,
    `<meta property="og:locale" content="en_US">`,
    `<meta property="og:image" content="${esc(image)}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${esc(c.imageAlt)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(c.title)}">`,
    `<meta name="twitter:description" content="${esc(c.description)}">`,
    `<meta name="twitter:image" content="${esc(image)}">`,
    `<meta name="twitter:image:alt" content="${esc(c.imageAlt)}">`,
    `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`,
  ].join('\n');
}

// One page: the routes are #fragments (#cv, #projects, #trip), which a search engine does not treat as separate pages.
export function sitemapXml(c) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${esc(c.site)}</loc>\n  </url>\n</urlset>\n`;
}

// Crawlers only read robots.txt at the root of a domain, so on a github.io project address (/MaxDB/) this file is ignored; it starts
// to count if the site moves to its own domain. The sitemap can always be given to Google Search Console directly.
export function robotsTxt(c) {
  return `User-agent: *\nAllow: /\nSitemap: ${c.site}sitemap.xml\n`;
}
