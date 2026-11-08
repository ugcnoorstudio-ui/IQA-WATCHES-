import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const origin = 'https://iqa-watches-storefront.pages.dev';
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

test('browser-facing Edge Functions use the verified Cloudflare Pages origin', async () => {
  const sources = await Promise.all(paths.map(path =>
    readFile(new URL(path, import.meta.url), 'utf8')
  ));
  for (const source of sources) {
    assert.ok(source.includes(origin), 'Expected verified Cloudflare Pages origin in Edge Function CORS config');
    assert.ok(!source.includes('https://ugcnoorstudio-ui.github.io'), 'Stale GitHub Pages origin must not remain in browser-facing Edge Function CORS');
  }
});
