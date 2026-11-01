const { test, expect } = require('@playwright/test');
// Re-run this hotfix against the current main integration (PR #48).

test('homepage has no stray literal newline markup or horizontal viewport overflow', async ({ page }) => {
  const response = await page.goto('/');
  expect(response.ok()).toBeTruthy();
  const html = await response.text();
  expect(html).not.toContain(String.fromCharCode(92) + 'n<link rel="icon"');
  await expect(page.locator('#home')).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth
  }));
  expect(dimensions.document, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport);
  expect(dimensions.body, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport);
});

test('shop category chips and brand filter remain available after removing duplicate shortcut row', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#categoryChips')).toBeVisible();
  await page.locator('#categoryChips [data-category="Men"]').click();
  await expect(page.locator('#categoryChips [data-category="Men"]')).toHaveClass(/active/);
  await page.locator('#brandFilter').focus();
  await expect(page.locator('#brandFilter')).toBeFocused();
});

test('mobile navigation fits narrow 360px and 390px viewports', async ({ page }) => {
  for (const width of [360, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth
    }));
    expect(dimensions.document, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport);
    await expect(page.locator('#categoryChips')).toBeVisible();
  }
});

test('clicking a watch image, title or Details opens its product detail panel', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => page.locator('#productGrid .product-card').count(), { timeout: 20000 }).toBeGreaterThan(0);
  const card = page.locator('#productGrid .product-card').first();
  await card.locator('.product-image-link').click();
  await expect(page.locator('#modalWrap')).toHaveClass(/open/);
  await expect(page.locator('#modalContent .product-modal')).toBeVisible();
  await expect(page.locator('#modalContent h2')).not.toBeEmpty();
  await page.locator('#modalContent #modalClose').click();
  await expect(page.locator('#modalWrap')).not.toHaveClass(/open/);
  await card.locator('.product-title a').click();
  await expect(page.locator('#modalWrap')).toHaveClass(/open/);
});


test('homepage keeps the cinematic slider without the duplicate customer shortcut row', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-cinematic-story]')).toBeVisible();
  await expect(page.locator('.storefront-shortcuts')).toHaveCount(0);
});

test('mobile watch details use a large scrollable image-first panel', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect.poll(() => page.locator('#productGrid .product-card').count(), { timeout: 20000 }).toBeGreaterThan(0);
  await page.locator('#productGrid .product-card').first().locator('.product-image-link').click();
  await expect(page.locator('#modalWrap')).toHaveClass(/open/);
  const layout = await page.locator('#modalContent').evaluate(el => ({
    width: el.getBoundingClientRect().width,
    maxHeight: getComputedStyle(el).maxHeight,
    imageFirst: getComputedStyle(el.querySelector('.product-modal')).gridTemplateColumns
  }));
  expect(layout.width).toBeGreaterThan(350);
  // Computed CSS resolves 94dvh to pixels (793.36px at an 844px viewport),
  // so assert the actual viewport-relative size instead of searching for "94".
  expect(Number.parseFloat(layout.maxHeight)).toBeCloseTo(844 * 0.94, 0);
  await expect(page.locator('#modalContent .product-modal-image img')).toBeVisible();
});
