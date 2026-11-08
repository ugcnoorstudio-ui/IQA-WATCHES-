import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(
  new URL('../assets/published-content-sync.js', import.meta.url),
  'utf8',
);

function execute(hostname, disableSync = false) {
  let calls = 0;
  const window = {
    location: { hostname },
    IQA_SUPABASE_CONFIG: { publishableKey: 'test-publishable-key' },
    __IQA_DISABLE_PUBLISHED_CONTENT_SYNC__: disableSync,
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

test('local development and Playwright hosts never call the live Production content API', () => {
  for (const hostname of ['localhost', '127.0.0.1', '::1', '[::1]', 'iqa.localhost']) {
    assert.equal(execute(hostname), 0, hostname + ' must not call Production');
  }
});

test('Cloudflare PR previews and unapproved hosts never call Production', () => {
  for (const hostname of [
    'pr-157.iqa-watches-storefront.pages.dev',
    'feature-branch.iqa-watches-storefront.pages.dev',
    'preview.example.com',
    'ugcnoorstudio-ui.github.io.example.com',
  ]) {
    assert.equal(execute(hostname), 0, hostname + ' must not call Production');
  }
});

test('live published-content sync remains enabled on both approved production storefront hosts', () => {
  assert.equal(execute('ugcnoorstudio-ui.github.io'), 1);
  assert.equal(execute('iqa-watches-storefront.pages.dev'), 1);
});

test('explicit preview disable flag also blocks a production hostname', () => {
  assert.equal(execute('iqa-watches-storefront.pages.dev', true), 0);
});
