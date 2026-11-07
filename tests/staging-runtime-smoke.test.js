const test = require('node:test');
const assert = require('node:assert/strict');

const key = 'sb_publishable_EmGoVBFk35Mc7om3eULcgw_tmEXAAA5'; // staging publishable key; safe for browser use
const base = 'https://qcxgsomqxfoueootxzpv.supabase.co';
const origin = 'https://iqa-watches-storefront.pages.dev';

test('staging Supabase Auth settings endpoint is reachable', async () => {
  const response = await fetch(base + '/auth/v1/settings', {
    headers: { apikey: key, accept: 'application/json' }
  });
  const body = await response.text();
  assert.equal(response.status, 200, 'staging Auth returned HTTP ' + response.status + ': ' + body.slice(0, 300));
  assert.doesNotThrow(() => JSON.parse(body));
});

test('staging public-content Edge Function returns its public payload', async () => {
  const response = await fetch(base + '/functions/v1/iqa-public-content', {
    headers: { apikey: key, accept: 'application/json', origin }
  });
  const body = await response.text();
  assert.equal(response.status, 200, 'staging public-content returned HTTP ' + response.status + ': ' + body.slice(0, 300));
  const payload = JSON.parse(body);
  assert.equal(payload.ok, true);
  assert.ok(Array.isArray(payload.items));
});

test('staging public-content CORS preflight allows only the production Cloudflare Pages origin', async () => {
  const response = await fetch(base + '/functions/v1/iqa-public-content', {
    method: 'OPTIONS',
    headers: {
      apikey: key,
      origin,
      'access-control-request-method': 'GET',
      'access-control-request-headers': 'apikey'
    }
  });
  assert.equal(response.status, 200, 'staging CORS preflight returned HTTP ' + response.status);
  assert.equal(response.headers.get('access-control-allow-origin'), origin);
});
