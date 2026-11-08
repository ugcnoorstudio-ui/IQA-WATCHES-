import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(
  new URL('../assets/published-content-sync.js', import.meta.url),
  'utf8',
);

function execute(hostname) {
  let calls = 0;
  const window = {
    location: { hostname },
    IQA_SUPABASE_CONFIG: { publishableKey: 'test-publishable-key' },
  };
  const document = {
    readyState: 'complete',
    querySelector: () => null,
  };
  runInNewContext(source, {
    window,
    document,
    fetch: () => {
      calls += 1;
      return Promise.resolve({ ok: false });
    },
    console: { warn() {} },
  });
  return calls;
}

test('local Playwright and development hosts never call the live Production content API', () => {
  for (const hostname of ['localhost', '127.0.0.1', '::1', '[::1]', 'iqa.localhost']) {
    assert.equal(execute(hostname), 0, hostname + ' must not call Production');
  }
});

test('public published-content sync remains enabled on the real storefront host', () => {
  assert.equal(execute('ugcnoorstudio-ui.github.io'), 1);
});
