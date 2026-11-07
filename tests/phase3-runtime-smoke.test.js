'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const config = fs.readFileSync(path.join(root, 'admin', 'backend-config.js'), 'utf8');
const key = config.match(/publishableKey:\s*"([^"]+)"/)?.[1];
const endpoint = 'https://qcxgsomqxfoueootxzpv.supabase.co/functions/v1/iqa-public-content';
const productionOrigin = 'https://iqa-watches-storefront.pages.dev';

test('isolated staging public-content Edge Function is reachable with the publishable key', async () => {
  assert.ok(key && key.startsWith('sb_publishable_'), 'staging smoke test requires the browser-safe publishable key');
  const response = await fetch(endpoint, { headers: { apikey: key, accept: 'application/json' } });
  const body = await response.text();
  assert.equal(
    response.status,
    200,
    'staging public-content should respond 200; got ' + response.status +
      ', sb-error-code=' + (response.headers.get('sb-error-code') || 'none') +
      ', body=' + body.slice(0, 600)
  );
  const payload = JSON.parse(body);
  assert.equal(payload.ok, true);
  assert.ok(Array.isArray(payload.items));
});

test('staging public-content preflight returns the exact production Pages origin', async () => {
  assert.ok(key && key.startsWith('sb_publishable_'));
  const response = await fetch(endpoint, {
    method: 'OPTIONS',
    headers: {
      apikey: key,
      origin: productionOrigin,
      'access-control-request-method': 'GET',
      'access-control-request-headers': 'apikey'
    }
  });
  const body = await response.text();
  assert.equal(
    response.status,
    200,
    'staging preflight should respond 200; got ' + response.status +
      ', sb-error-code=' + (response.headers.get('sb-error-code') || 'none') +
      ', body=' + body.slice(0, 600)
  );
  assert.equal(response.headers.get('access-control-allow-origin'), productionOrigin);
});
