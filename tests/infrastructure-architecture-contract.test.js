const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('master architecture defines all eight phases and provider boundaries', () => {
  const doc = read('docs/IQA_WATCHES_MASTER_ARCHITECTURE.md');
  for (const phrase of [
    '1. **Infrastructure, storage and architecture**',
    '2. **Database and security**',
    '3. **Product catalogue and inventory**',
    '4. **Backend and order management**',
    '5. **Frontend and store experience**',
    '6. **SEO and performance**',
    '7. **Monitoring, backup and reliability**',
    '8. **Final testing and launch readiness**',
    'Supabase remains the single source of truth',
    'Cloudinary',
    'Cloudflare R2',
    'Better Stack',
    'Sentry',
    '50% — Monitor',
    '70% — Review',
    '80% — Alert',
    '90% — Critical'
  ]) assert.ok(doc.includes(phrase), 'Architecture contract missing: ' + phrase);
});

test('catalogue caching is short-lived and does not turn checkout into cache authority', () => {
  const headers = read('_headers');
  const doc = read('docs/IQA_WATCHES_MASTER_ARCHITECTURE.md');
  assert.match(headers, /\/data\/catalogue\.json[\s\S]*Cache-Control: public, max-age=60, s-maxage=300/);
  assert.match(doc, /current stock and price on the server at checkout/i);
  assert.match(doc, /Do not cache customer profile\/address, cart, admin, order, checkout, authentication/i);
  const worker = read('cloudflare/src/index.js');
  assert.match(worker, /cache-control: "no-store"/);
});

test('product image uploads use Cloudinary and avoid Supabase Storage writes', () => {
  const upload = read('supabase/functions/iqa-product-image-upload/index.ts');
  assert.match(upload, /api\.cloudinary\.com\/v1_1\//);
  assert.match(upload, /iqa_register_cloudinary_product_image/);
  assert.doesNotMatch(upload, /\.storage\.from\s*\(|\/storage\/v1\/object\//);
  const responsive = read('index.html');
  assert.match(responsive, /\/f_auto\/q_auto\//);
  assert.match(read('tests/cloudinary-responsive-optimization.test.js'), /responsive srcset variants/);
});

test('R2 is explicitly not considered provisioned until a bucket binding exists', () => {
  const wrangler = read('cloudflare/wrangler.toml');
  const doc = read('docs/IQA_WATCHES_MASTER_ARCHITECTURE.md');
  assert.doesNotMatch(wrangler, /^\s*\[\[r2_buckets\]\]/m);
  assert.match(doc, /no R2 bucket binding/i);
  assert.match(doc, /R2 provisioning and a tested upload\/download policy remain a Phase 1 external prerequisite/i);
});

test('legacy Supabase Storage is protected and usage thresholds are not treated as automatic guarantees', () => {
  const doc = read('docs/IQA_WATCHES_MASTER_ARCHITECTURE.md');
  assert.match(doc, /6 production Storage objects/);
  assert.match(doc, /Do not delete buckets, objects, policies or migration history/);
  assert.match(doc, /not proof that every provider exposes matching automatic alerts/);
  assert.match(doc, /Never automatically disable core services or delete customer data/);
});
