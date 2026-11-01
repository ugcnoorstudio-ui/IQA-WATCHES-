const { test, expect } = require('@playwright/test');

async function openStore(page) {
  await page.goto('/');
  // Wait for the asynchronous approved catalogue hydration before interacting.
  await expect.poll(
    () => page.evaluate(() => typeof catalogueState === 'undefined' ? 'missing' : catalogueState),
    { timeout: 20000 }
  ).toBe('ready');
  await expect(page.locator('#productGrid')).toBeVisible();
  await expect.poll(async () => page.locator('#productGrid .product-card').count(), { timeout: 20000 }).toBeGreaterThan(0);
}

async function firstProductId(page) {
  const card = page.locator('#productGrid .product-card').first();
  const wish = card.locator('[data-wish]');
  const add = card.locator('[data-add]');
  const id = await (await wish.count() ? wish : add).getAttribute('data-wish').catch(() => null);
  if (id) return id;
  return await add.getAttribute('data-add');
}

test('homepage loads without horizontal overflow or uncaught page errors', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle(/IQA WATCHES/i);
  await expect(page.locator('#home')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow, 'homepage should not overflow horizontally').toBe(false);
  expect(pageErrors, 'uncaught browser errors').toEqual([]);
});

test('customer routes render their actual destinations', async ({ page }) => {
  await page.goto('/');
  const routes = [
    ['shop', 'routeCatalogue'], ['men', 'routeCatalogue'], ['women', 'routeCatalogue'],
    ['unisex', 'routeCatalogue'], ['new-arrivals', 'routeCatalogue'], ['bestsellers', 'routeCatalogue'],
    ['care', 'Store policies'], ['journal', 'coming soon'], ['faq', 'Frequently asked questions'],
    ['contact', 'Contact'], ['search', 'Search'], ['bag', 'shopping bag'], ['wishlist', 'wishlist']
  ];
  for (const [route, expected] of routes) {
    await page.evaluate(value => { location.hash = value; }, route);
    if (route === 'shop' || ['men','women','unisex','new-arrivals','bestsellers'].includes(route)) {
      const catalogue = page.locator('#routeCatalogue');
      await expect(catalogue).toBeAttached();
      await expect(catalogue.locator('.route-card, .route-empty')).not.toHaveCount(0);
    } else {
      await expect(page.locator('#routeView')).toBeVisible();
      await expect(page.locator('#routeView')).toContainText(new RegExp(expected, 'i'));
    }
  }
  await page.evaluate(() => { location.hash = 'finder'; });
  await expect(page.locator('#finderCard')).toBeVisible();
  await page.evaluate(() => { location.hash = 'comparison'; });
  await expect(page.locator('#compareCard')).toBeVisible();
});

test('mobile navigation opens and closes and viewport has no horizontal overflow', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile viewport only');
  await page.goto('/');
  const toggle = page.locator('#menuToggle');
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page.locator('#mobileMenu')).toHaveClass(/open/);
  await toggle.click();
  await expect(page.locator('#mobileMenu')).not.toHaveClass(/open/);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow, 'mobile page should not overflow horizontally').toBe(false);
});

test('cart add, increment, decrement and remove work without enabling checkout', async ({ page }) => {
  await openStore(page);
  const card = page.locator('#productGrid .product-card').first();
  const productId = await card.locator('[data-add]').getAttribute('data-add');
  await card.locator('[data-add]').click();
  await page.evaluate(() => { location.hash = 'bag'; });
  const bag = page.locator('#routeView');
  await expect(bag).toContainText(/shopping bag/i);
  await expect(bag.locator('[data-qty][data-delta="1"]')).toBeVisible();
  await bag.locator('[data-qty][data-delta="1"]').click();
  await expect(bag.locator('.qty')).toContainText('2');
  await bag.locator('[data-qty][data-delta="-1"]').click();
  await expect(bag.locator('.qty')).toContainText('1');
  await bag.locator('[data-remove="' + productId + '"]').click();
  await expect(bag).toContainText(/bag is empty/i);
  await expect(bag).toContainText(/checkout.*disabled|not enabled/i);
});

test('wishlist persists in browser storage after reload and can be removed', async ({ page }) => {
  await openStore(page);
  const card = page.locator('#productGrid .product-card').first();
  const productId = await card.locator('[data-wish]').getAttribute('data-wish');
  await card.locator('[data-wish]').click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('iqa-preview-wishlist') || '[]'))).toContain(productId);
  await page.reload();
  await expect.poll(
    () => page.evaluate(() => typeof catalogueState === 'undefined' ? 'missing' : catalogueState),
    { timeout: 20000 }
  ).toBe('ready');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('iqa-preview-wishlist') || '[]'))).toContain(productId);
  await page.evaluate(() => { location.hash = 'wishlist'; });
  await expect(page.locator('#routeView')).toContainText(/wishlist/i);
  await expect(page.locator('#routeView')).toContainText((await card.locator('.product-title').textContent()).trim());
  await page.locator('#routeView [data-wish="' + productId + '"]').click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('iqa-preview-wishlist') || '[]'))).not.toContain(productId);
});

test('comparison accepts two distinct catalogue products and clears', async ({ page }) => {
  await openStore(page);
  await page.evaluate(() => { location.hash = 'comparison'; });
  await expect(page.locator('#compareCard')).toBeVisible();
  const select = page.locator('#compareProduct');
  await expect.poll(() => select.locator('option').count()).toBeGreaterThan(2);
  const values = await select.locator('option').evaluateAll(options => options.map(o => o.value).filter(Boolean));
  await select.selectOption(values[0]);
  await page.locator('#addCompare').click();
  await select.selectOption(values[1]);
  await page.locator('#addCompare').click();
  await expect(page.locator('#compareResults')).toContainText(/Specification/i);
  await page.locator('#clearCompare').click();
  await expect(page.locator('#compareResults')).toContainText(/select at least two/i);
});

test('watch finder returns matches and reset restores defaults', async ({ page }) => {
  await openStore(page);
  await page.evaluate(() => { location.hash = 'finder'; });
  await expect(page.locator('#finderCard')).toBeVisible();
  await page.locator('#runFinder').click();
  await expect(page.locator('#finderResults')).not.toContainText(/choose your preferences/i);
  await page.locator('#resetFinder').click();
  await expect(page.locator('#finderResults')).toContainText(/choose your preferences/i);
});

test('product detail route displays product content and gallery controls', async ({ page }) => {
  await openStore(page);
  const productLink = page.locator('#productGrid a[href^="#product/"]').first();
  await productLink.click();
  await expect(page.locator('#routeView')).toBeVisible();
  await expect(page.locator('#routeView')).toContainText(/product/i);
  await expect(page.locator('#routeMainImage')).toBeVisible();
  const thumbnails = page.locator('#routeView [data-gallery-src]');
  if (await thumbnails.count()) {
    await thumbnails.first().click();
    await expect(page.locator('#routeMainImage')).toHaveAttribute('src', await thumbnails.first().getAttribute('data-gallery-src'));
  }
});
