// Load a classic (non-module) browser script in a vm context and return some of its top-level bindings,
// so Node tests can call the pure functions the site's scripts declare globally.
import fs from 'node:fs';
import vm from 'node:vm';

export function loadClassic(file, names, globals = {}) {
  const src = fs.readFileSync(file, 'utf8');
  const ctx = vm.createContext({ console, ...globals });
  return vm.runInContext(`${src}\n;({${names.join(',')}})`, ctx, { filename: file });
}
