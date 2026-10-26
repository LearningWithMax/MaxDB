// Which request paths the dev server may answer. The repo root also holds things that are not part of the site (git data,
// private notes, scratch files, full-size photos), and the server can be opened to the local network with --host, so
// anything dot-prefixed, private (*.local.*), or in originals/ and node_modules/ is refused.
export function isServable(urlPath) {
  let p;
  try { p = decodeURIComponent(urlPath); } catch { return false; }
  const parts = p.split(/[\\/]/).filter(Boolean);       // on Windows a backslash is a separator too
  for (const seg of parts) {
    if (seg === '..' || seg.startsWith('.')) return false;
    if (/\.local\./i.test(seg)) return false;
    if (seg === 'originals' || seg === 'node_modules') return false;
  }
  return true;
}

// The dev server listens on localhost only, unless --host was given (then every interface, for a phone on the same wifi).
export function listenHost(wantHost) {
  return wantHost ? '0.0.0.0' : '127.0.0.1';
}
