#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const vm = require('node:vm');

const base = (process.env.IQA_STOREFRONT_URL || 'https://iqa-watches-storefront.pages.dev/').replace(/\/?$/, '/');
const timeoutMs = 15000;
const failures = [];
let publicSupabaseConfig = null;

const retryDelaysMs = [2000, 4000, 8000, 12000];

async function request(url, options = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
      if (response.ok) return response;
      lastError = new Error('HTTP ' + response.status + ' for ' + url);
      const transient = response.status === 404 || response.status === 408 ||
        response.status === 425 || response.status === 429 || response.status >= 500;
      if (!transient || attempt === retryDelaysMs.length) throw lastError;
    } catch (error) {
      lastError = error;
      if (attempt === retryDelaysMs.length) throw lastError;
    }
    const delay = retryDelaysMs[attempt];
    console.warn('Retry ' + (attempt + 1) + '/' + retryDelaysMs.length +
      ' after transient public-host response: ' + (lastError.message || lastError));
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw lastError || new Error('Public-host request failed: ' + url);
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
        publicSupabaseConfig = config;
        console.log('PASS Supabase public configuration is present; browser requests use the read-only catalogue Edge Function.');
      }
    } catch (error) {
      failures.push(error.message || String(error));
      console.error('FAIL ' + route + ': ' + (error.message || error));
    }
  }

  if (!publicSupabaseConfig) {
    failures.push('Public Supabase configuration was not available for catalogue API verification');
  } else {
    try {
      const storefrontOrigin = new URL(base).origin;
      const endpoint = new URL('/functions/v1/iqa-public-catalogue', publicSupabaseConfig.url);
      const response = await request(endpoint, {
        headers: { Accept: 'application/json', Origin: storefrontOrigin }
      });
      if (response.headers.get('access-control-allow-origin') !== storefrontOrigin) {
        throw new Error('Public catalogue CORS does not allow the production storefront origin');
      }
      const payload = await response.json();
      if (!payload || payload.ok !== true || !Array.isArray(payload.products) || payload.products.length === 0) {
        throw new Error('Public catalogue API returned no approved products or an invalid response');
      }
      const invalid = payload.products.filter(product =>
        !product.id || !product.name || !(Number(product.price) > 0) || !(Number(product.stock) > 0) ||
        typeof product.image !== 'string' || !product.image.startsWith('https://res.cloudinary.com/')
      );
      if (invalid.length) throw new Error(invalid.length + ' public API product(s) have invalid price, stock or Cloudinary image fields');
      console.log('PASS live public catalogue Edge Function (' + payload.products.length + ' approved in-stock product(s), CORS verified)');
    } catch (error) {
      failures.push(error.message || String(error));
      console.error('FAIL live public catalogue API: ' + (error.message || error));
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
    console.log('\\nAll public availability, live catalogue, and static fallback checks passed.');
  }
}

main().catch(error => {
  console.error('Monitor crashed:', error);
  process.exitCode = 1;
});
