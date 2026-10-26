// Writes img/grain.png: a 128 by 128 tile of faint noise (grayscale plus alpha) that the page background repeats.
//   node scripts/grain.mjs
// Each pixel is white or black at an alpha of 0 to 10 out of 255, so the same tile adds a whisper of paper grain on the dark
// page and on the paper page. The noise is seeded, so running this again gives the same file.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const SIZE = 128, SEED = 20261023;
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const head = Buffer.alloc(4); head.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const tail = Buffer.alloc(4); tail.writeUInt32BE(crc32(body));
  return Buffer.concat([head, body, tail]);
}

export function makeGrain() {
  const rnd = mulberry32(SEED);
  const raw = Buffer.alloc((SIZE * 2 + 1) * SIZE);            // per row: filter byte 0, then (gray, alpha) per pixel
  let o = 0;
  for (let y = 0; y < SIZE; y++) {
    raw[o++] = 0;
    for (let x = 0; x < SIZE; x++) { raw[o++] = rnd() < 0.5 ? 255 : 0; raw[o++] = Math.floor(rnd() * 11); }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0); ihdr.writeUInt32BE(SIZE, 4); ihdr[8] = 8; ihdr[9] = 4;   // 8 bit, color type 4 = grayscale + alpha
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const png = makeGrain();
  fs.mkdirSync(path.join(root, 'img'), { recursive: true });
  fs.writeFileSync(path.join(root, 'img/grain.png'), png);
  console.log(`img/grain.png written: ${png.length} bytes`);
}
