import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const paths = [
  '../supabase/functions/iqa-customer-checkout/index.ts',
  '../supabase/functions/iqa-customer-cancel-order/index.ts',
  '../supabase/functions/iqa-public-content/index.ts',
  '../supabase/functions/iqa-admin-mutate/index.ts',
  '../supabase/functions/iqa-cloudinary-media-library/index.ts',
  '../supabase/functions/iqa-product-image-upload/index.ts',
  '../supabase/functions/iqa-admin-health/index.ts',
  '../supabase/functions/iqa-public-catalogue/index.ts',
];
const sources = await Promise.all(paths.map(path => readFile(new URL(path, import.meta.url), 'utf8')));

test('browser-facing Edge Functions allow both verified storefront hosts', () => {
  for (const source of sources) {
    assert.match(source, /https:\/\/ugcnoorstudio-ui\.github\.io/);
    assert.match(source, /https:\/\/iqa-watches-storefront\.pages\.dev/);
    assert.match(source, /ALLOWED_ORIGINS/);
    assert.match(source, /allowedOrigin\(/);
  }
});

test('Edge Functions never use wildcard CORS or reflect arbitrary origins', () => {
  for (const source of sources) {
    assert.doesNotMatch(source, /Access-Control-Allow-Origin["']?\s*:\s*["']\*["']/);
    assert.match(source, /ALLOWED_ORIGINS\.has\(origin\)/);
  }
});

test('PR preview CORS is restricted to the exact Cloudflare preview hostname pattern', () => {
  for (const source of sources) {
    assert.match(source, /pr-\[1-9\]\[0-9\]\*\\\.iqa-watches-storefront\\\.pages\\\.dev/);
  }
});

test('preflight requests explicitly handle OPTIONS and validate the requesting origin', () => {
  for (const source of sources) {
    assert.match(source, /(?:req|request)\\.method\\s*===\s*["']OPTIONS["']/);
    assert.match(source, /allowedOrigin\(origin\)/);
  }
});
