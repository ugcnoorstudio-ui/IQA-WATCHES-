import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const files = [
  '../supabase/functions/iqa-customer-checkout/index.ts',
  '../supabase/functions/iqa-public-content/index.ts',
  '../supabase/functions/iqa-admin-health/index.ts',
  '../supabase/functions/iqa-product-image-upload/index.ts',
  '../supabase/functions/iqa-customer-cancel-order/index.ts',
];
const sources = await Promise.all(files.map(path => readFile(new URL(path, import.meta.url), 'utf8')));

test('browser-facing Edge Functions allow only the verified GitHub Pages and Cloudflare Pages origins', () => {
  for (const source of sources) {
    assert.match(source, /https:\/\/ugcnoorstudio-ui\.github\.io/);
    assert.match(source, /https:\/\/iqa-watches-storefront\.pages\.dev/);
    assert.match(source, /function allowedOrigin\(/);
    assert.match(source, /if\s*\(allowedOrigin\(origin\)\)\s*headers\["Access-Control-Allow-Origin"\]\s*=\s*origin/);
  }
});

test('Edge Function CORS never reflects an arbitrary untrusted Origin', () => {
  for (const source of sources) {
    assert.match(source, /ALLOWED_ORIGINS\.has\(origin\)/);
    assert.match(source, /pr-\[1-9\]\[0-9\]\*\\\.iqa-watches-storefront\\\.pages\\\.dev/);
    assert.doesNotMatch(source, /"Access-Control-Allow-Origin"\s*:\s*req\.headers\.get\(["']origin["']\)/);
  }
});

test('preflight requests reject origins outside the allowlist before granting CORS', () => {
  for (const source of sources) {
    assert.match(source, /req\.method\s*===\s*["']OPTIONS["']/);
    assert.match(source, /if\s*\(!allowedOrigin\(origin\)\)/);
  }
});

test('checkout and administrative functions retain explicit POST method restrictions', () => {
  for (const index of [0, 2, 3, 4]) {
    assert.match(sources[index], /req\.method\s*!==\s*["']POST["']/);
  }
  assert.match(sources[1], /req\.method\s*!==\s*["']GET["']/);
});
