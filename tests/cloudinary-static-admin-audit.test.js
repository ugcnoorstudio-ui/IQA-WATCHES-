const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('static Cloudinary migration is owner-gated and limited to six approved homepage image sources', () => {
  const fn = read('supabase/functions/iqa-migrate-static-cloudinary/index.ts');
  assert.match(fn, /const ORIGIN = "https:\/\/ugcnoorstudio-ui\.github\.io"/);
  assert.match(fn, /staff_profiles/);
  assert.match(fn, /profiles\[0\]\.role !== "owner"/);
  assert.match(fn, /profiles\[0\]\.active !== true/);
  assert.match(fn, /https:\/\/api\.cloudinary\.com/);
  assert.match(fn, /CLOUDINARY_API_SECRET/);
  assert.doesNotMatch(fn, /storage\/v1\/object|storage\.from|deleteObject|image\/destroy/);
  const keys = [...fn.matchAll(/key: "([a-z-]+)", url:/g)].map(match => match[1]);
  assert.deepEqual(keys, [
    'home-hero',
    'collection-classic',
    'collection-sport',
    'collection-editorial',
    'collection-modern',
    'editorial-detail'
  ]);
});

test('admin exposes a confirmed owner-only static image migration without changing storefront URLs prematurely', () => {
  const ui = read('admin/cloudinary-migration.js');
  assert.match(ui, /data-cloudinary-static-migration/);
  assert.match(ui, /Migrate 6 static images to Cloudinary/);
  assert.match(ui, /api\.requireRole\(\['owner'\]\)/);
  assert.match(ui, /functions\.invoke\('iqa-migrate-static-cloudinary'/);
  assert.match(ui, /window\.confirm\(/);
  assert.match(ui, /Live homepage has not been changed yet/);
});

test('admin product gallery uploader validates and sends up to eight images through the signed Cloudinary function', () => {
  const admin = read('admin/admin.js');
  const backend = read('admin/backend.js');
  assert.match(admin, /Upload \/ replace product image/);
  assert.match(admin, /if\(files\.length>8\)/);
  assert.match(admin, /await api\.uploadProductImage\(values\.product_id,files\[index\]/);
  assert.match(backend, /file\.size > 5 \* 1024 \* 1024/);
  assert.match(backend, /functions\.invoke\("iqa-product-image-upload"/);
  assert.doesNotMatch(backend, /storage\.from\(["']product-images/);
});

test('homepage static imagery is served from the six migrated Cloudinary assets', () => {
  const html = read('index.html');
  const fn = read('supabase/functions/iqa-migrate-static-cloudinary/index.ts');
  const assets = [
    ['photo-1524592094714-0f0654e20314', 'home-hero'],
    ['photo-1523275335684-37898b6baf30', 'collection-classic'],
    ['photo-1547996160-81dfa63595aa', 'collection-sport'],
    ['photo-1523170335258-f5ed11844a49', 'collection-editorial'],
    ['photo-1508685096489-7aacd43bd3b1', 'collection-modern'],
    ['photo-1434056886845-dac89ffe9b56', 'editorial-detail']
  ];
  for (const [sourceId, publicId] of assets) {
    assert.ok(!html.includes(sourceId), 'homepage must no longer request legacy Unsplash image ' + sourceId);
    assert.ok(html.includes('https://res.cloudinary.com/rrmdzam7/image/upload/f_auto,q_auto/iqa-watches/static/' + publicId + '.jpg'),
      'homepage should use migrated Cloudinary asset ' + publicId);
    assert.ok(fn.includes(publicId), 'migration function should provision the same Cloudinary asset ' + publicId);
  }
  assert.match(html, /\.\/assets\/iqa-watches-header-logo\.svg/);
  assert.doesNotMatch(html, /https:\/\/images\.unsplash\.com\/photo-/);
});

test('admin shell cache-busts the new static migration controls', () => {
  const html = read('admin/index.html');
  assert.match(html, /cloudinary-migration\.js\?v=20261106-unlinked-review/);
});

test('unlinked legacy image review copy is owner-gated, fixed-source, and never deletes or links the original', () => {
  const fn = read('supabase/functions/iqa-migrate-unlinked-review/index.ts');
  const ui = read('admin/cloudinary-migration.js');
  assert.match(fn, /profiles\[0\]\.role !== "owner"/);
  assert.match(fn, /profiles\[0\]\.active !== true/);
  assert.match(fn, /MP000000025248756_437Wx649H_202502030016151\.jpeg/);
  assert.match(fn, /iqa-watches\/unassigned-review/);
  assert.match(fn, /uploaded\.public_id !== FOLDER \+ "\/" \+ PUBLIC_ID/);
  assert.match(fn, /Original Supabase object remains untouched/);
  assert.doesNotMatch(fn, /storage\/v1\/object\/sign|\/storage\/v1\/object\/[^"]+\/[^"]+\/delete|deleteObject|image\/destroy/);
  assert.match(ui, /data-cloudinary-unlinked-review/);
  assert.match(ui, /functions\.invoke\('iqa-migrate-unlinked-review'/);
  assert.match(ui, /No product will be changed and no Supabase file will be deleted/);
});
