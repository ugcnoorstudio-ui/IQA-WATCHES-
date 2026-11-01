const { test, expect } = require('@playwright/test');

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

test('mobile layout fits narrow 360px and 390px viewports without the duplicate Explore shortcut row', async ({ page }) => {
  for (const width of [360, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth
    }));
    expect(dimensions.document, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport);
    expect(dimensions.body, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport);
    await expect(page.locator('.storefront-shortcuts')).toHaveCount(0);
    await expect(page.locator('#categoryChips')).toBeVisible();
  }
});

test('watch image, title and quick-view button open the large image-first detail panel', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => page.locator('#productGrid .product-card').count(), { timeout: 20000 }).toBeGreaterThan(0);
  const card = page.locator('#productGrid .product-card').first();
  await card.locator('.product-image-link').click();
  await expect(page.locator('#modalWrap')).toHaveClass(/open/);
  await expect(page.locator('#modalContent .product-modal-image img')).toBeVisible();
  await expect(page.locator('#modalContent h2')).not.toBeEmpty();
  const panel = await page.locator('#modalContent').evaluate(el => ({
    width: el.getBoundingClientRect().width,
    maxHeight: getComputedStyle(el).maxHeight,
    imageHeight: el.querySelector('.product-modal-image').getBoundingClientRect().height
  }));
  expect(panel.width).toBeGreaterThan(350);
  expect(panel.maxHeight).toContain('94');
  expect(panel.imageHeight).toBeGreaterThan(230);
  await page.locator('#modalContent #modalClose').click();
  await card.locator('.product-title a').click();
  await expect(page.locator('#modalWrap')).toHaveClass(/open/);
  await page.locator('#modalContent #modalClose').click();
  await card.locator('[data-view]').last().click();
  await expect(page.locator('#modalWrap')).toHaveClass(/open/);
});

test('the existing cinematic slider remains visible with highlighted bronze-gold styling', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-cinematic-story]')).toBeVisible();
  await expect(page.locator('.cinematic-story-track')).toBeVisible();
});
