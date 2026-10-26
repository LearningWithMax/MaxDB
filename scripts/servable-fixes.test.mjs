import test from 'node:test';
import assert from 'node:assert/strict';
import { isServable, listenHost } from './lib/servable.mjs';

// Fix from the final review: on Windows an encoded backslash is a path separator, so it must not hide a dot folder.
for (const sneaky of ['/%5C.git%5Cconfig', '/a%5C..%5Coriginals%5Cx.jpg', '/.superpowers%5Csdd%5Cx', '/img%5C..%5C.git%5Chead', '/x\\.git\\config']) {
  test(`isServable refuses the backslash form ${sneaky}`, () => assert.equal(isServable(sneaky), false));
}

test('listenHost: localhost only unless --host was given', () => {
  assert.equal(listenHost(false), '127.0.0.1');
  assert.equal(listenHost(true), '0.0.0.0');
});
