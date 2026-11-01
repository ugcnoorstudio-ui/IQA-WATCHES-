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

async function navigateToHash(page, route) {
  const hash = '#' + route;
  const homeToolRoute = ['finder', 'comparison'].includes(route.split('/')[0]);
  // Wait for the browser's hashchange event, not merely for the URL assignment.
  // The previous helper could pass immediately when the root already had the
  // expected class, before the route renderer had processed the new hash.
  await page.evaluate(value => {
    if (location.hash === value) {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      return;
    }
    window.addEventListener('hashchange', () => {}, { once: true });
    const changed = new Promise(resolve => window.addEventListener('hashchange', resolve, { once: true }));
    location.hash = value;
    return changed;
  }, hash);
  await page.waitForFunction(({ expectedHash, expectHidden }) => {
    if (location.hash !== expectedHash) return false;
    const root = document.getElementById('routeView');
    if (!root) return false;
    return root.hidden === false && root.classList.contains('hidden') === expectHidden;
  }, { expectedHash: hash, expectHidden: homeToolRoute });
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
    await navigateToHash(page, route);
    if (route === 'shop' || ['men','women','unisex','new-arrivals','bestsellers'].includes(route)) {
      const catalogue = page.locator('#routeCatalogue');
      await expect(catalogue).toBeAttached();
      await expect(catalogue.locator('.route-card, .route-empty')).not.toHaveCount(0);
    } else {
      await expect(page.locator('#routeView')).toBeVisible();
      await expect(page.locator('#routeView')).toContainText(new RegExp(expected, 'i'));
    }
  }
  await navigateToHash(page, 'finder');
  await expect(page.locator('#finderCard')).toBeVisible();
  await navigateToHash(page, 'comparison');
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

test('every mobile menu link opens its real destination and closes the menu', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile viewport only');
  await openStore(page);
  const destinations = [
    ['shop', '#routeCatalogue'],
    ['men', '#routeCatalogue'],
    ['women', '#routeCatalogue'],
    ['unisex', '#routeCatalogue'],
    ['search', /Search the collection/i],
    ['finder', '#finderCard'],
    ['comparison', '#compareCard'],
    ['wishlist', /wishlist/i],
    ['bag', /shopping bag/i],
    ['journal', /Watch Journal is coming soon/i],
    ['story', /Our point of view/i],
    ['care', /Store policies/i],
    ['contact', /Contact us/i],
    ['account', /Sign in|Account unavailable/i],
    ['orders', /My orders/i],
    ['faq', /Frequently asked questions/i],
    ['policies', /Store policies/i]
  ];
  const menuLinks = await page.locator('#mobileMenu a').evaluateAll(links =>
    links.map(link => link.getAttribute('href').replace(/^#/, ''))
  );
  expect(menuLinks).toEqual(destinations.map(([route]) => route));

  for (const [route, expected] of destinations) {
    const toggle = page.locator('#menuToggle');
    const menu = page.locator('#mobileMenu');
    await toggle.click();
    await expect(menu).toHaveClass(/open/);
    await menu.locator('a[href="#' + route + '"]').click();
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#' + route);
    await expect(menu).not.toHaveClass(/open/);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    if (expected === '#routeCatalogue') {
      await expect(page.locator('#routeCatalogue')).toBeAttached();
    } else if (expected === '#finderCard' || expected === '#compareCard') {
      await expect(page.locator(expected)).toBeVisible();
    } else {
      await expect(page.locator('#routeView')).toContainText(expected);
    }
  }
});

test('cart add, increment, decrement and remove work without enabling checkout', async ({ page }) => {
  await openStore(page);
  const card = page.locator('#productGrid .product-card').first();
  const productId = await card.locator('[data-add]').getAttribute('data-add');
  await card.locator('[data-add]').click();
  await navigateToHash(page, 'bag');
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
  await navigateToHash(page, 'wishlist');
  await expect(page.locator('#routeView')).toContainText(/wishlist/i);
  const productName = (await card.locator('.product-title').textContent()).trim();
  await expect(page.locator('#routeView')).toContainText(productName);
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


test('catalogue search finds products by model code and description', async ({ page }) => {
  await openStore(page);
  const samples = await page.evaluate(() => {
    const withSku = products.find(product => product.sku && product.sku !== 'Not listed');
    const withDescription = products.find(product => product.desc && product.desc.trim().length >= 6);
    return {
      sku: withSku?.sku || '',
      skuId: withSku?.id || '',
      description: withDescription?.desc || '',
      descriptionId: withDescription?.id || ''
    };
  });

  expect(samples.sku, 'approved catalogue should expose at least one model code for search QA').toBeTruthy();
  await page.locator('#searchInput').fill(samples.sku);
  await expect(page.locator('#productGrid [data-add="' + samples.skuId + '"]')).toHaveCount(1);

  const descriptionToken = samples.description.match(/[a-z0-9]{5,}/i)?.[0];
  expect(descriptionToken, 'approved catalogue should expose a searchable product description').toBeTruthy();
  await page.locator('#searchInput').fill(descriptionToken);
  await expect(page.locator('#productGrid [data-add="' + samples.descriptionId + '"]')).toHaveCount(1);
});


test('collection routes show only products matching approved audience and explicit tags', async ({ page }) => {
  await openStore(page);
  const routes = ['men', 'women', 'unisex', 'new-arrivals', 'bestsellers'];
  for (const route of routes) {
    const expectedIds = await page.evaluate((value) => {
      const normalize = input => String(input || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const definitions = {
        men: product => normalize(product.audience) === 'men',
        women: product => normalize(product.audience) === 'women',
        unisex: product => normalize(product.audience) === 'unisex',
        'new-arrivals': product => (Array.isArray(product.tags) ? product.tags : []).some(tag => ['new-arrival', 'new-arrivals'].includes(normalize(tag))),
        bestsellers: product => (Array.isArray(product.tags) ? product.tags : []).some(tag => ['bestseller', 'bestsellers', 'best-seller'].includes(normalize(tag)))
      };
      return products.filter(definitions[value]).map(product => product.id).sort();
    }, route);

    await navigateToHash(page, route);
    const actualIds = await page.locator('#routeCatalogue .route-card').evaluateAll(cards =>
      cards.map(card => {
        const link = card.querySelector('a[href^="#product/"]');
        return link ? decodeURIComponent(link.getAttribute('href').slice('#product/'.length)) : null;
      }).filter(Boolean).sort()
    );
    expect(actualIds, route + ' collection should match approved catalogue metadata exactly').toEqual(expectedIds);
    if (!expectedIds.length) await expect(page.locator('#routeCatalogue .route-empty')).toBeVisible();
  }
});
));
    await expect(menu).not.toHaveClass(/open/);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    if (expected === '#routeCatalogue') {
      await expect(page.locator('#routeCatalogue')).toBeAttached();
    } else if (expected === '#finderCard' || expected === '#compareCard') {
      await expect(page.locator(expected)).toBeVisible();
    } else {
      await expect(page.locator('#routeView')).toContainText(expected);
    }
  }
});

