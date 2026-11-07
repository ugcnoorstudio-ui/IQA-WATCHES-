'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const config = fs.readFileSync(path.join(__dirname, '..', 'admin', 'backend-config.js'), 'utf8');
const url = config.match(/url:\s*"([^"]+)"/)?.[1];
const key = config.match(/publishableKey:\s*"([^"]+)"/)?.[1];

test('production Supabase Auth API is reachable for the published admin login', async () => {
  assert.ok(url && key && key.startsWith('sb_publishable_'), 'production public Supabase config must be present');
  const response = await fetch(url + '/auth/v1/settings', {
    headers: { apikey: key, accept: 'application/json' }
  });
  const body = await response.text();
  assert.equal(response.status, 200,
    'production Auth API should respond 200; got ' + response.status + ', body=' + body.slice(0, 500));
  JSON.parse(body);
});
