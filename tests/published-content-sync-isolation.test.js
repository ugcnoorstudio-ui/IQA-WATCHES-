import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(
  new URL('../assets/published-content-sync.js', import.meta.url),
  'utf8',
);

function execute(hostname, disableSync = false, proxyUrl = '') {
  let calls = 0;
  let request = null;
  const window = {
    location: { hostname },
    IQA_SUPABASE_CONFIG: { publishableKey: 'test-publishable-key', publicContentProxyUrl: proxyUrl },
    __IQA_DISABLE_PUBLISHED_CONTENT_SYNC__: disableSync,
  };
  const document = {
    readyState: 'complete',
    querySelector: () => null,
  };
  runInNewContext(source, {
    window,
    document,
    fetch: (url, options) => {
      calls += 1;
      request = { url, options };
      return Promise.resolve({ ok: false });
    },
    console: { warn() {} },
  });
  return { calls, request };
}

test('local development and Playwright hosts never call the live Production content API', () => {
  for (const hostname of ['localhost', '127.0.0.1', '::1', '[::1]', 'iqa.localhost']) {
    assert.equal(execute(hostname).calls, 0, hostname + ' must not call Production');
  }
});

test('Cloudflare PR previews and unapproved hosts never call Production', () => {
  for (const hostname of [
    'pr-157.iqa-watches-storefront.pages.dev',
    'feature-branch.iqa-watches-storefront.pages.dev',
    'preview.example.com',
    'ugcnoorstudio-ui.github.io.example.com',
  ]) {
    assert.equal(execute(hostname).calls, 0, hostname + ' must not call Production');
  }
});

test('live published-content sync remains enabled on both approved production storefront hosts', () => {
  assert.equal(execute('ugcnoorstudio-ui.github.io').calls, 1);
  assert.equal(execute('iqa-watches-storefront.pages.dev').calls, 1);
});

test('explicit preview disable flag also blocks a production hostname', () => {
  assert.equal(execute('iqa-watches-storefront.pages.dev', true).calls, 0);
});

test('approved production storefront uses Cloudflare Worker proxy without Supabase API key or cookies', () => {
  const proxyUrl = 'https://iqa-watches-api-production.ugcnoorstudio.workers.dev/api/v1/public-content';
  const result = execute('iqa-watches-storefront.pages.dev', false, proxyUrl);
  assert.equal(result.calls, 1);
  assert.equal(result.request.url, proxyUrl);
  assert.equal(result.request.options.credentials, 'omit');
  assert.deepEqual(result.request.options.headers, { accept: 'application/json' });
  assert.equal(result.request.options.headers.apikey, undefined);
});

test('approved production storefront keeps direct Supabase fallback until proxy URL is enabled', () => {
  const result = execute('iqa-watches-storefront.pages.dev');
  assert.equal(result.calls, 1);
  assert.equal(result.request.url, 'https://nyhyfdququxnorqlnnqq.supabase.co/functions/v1/iqa-public-content');
  assert.equal(result.request.options.headers.apikey, 'test-publishable-key');
});
