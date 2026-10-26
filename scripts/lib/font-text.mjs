// The characters the site fonts are cut to (scripts/vendor-fonts.mjs asks Google Fonts for exactly these glyphs), and the helpers
// that find which characters the site's own text really uses. A character outside FONT_TEXT would fall back to a system font for
// that one glyph, so scripts/check.mjs fails if site text ever uses one: add it here and run  node scripts/vendor-fonts.mjs.
const ASCII = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('');
// copyright, middle dot, A acute, multiplication sign, a acute, a tilde, c cedilla, e acute, n tilde, right arrow, anticlockwise
// arrow (zoom reset), minus sign (zoom out), heavy multiplication x (the close mark in two popup footnotes)
export const FONT_TEXT = ASCII + '©·Á×áãçéñ→↺−✕';

// The named entities the site's HTML may use. An entity not listed here is reported, so it can never hide a character from the check.
export const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: '·', rarr: '→', larr: '←', uarr: '↑', darr: '↓',
  minus: '−', times: '×', copy: '©', eacute: 'é', egrave: 'è', aacute: 'á', atilde: 'ã', ccedil: 'ç',
  ntilde: 'ñ', hellip: '…', bull: '•', euro: '€', trade: '™', laquo: '«', raquo: '»',
};

// { text, unknown }: the text with numeric and known named entities decoded, and the named entities that were not recognized.
export function decodeSiteEntities(text) {
  const unknown = new Set();
  const out = text
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z][a-z0-9]*);/gi, (m, name) => { if (name in ENTITIES) return ENTITIES[name]; unknown.add(m); return m; });
  return { text: out, unknown: [...unknown] };
}

// The characters in `text` beyond printable ASCII that a font has to supply. Emoji and flags come from the system, and a non-breaking
// space is just a space.
export function siteExtraChars(text) {
  const extra = new Set();
  for (const ch of decodeSiteEntities(text).text) {
    const cp = ch.codePointAt(0);
    if (cp <= 0x7e || cp === 0xa0 || cp >= 0x1f000 || cp === 0xfe0f || cp === 0x200d) continue;
    extra.add(ch);
  }
  return extra;
}
