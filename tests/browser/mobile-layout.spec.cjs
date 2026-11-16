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

test('shop category chips and brand filter remain visible and functional without duplicate Explore shortcuts', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.storefront-shortcuts')).toHaveCount(0);
  await expect.poll(() => page.locator('#productGrid .product-card').count(), { timeout: 20000 }).toBeGreaterThan(0);
  const categories = page.locator('#categoryChips');
  await expect(categories).toBeVisible();
  await categories.locator('button').first().click();
  await expect(categories.locator('button.active')).toHaveCount(1);
  const brands = page.locator('#brandFilter');
  await expect(brands).toBeVisible();
  await brands.focus();
  await expect(brands).toBeFocused();
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
    await expect(page.locator('.storefront-shortcuts')).toHaveCount(0);
    await expect(page.locator('#categoryChips')).toBeVisible();
    await expect(page.locator('#brandFilter')).toBeVisible();
  }
});

test('clicking a watch image or title opens the dedicated product page', async ({ page }) => {
 await page.goto('/'); await expect.poll(()=>page.locator('#productGrid .product-card').count(),{timeout:20000}).toBeGreaterThan(0);
 const card=page.locator('#productGrid .product-card').first(),id=await card.locator('.product-image-link').getAttribute('data-view');
 await card.locator('.product-image-link').click(); await expect.poll(()=>page.evaluate(()=>location.hash)).toBe('#product/'+encodeURIComponent(id));
 await expect(page.locator('.route-pdp-appbar')).toBeVisible(); await expect(page.locator('.route-product-copy h1')).not.toBeEmpty(); await expect(page.locator('[data-pdp-page]')).toBeVisible(); await expect(page.locator('#modalWrap.open')).toHaveCount(0);
 await page.locator('[data-pdp-back]').click(); await expect(page.locator('#productGrid .product-card').first()).toBeVisible();
 await page.locator('#productGrid .product-card').first().locator('.product-details-link').click();
 await expect(page.locator('.route-pdp-appbar')).toBeVisible(); await expect(page.locator('[data-pdp-page]')).toBeVisible(); await expect(page.locator('.route-product-copy h1')).not.toBeEmpty();
});

test('homepage keeps the autoplay editorial carousel without the duplicate customer shortcut row', async ({ page }) => {
  await page.goto('/');
  const carousel = page.locator('[data-ad-carousel]');
  await expect(carousel).toBeVisible();
  await expect(carousel.locator('[data-ad-slide]')).toHaveCount(7);
  await expect(carousel.locator('[data-ad-count]')).toHaveText('01 / 07');
  await expect(page.locator('#customerQuickNav')).toHaveCount(0);
});

test('mobile watch details use a full-page layout and app-style Back control', async ({ page }) => {
 await page.setViewportSize({width:390,height:844}); await page.goto('/');
 await expect.poll(()=>page.locator('#productGrid .product-card').count(),{timeout:20000}).toBeGreaterThan(0);
 const card=page.locator('#productGrid .product-card').first(),id=await card.locator('.product-image-link').getAttribute('data-view');
 await card.locator('.product-image-link').click(); await expect.poll(()=>page.evaluate(()=>location.hash)).toBe('#product/'+encodeURIComponent(id));
 await expect(page.locator('.route-pdp-appbar')).toBeVisible(); await expect(page.locator('[data-pdp-back]')).toBeVisible();
 await expect(page.locator('#routeMainImage')).toBeVisible(); await expect(page.locator('.route-sticky-buybar')).toBeVisible(); await expect(page.locator('.route-sticky-buybar')).toHaveCSS('position','fixed'); const pdpBottomPadding=await page.locator('[data-pdp-page]').evaluate(el=>parseFloat(getComputedStyle(el).paddingBottom)); expect(pdpBottomPadding).toBeGreaterThanOrEqual(110);
 const size=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
 expect(size.scroll).toBeLessThanOrEqual(size.width);
});

test('mobile homepage hero is compact and the brand tagline is clearly visible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const tagline = page.locator('.site-header .brand-tagline');
  await expect(tagline).toHaveText('Timeless design, everyday precision');
  await expect(tagline).toBeVisible();
  const taglineStyle = await tagline.evaluate(el => ({ weight: getComputedStyle(el).fontWeight, color: getComputedStyle(el).color }));
  expect(Number(taglineStyle.weight)).toBeGreaterThanOrEqual(700);
  const hero = await page.locator('.hero').evaluate(el => ({ height: el.getBoundingClientRect().height, imageHeight: el.querySelector('.hero-visual').getBoundingClientRect().height }));
  expect(hero.imageHeight).toBeLessThanOrEqual(220);
  expect(hero.height).toBeLessThan(500);
});
