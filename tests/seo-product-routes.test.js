'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('product routes are crawlable path URLs and Cloudflare Pages rewrites them to the storefront', () => {
  const html = read('index.html');
  const routes = read('routes.js');
  const redirects = read('_redirects');
  assert.match(html, /<script src="\.\/seo\.js\?v=/);
  assert.match(routes, /location\.pathname\.match\(\/\^\\\/products/);
  assert.match(routes, /window\.iqaProductPath/);
  assert.equal((html.match(/view\.getAttribute\('href'\)\?\.startsWith\('\/products\/'\)/g) || []).length, 2, 'product anchors must bypass modal click interception');
  assert.match(redirects, /^\/products\/\* \/index\.html 200$/m);
});

test('product metadata and JSON-LD are built from real catalogue fields without fabricated ratings', () => {
  const seo = read('seo.js');
  assert.match(seo, /@type': 'Product'/);
  assert.match(seo, /@type': 'Offer'/);
  assert.match(seo, /priceCurrency: 'INR'/);
  assert.match(seo, /product\.stock/);
  assert.doesNotMatch(seo, /aggregateRating|reviewCount|ratingValue/);
  assert.match(seo, /rel="canonical"|rel = 'canonical'/);
});

test('sitemap contains the current approved catalogue products and robots blocks the private admin route', () => {
  const catalogue = JSON.parse(read('data/catalogue.json'));
  const sitemap = read('sitemap.xml');
  const robots = read('robots.txt');
  for (const product of catalogue.products) {
    assert.ok(sitemap.includes(product.id), 'Missing sitemap product ' + product.id);
    assert.ok(sitemap.includes(product.name.toLowerCase().split(' ')[0]) || sitemap.includes(product.id));
  }
  assert.match(robots, /Disallow: \/admin\//);
  assert.match(robots, /Sitemap: https:\/\/iqa-watches-storefront\.pages\.dev\/sitemap\.xml/);
});

test('GA4 and Clarity stay disabled until real public project IDs are supplied', () => {
  const config = read('analytics-config.js');
  const analytics = read('analytics.js');
  assert.match(config, /ga4MeasurementId: ''/);
  assert.match(config, /clarityProjectId: ''/);
  assert.match(analytics, /\^G-\[A-Z0-9\]\+\$/i);
  assert.match(analytics, /clarityProjectId/);
});

test('Cloudinary image optimization remains covered by responsive srcset regression tests', () => {
  const html = read('index.html');
  assert.match(html, /responsiveCloudinarySrcset/);
  assert.match(html, /enhanceResponsiveCloudinaryImages\(\)/);
});
