// Tiny zero-dependency static server for local preview.
//   node scripts/serve.mjs            -> serves the repo root on http://localhost:5317
//   node scripts/serve.mjs <dir> 8080 -> serves another folder / port
//   --host   also prints the LAN URLs, so a phone on the same wifi can open the site
//   --save   enables POST /__save?path=img/logo/<name>.webp (used by scripts/stills/); binds to 127.0.0.1 only
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeSavePath } from './lib/savepath.mjs';
import { isServable, listenHost } from './lib/servable.mjs';

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const pos = args.filter((a) => !a.startsWith('--'));
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(pos[0] || path.join(here, '..'));
const port = Number(pos[1] || process.env.PORT || 5317);
const wantHost = flags.has('--host'), wantSave = flags.has('--save');
if (wantHost && wantSave) { console.error('Do not combine --host and --save: saving files is localhost only.'); process.exit(1); }

const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
};

function handleSave(req, res, url) {
  if (!wantSave || req.method !== 'POST') { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('404'); return; }
  const dest = safeSavePath(root, url.searchParams.get('path'));
  if (!dest) { res.writeHead(400).end('Bad path'); return; }
  const chunks = []; let size = 0;
  req.on('data', (c) => { size += c.length; if (size > 5e6) req.destroy(); else chunks.push(c); });
  req.on('end', () => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, Buffer.concat(chunks));
    res.writeHead(204).end();
  });
}

const server = http.createServer((req, res) => {
  let url;
  try { url = new URL(req.url, 'http://x'); } catch { res.writeHead(400).end('Bad request'); return; }
  if (url.pathname === '/__save') { handleSave(req, res, url); return; }
  let rel;
  try { rel = decodeURIComponent(url.pathname); }
  catch { res.writeHead(400).end('Bad request'); return; }
  if (!isServable(url.pathname)) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('404 ' + rel); return; }
  let file = path.join(root, rel);
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end('Forbidden'); return; }
  try { if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html'); } catch {}
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('404 ' + rel); return; }
    res.writeHead(200, {
      'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    }).end(data);
  });
});

const onListen = () => {
  console.log(`Serving ${root} at http://localhost:${port}${wantSave ? '  (save route on)' : ''}`);
  if (wantHost) {
    for (const list of Object.values(os.networkInterfaces()))
      for (const i of list || []) if (i.family === 'IPv4' && !i.internal) console.log(`On your network: http://${i.address}:${port}`);
  }
};
server.listen(port, listenHost(wantHost), onListen);
