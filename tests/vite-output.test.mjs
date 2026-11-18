import test from 'node:test';
import assert from 'node:assert/strict';
import { localViteUrl } from './vite-output.mjs';
test('finds Vite server URL when CI inserts ANSI codes inside the port', () => {
  assert.equal(localViteUrl('  Local: \u001b[36mhttp://127.0.0.1:\u001b[1m5173\u001b[22m/\u001b[39m'), 'http://127.0.0.1:5173/');
  assert.equal(localViteUrl('ready at http://127.0.0.1:9876/'), 'http://127.0.0.1:9876/');
  assert.equal(localViteUrl('not ready'), undefined);
});
