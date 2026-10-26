// Which characters does a .woff2 font file really have a glyph for? Reads the font's cmap table (the "characters to glyphs" map).
// A browser reports a font as "loaded" even when the file holds the wrong Unicode subset, so only this tells the truth.
// WOFF2 layout: 48-byte header, a table directory, then one Brotli stream holding every table back to back.
import zlib from 'node:zlib';

// The 63 table tags a WOFF2 directory can name by index (spec section 5.1); index 63 means "a 4-byte tag follows".
const KNOWN_TAGS = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill'];

function readTables(buf) {
  if (buf.toString('ascii', 0, 4) !== 'wOF2') throw new Error('not a WOFF2 file');
  const numTables = buf.readUInt16BE(12);
  const compressedLength = buf.readUInt32BE(20);
  let pos = 48;
  const base128 = () => { let v = 0; for (let i = 0; i < 5; i++) { const b = buf[pos++]; v = (v << 7) | (b & 0x7f); if (!(b & 0x80)) return v >>> 0; } throw new Error('bad UIntBase128'); };
  const tables = [];
  for (let i = 0; i < numTables; i++) {
    const flags = buf[pos++];
    const index = flags & 0x3f;
    let tag;
    if (index === 63) { tag = buf.toString('ascii', pos, pos + 4); pos += 4; } else tag = KNOWN_TAGS[index];
    const transform = flags >> 6;
    const origLength = base128();
    const transformed = tag === 'glyf' || tag === 'loca' ? transform === 0 : transform !== 0;     // only then a second length follows
    const length = transformed ? base128() : origLength;
    tables.push({ tag, length });
  }
  const data = zlib.brotliDecompressSync(buf.subarray(pos, pos + compressedLength));
  let offset = 0;
  for (const t of tables) { t.offset = offset; offset += t.length; }
  return { tables, data };
}

function addFormat4(view, base, out) {
  const segCount = view.readUInt16BE(base + 6) / 2;
  const endAt = base + 14, startAt = endAt + segCount * 2 + 2, deltaAt = startAt + segCount * 2, rangeAt = deltaAt + segCount * 2;
  for (let i = 0; i < segCount; i++) {
    const end = view.readUInt16BE(endAt + i * 2), start = view.readUInt16BE(startAt + i * 2);
    const delta = view.readInt16BE(deltaAt + i * 2), rangeOffset = view.readUInt16BE(rangeAt + i * 2);
    for (let c = start; c <= end && c !== 0xffff; c++) {
      let glyph;
      if (rangeOffset === 0) glyph = (c + delta) & 0xffff;
      else {
        const at = rangeAt + i * 2 + rangeOffset + (c - start) * 2;
        glyph = at + 2 <= view.length ? view.readUInt16BE(at) : 0;
        if (glyph !== 0) glyph = (glyph + delta) & 0xffff;
      }
      if (glyph !== 0) out.add(c);
    }
  }
}

function addFormat12(view, base, out) {
  const groups = view.readUInt32BE(base + 12);
  for (let i = 0; i < groups; i++) {
    const at = base + 16 + i * 12;
    const start = view.readUInt32BE(at), end = view.readUInt32BE(at + 4), glyph = view.readUInt32BE(at + 8);
    for (let c = start; c <= end; c++) if (glyph + (c - start) !== 0) out.add(c);
  }
}

// The set of Unicode code points the font has a glyph for.
export function fontCodePoints(buf) {
  const { tables, data } = readTables(buf);
  const cmap = tables.find((t) => t.tag === 'cmap');
  if (!cmap) throw new Error('the font has no cmap table');
  const view = data.subarray(cmap.offset, cmap.offset + cmap.length);
  const out = new Set();
  const count = view.readUInt16BE(2);
  for (let i = 0; i < count; i++) {
    const platform = view.readUInt16BE(4 + i * 8), encoding = view.readUInt16BE(6 + i * 8), at = view.readUInt32BE(8 + i * 8);
    if (!(platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10)))) continue;      // Unicode tables only
    const format = view.readUInt16BE(at);
    if (format === 4) addFormat4(view, at, out);
    else if (format === 12) addFormat12(view, at, out);
  }
  return out;
}
