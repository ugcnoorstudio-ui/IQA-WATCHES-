const { test, expect } = require('@playwright/test');

const productPath = '/products/fastrack-thor-multifunctional-analogue/d1875a84-aedb-4311-a6a3-02dcd0c8a745';

test('direct product URL renders an indexable product page with canonical and Product JSON-LD', async ({ page }) => {
  const response = await page.goto(productPath);
  expect(response && response.status()).toBe(200);
  await expect(page.locator('#routeRoot .route-product-page')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#routeRoot .route-product-copy h2')).toContainText('Fastrack Thor');
  await expect(page).toHaveTitle(/Fastrack Thor.*IQA WATCHES/);
  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
  expect(canonical).toContain(productPath);
  const jsonLdText = await page.locator('#iqa-product-jsonld').textContent();
  const jsonLd = JSON.parse(jsonLdText);
  expect(jsonLd['@type']).toBe('Product');
  expect(jsonLd.name).toContain('Fastrack Thor');
  expect(jsonLd.offers.priceCurrency).toBe('INR');
  expect(jsonLd.aggregateRating).toBeUndefined();
});

test('sitemap is served and contains the same real product URL', async ({ request }) => {
  const response = await request.get('/sitemap.xml');
  expect(response.status()).toBe(200);
  const xml = await response.text();
  expect(xml).toContain(productPath);
});
