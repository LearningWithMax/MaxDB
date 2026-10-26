// Dev helper for scripts/clips/ (not part of the site): drive the Chrome (or Edge) already installed on this PC through its debugging
// port, with no packages. A real browser renders the real site at any size and any pixel ratio, so a capture is as sharp as you ask
// for, unlike the screenshots of the app's browser pane (about 800 px wide). Needs Node 22 or newer (global WebSocket).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];

// The first browser on the list that exists, or null.
export function findChrome(exists = fs.existsSync, list = CHROME_CANDIDATES) {
  return list.find((p) => exists(p)) || null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Starts a headless browser with one page of `width` by `height` CSS pixels at `scale` device pixels per CSS pixel.
// Returns { send, eval, waitFor, shot, goto, close }. SwiftShader gives the pages WebGL without a GPU.
export async function launchChrome({ width = 1280, height = 800, scale = 2, port = 9333, chrome = findChrome() } = {}) {
  if (!chrome) throw new Error('no Chrome or Edge found; add its path to CHROME_CANDIDATES in scripts/lib/cdp.mjs');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'mdb-chrome-'));
  const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
    '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
  let targets = null;
  for (let i = 0; i < 60 && !targets; i++) {
    try { const t = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); if (t.some((x) => x.type === 'page')) targets = t; } catch { /* not up yet */ }
    if (!targets) await sleep(250);
  }
  if (!targets) { proc.kill(); throw new Error('the browser did not start'); }
  const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new Error('cannot reach the browser')); });
  let nextId = 0; const pending = new Map();
  ws.onmessage = (e) => { const m = JSON.parse(e.data); const p = m.id && pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } };
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++nextId; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });

  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false });

  // Evaluates an expression in the page (awaiting promises) and returns its value.
  const evalJs = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error('page error: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  };
  // Polls an expression until it is truthy; throws after `timeout` ms.
  const waitFor = async (expression, timeout = 15000, label = expression) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) { try { const v = await evalJs(expression); if (v) return v; } catch { /* page not ready */ } await sleep(120); }
    throw new Error('timed out waiting for ' + label);
  };
  return {
    send, eval: evalJs, waitFor, sleep,
    goto: async (url) => { await send('Page.navigate', { url }); await sleep(300); await waitFor("document.readyState === 'complete'", 20000, 'page load'); },
    // A lossless PNG of the viewport as a Buffer.
    shot: async () => Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'),
    close: async () => { try { ws.close(); } catch { /* already closed */ } proc.kill(); await sleep(400); try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* still locked: the temp folder cleans itself later */ } },
  };
}