test('cart add, increment, decrement and remove work without enabling checkout', async ({ page }) => {
  await openStore(page);
  const card = page.locator('#productGrid .product-card').first();
  const productId = await card.locator('[data-add]').getAttribute('data-add');
  await card.locator('[data-add]').click();
  await navigateToHash(page, 'bag');
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
  await navigateToHash(page, 'wishlist');
  await expect(page.locator('#routeView')).toContainText(/wishlist/i);
  const productName = (await card.locator('.product-title').textContent()).trim();
  await expect(page.locator('#routeView')).toContainText(productName);
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


test('catalogue search finds products by model code and description', async ({ page }) => {
  await openStore(page);
  const samples = await page.evaluate(() => {
    const withSku = products.find(product => product.sku && product.sku !== 'Not listed');
    const withDescription = products.find(product => product.desc && product.desc.trim().length >= 6);
    return {
      sku: withSku?.sku || '',
      skuId: withSku?.id || '',
      description: withDescription?.desc || '',
      descriptionId: withDescription?.id || ''
    };
  });

  expect(samples.sku, 'approved catalogue should expose at least one model code for search QA').toBeTruthy();
  await page.locator('#searchInput').fill(samples.sku);
  await expect(page.locator('#productGrid [data-add="' + samples.skuId + '"]')).toHaveCount(1);

  const descriptionToken = samples.description.match(/[a-z0-9]{5,}/i)?.[0];
  expect(descriptionToken, 'approved catalogue should expose a searchable product description').toBeTruthy();
  await page.locator('#searchInput').fill(descriptionToken);
  await expect(page.locator('#productGrid [data-add="' + samples.descriptionId + '"]')).toHaveCount(1);
});


test('collection routes show only products matching approved audience and explicit tags', async ({ page }) => {
  await openStore(page);
  const routes = ['men', 'women', 'unisex', 'new-arrivals', 'bestsellers'];
  for (const route of routes) {
    const expectedIds = await page.evaluate((value) => {
      const normalize = input => String(input || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const definitions = {
        men: product => normalize(product.audience) === 'men',
        women: product => normalize(product.audience) === 'women',
        unisex: product => normalize(product.audience) === 'unisex',
        'new-arrivals': product => (Array.isArray(product.tags) ? product.tags : []).some(tag => ['new-arrival', 'new-arrivals'].includes(normalize(tag))),
        bestsellers: product => (Array.isArray(product.tags) ? product.tags : []).some(tag => ['bestseller', 'bestsellers', 'best-seller'].includes(normalize(tag)))
      };
      return products.filter(definitions[value]).map(product => product.id).sort();
    }, route);

    await navigateToHash(page, route);
    const actualIds = await page.locator('#routeCatalogue .route-card').evaluateAll(cards =>
      cards.map(card => {
        const link = card.querySelector('a[href^="#product/"]');
        return link ? decodeURIComponent(link.getAttribute('href').slice('#product/'.length)) : null;
      }).filter(Boolean).sort()
    );
    expect(actualIds, route + ' collection should match approved catalogue metadata exactly').toEqual(expectedIds);
    if (!expectedIds.length) await expect(page.locator('#routeCatalogue .route-empty')).toBeVisible();
  }
});
