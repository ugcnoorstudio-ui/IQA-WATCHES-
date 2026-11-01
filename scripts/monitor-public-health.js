#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const vm = require('node:vm');

const base = (process.env.IQA_STOREFRONT_URL || 'https://ugcnoorstudio-ui.github.io/IQA-WATCHES-/').replace(/\/?$/, '/');
const timeoutMs = 15000;
const failures = [];

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error('HTTP ' + response.status + ' for ' + url);
  return response;
}

async function main() {
  for (const route of ['', 'admin/', 'admin/backend-config.js']) {
    try {
      const response = await request(new URL(route, base));
      console.log('PASS public route ' + (route || '/admin storefront root') + ' (' + response.status + ')');
      if (route === 'admin/backend-config.js') {
        const source = await response.text();
        const sandbox = { window: {} };
        vm.runInNewContext(source, sandbox, { timeout: 1000 });
        const config = sandbox.window.IQA_SUPABASE_CONFIG;
        if (!config || !/^https:\/\/[^/]+\.supabase\.co$/.test(config.url || '') ||
            !String(config.publishableKey || '').startsWith('sb_publishable_')) {
          throw new Error('Public Supabase configuration is missing or malformed');
        }
        const endpoint = new URL('/rest/v1/products', config.url);
        endpoint.search = new URLSearchParams({
          select: 'id',
          state: 'eq.published',
          is_sample: 'eq.false',
          verified_sellable: 'eq.true',
          limit: '1'
        }).toString();
        const catalogue = await request(endpoint, {
          headers: { apikey: config.publishableKey }
        });
        const rows = await catalogue.json();
        if (!Array.isArray(rows)) throw new Error('Supabase catalogue response was not an array');
        console.log('PASS Supabase public catalogue endpoint (' + rows.length + ' sample row(s) returned)');
      }
    } catch (error) {
      failures.push(error.message || String(error));
      console.error('FAIL ' + route + ': ' + (error.message || error));
    }
  }
  if (failures.length) {
    console.error('\nPublic health monitoring failed: ' + failures.length + ' check(s).');
    process.exitCode = 1;
  } else {
    console.log('\nAll public availability and catalogue checks passed.');
  }
}

main().catch(error => {
  console.error('Monitor crashed:', error);
  process.exitCode = 1;
});
