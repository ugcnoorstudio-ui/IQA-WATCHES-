const { test, expect } = require('@playwright/test');

const customerRoutes = [
  ['shop', 'collection'], ['men', 'collection'], ['women', 'collection'],
  ['unisex', 'collection'], ['new-arrivals', 'collection'], ['bestsellers', 'collection'],
  ['care', 'Store policies'], ['journal', 'coming soon'], ['faq', 'Frequently asked questions'],
  ['contact', 'Contact us'], ['finder', 'finderCard'], ['comparison', 'compareCard'],
  ['bag', 'shopping bag'], ['wishlist', 'Wishlist'], ['search', 'Search']
];

test('homepage loads without horizontal overflow', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle(/IQA WATCHES/i);
  await expect(page.locator('body')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow, 'homepage should not overflow horizontally').toBe(false);
  expect(pageErrors, 'uncaught browser errors').toEqual([]);
});

test('customer routes render or reach their intended homepage tool', async ({ page }) => {
  await page.goto('/');
  for (const [route, expected] of customerRoutes) {
    await page.evaluate(value => { location.hash = value; }, route);
    await page.waitForTimeout(100);
    if (route === 'finder' || route === 'comparison') {
      await expect(page.locator('#' + expected)).toBeAttached();
    } else if (route === 'shop' || ['men','women','unisex','new-arrivals','bestsellers'].includes(route)) {
      await expect(page.locator('#routeView')).toContainText(/collection|watches|match/i);
    } else {
      await expect(page.locator('#routeView')).toBeVisible();
    }
  }
});

test('mobile navigation opens and closes', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile viewport only');
  await page.goto('/');
  const toggle = page.locator('#menuToggle');
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page.locator('#mobileMenu')).toHaveClass(/open/);
  const shopLink = page.locator('#mobileMenu a[href="#shop"]').first();
  if (await shopLink.count()) {
    await shopLink.click();
    await expect(page.locator('#mobileMenu')).not.toHaveClass(/open/);
  } else {
    await toggle.click();
    await expect(page.locator('#mobileMenu')).not.toHaveClass(/open/);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow, 'mobile page should not overflow horizontally').toBe(false);
});

test('product detail route handles an available product link', async ({ page }) => {
  await page.goto('/');
  const productLink = page.locator('a[href^="#product/"]').first();
  await expect(productLink).toBeAttached({ timeout: 15000 });
  await productLink.click();
  await expect(page.locator('#routeView')).toContainText(/product|catalogue|unavailable|not found/i);
  const mainImage = page.locator('#routeMainImage');
  if (await mainImage.count()) await expect(mainImage).toBeVisible();
});
