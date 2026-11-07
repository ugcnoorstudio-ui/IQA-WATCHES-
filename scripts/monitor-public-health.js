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
        console.log('PASS Supabase public configuration is present; no public Data API request is made by this monitor.');
      }
    } catch (error) {
      failures.push(error.message || String(error));
      console.error('FAIL ' + route + ': ' + (error.message || error));
    }
  }

  try {
    const response = await request(new URL('data/catalogue.json', base));
    const snapshot = await response.json();
    if (!snapshot || !Array.isArray(snapshot.products) || snapshot.products.length === 0) {
      throw new Error('Static catalogue snapshot is missing or empty');
    }
    const invalid = snapshot.products.filter(product =>
      !product.id || !product.name || !(Number(product.price) > 0) || !(Number(product.stock) > 0) ||
      typeof product.image !== 'string' || !product.image.startsWith('https://res.cloudinary.com/')
    );
    if (invalid.length) throw new Error(invalid.length + ' catalogue item(s) have invalid sellable fields or non-Cloudinary images');
    console.log('PASS static Cloudinary catalogue (' + snapshot.products.length + ' approved in-stock product(s))');
  } catch (error) {
    failures.push(error.message || String(error));
    console.error('FAIL static catalogue: ' + (error.message || error));
  }

  if (failures.length) {
    console.error('\\nPublic health monitoring failed: ' + failures.length + ' check(s).');
    process.exitCode = 1;
  } else {
    console.log('\\nAll public availability and static catalogue checks passed.');
  }
}

main().catch(error => {
  console.error('Monitor crashed:', error);
  process.exitCode = 1;
});
