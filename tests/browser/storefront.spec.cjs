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
  await expect(page.locator('.storefront-shortcuts')).toHaveCount(0);
  await expect(page.locator('.hero')).toBeVisible();
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
  // The trigger is correctly inert behind the modal; close it from its own dialog control.
  await page.locator('#mobileMenuClose').click();
  await expect(page.locator('#mobileMenu')).not.toHaveClass(/open/);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow, 'mobile page should not overflow horizontally').toBe(false);
});

test('mobile header keeps its logo and action icons in one row without overflow', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile viewport only');
  await page.goto('/');
  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 844 });
    const nav = page.locator('.site-header .nav');
    await expect(nav).toBeVisible();
    await expect(page.locator('#menuToggle')).toBeVisible();
    await expect(page.locator('.brand-logo')).toBeVisible();
    for (const id of ['#headerSearch', '#wishlistOpen', '#cartOpen']) {
      await expect(page.locator(id)).toBeVisible();
    }
    const layout = await page.evaluate(() => {
      const nav = document.querySelector('.site-header .nav');
      const logo = document.querySelector('.site-header .brand');
      const actions = document.querySelector('.site-header .nav-actions');
      const menu = document.querySelector('#menuToggle');
      const rect = element => {
        const r = element.getBoundingClientRect();
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
      };
      return {
        viewportWidth: document.documentElement.clientWidth,
        navWidth: nav.getBoundingClientRect().width,
        navScrollWidth: nav.scrollWidth,
        menu: rect(menu),
        logo: rect(logo),
        actions: rect(actions),
        pageScrollWidth: document.documentElement.scrollWidth
      };
    });
    expect(layout.navScrollWidth, 'header row should not overflow').toBeLessThanOrEqual(layout.navWidth + 1);
    expect(layout.pageScrollWidth, 'page should not overflow horizontally').toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(layout.menu.right).toBeLessThanOrEqual(layout.logo.left + 1);
    expect(layout.logo.right).toBeLessThanOrEqual(layout.actions.left + 1);
    expect(layout.actions.right).toBeLessThanOrEqual(layout.viewportWidth + 1);
  }
  await expect(page.locator('.storefront-shortcuts')).toHaveCount(0);
  await expect(page.locator('.hero')).toBeVisible();
});

test('premium mobile drawer shows grouped navigation, editorial header and footer without restoring Explore', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile viewport only');
  await page.goto('/');
  const menu = page.locator('#mobileMenu');
  await page.locator('#menuToggle').click();
  await expect(menu).toHaveClass(/open/);
  await expect(menu.locator('.drawer-wordmark')).toHaveText('IQA WATCHES');
  await expect(menu.locator('.drawer-intro')).toContainText('Find the details');
  await expect(menu.locator('.drawer-group-label')).toHaveText([
    'SHOP THE COLLECTION', 'DISCOVER', 'YOUR ACCOUNT'
  ]);
  await expect(menu.locator('.drawer-footer')).toContainText('MADE FOR EVERY MOMENT');
  await expect(menu.locator('a[href="#shop"]')).toBeVisible();
  await expect(menu.locator('a[href="#smart-shopping"]')).toBeVisible();
  await expect(menu.locator('a[href="#story"]')).toBeVisible();
  await expect(menu.locator('a')).toHaveCount(14);
  await expect(page.locator('.storefront-shortcuts')).toHaveCount(0);
  await expect(page.locator('.hero')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).not.toHaveClass(/open/);
  await expect(page.locator('#menuToggle')).toHaveAttribute('aria-expanded', 'false');
});

test('every mobile menu link opens its real destination and closes the menu', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile viewport only');
  await openStore(page);
  const destinations = [
    ['shop', '#routeCatalogue'],
    ['men', '#routeCatalogue'],
    ['women', '#routeCatalogue'],
    ['new-arrivals', '#routeCatalogue'],
    ['bestsellers', '#routeCatalogue'],
    ['smart-shopping', '#finderCard'],
    ['compareCard', '#compareCard'],
    ['story', /Our point of view/i],
    ['faq', /Frequently asked questions/i],
    ['account', /Sign in|Account unavailable/i],
    ['wishlist', /wishlist/i],
    ['bag', /shopping bag/i]
  ];  const menuLinks = await page.locator('#mobileMenu nav[aria-label="Mobile navigation links"] a').evaluateAll(links =>
    links.map(link => link.getAttribute('href').replace(/^#/, ''))
  );
  expect(menuLinks).toEqual(destinations.map(([route]) => route));
  for (const [route, expected] of destinations) {
    const toggle = page.locator('#menuToggle');
    const menu = page.locator('#mobileMenu');
    await toggle.click();
    await expect(menu).toHaveClass(/open/);
    await menu.locator('a[href="#' + route + '"]').click();
    const expectedHash = ['orders', 'offers'].includes(route) ? '#login' : '#' + route;
    await expect.poll(() => page.evaluate(() => location.hash)).toBe(expectedHash);
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

test('cart add, increment, decrement and remove work with responsive order summary', async ({ page, isMobile }) => {
  await openStore(page);
  const card = page.locator('#productGrid .product-card').nth(1);
  const productId = await card.locator('[data-add]').getAttribute('data-add');
  await card.locator('[data-add]').click();
  await navigateToHash(page, 'bag');
  const bag = page.locator('#routeView');
  await expect(bag).toContainText(/shopping bag/i);
  await expect(bag.locator('.shopping-progress')).toBeVisible();
  await expect(bag.locator('.shopping-progress [aria-current="step"]')).toContainText(/shopping bag/i);
  await expect(bag.locator('.shopping-layout')).toBeVisible();
  await expect(bag.locator('.shopping-items')).toBeVisible();
  await expect(bag.locator('.shopping-summary')).toContainText(/order summary/i);
  await expect(bag.locator('.shopping-checkout-button')).toHaveAttribute('href', '#checkout');
  await expect(bag.locator('[data-qty][data-delta="1"]')).toBeVisible();
  if (isMobile) {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow, 'shopping bag should not overflow on mobile').toBe(false);
  }
  await bag.locator('[data-qty][data-delta="1"]').click();
  await expect(bag.locator('.qty')).toContainText('2');
  await bag.locator('[data-qty][data-delta="-1"]').click();
  await expect(bag.locator('.qty')).toContainText('1');
  await bag.locator('[data-remove="' + productId + '"]').click();
  await expect(bag).toContainText(/bag is empty/i);
  await expect(bag).toContainText(/checkout.*unavailable/i);
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

test('PDP displays the real approved case and strap configuration', async ({ page }) => {
  await openStore(page);
  await navigateToHash(page, 'product/0a8836eb-b7ad-41b6-874f-3737e8e94482');
  const detail = page.locator('#routeView');
  await expect(detail).toContainText('Available configuration');
  await expect(detail).toContainText('Black Resin');
  await expect(detail).toContainText('Brown Genuine Leather');
  await expect(detail).toContainText('₹1,200');
});

test('comparison accepts two distinct catalogue products and clears', async ({ page }) => {
  await openStore(page);
  const initialHash = await page.evaluate(() => location.hash);
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

test('product detail route displays product content and switches gallery images', async ({ page }) => {
  await openStore(page);
  const productLink = page.locator('#productGrid a[href^="#product/"]').first();
  const href = await productLink.getAttribute('href');
  const productId = decodeURIComponent(href.slice('#product/'.length));
  const primaryImage = await page.locator('#productGrid .product-card').first().locator('.product-image img').getAttribute('src');
  const secondaryImage = primaryImage + '#gallery-second-frame';
  await page.evaluate(({ id, primary, secondary }) => {
    const product = products.find(item => item.id === id);
    product.gallery = [
      { src: primary, alt: 'Primary product image' },
      { src: secondary, alt: 'Secondary product image' }
    ];
    location.hash = '#product/' + encodeURIComponent(id);
  }, { id: productId, primary: primaryImage, secondary: secondaryImage });
  await expect(page.locator('#routeView')).toBeVisible();
  await expect(page.locator('#routeView')).toContainText(/product/i);
  await expect(page.locator('#routeMainImage')).toBeVisible();
  await expect(page.locator('#routeMainImage')).toHaveAttribute('src', primaryImage);
  const thumbnails = page.locator('#routeView [data-gallery-src]');
  await expect(thumbnails).toHaveCount(2);
  await thumbnails.nth(1).click();
  await expect(page.locator('#routeMainImage')).toHaveAttribute('src', secondaryImage);
  await expect(thumbnails.nth(0)).toHaveAttribute('aria-pressed', 'false');
  await expect(thumbnails.nth(1)).toHaveAttribute('aria-pressed', 'true');
});


test('catalogue search finds products by model code and description', async ({ page }) => {
  await openStore(page);
  const samples = await page.evaluate(() => {
    const withModel = products.find(product => product.modelCode);
    const withDescription = products.find(product => product.desc && product.desc.trim().length >= 6);
    return {
      modelCode: withModel?.modelCode || '',
      modelId: withModel?.id || '',
      description: withDescription?.desc || '',
      descriptionId: withDescription?.id || ''
    };
  });

  expect(samples.modelCode, 'approved catalogue should expose at least one public model code for search QA').toBeTruthy();
  await page.locator('#searchInput').fill(samples.modelCode);
  await expect(page.locator('#productGrid [data-add="' + samples.modelId + '"]')).toHaveCount(1);

  const descriptionToken = samples.description.match(/[a-z0-9]{5,}/i)?.[0];
  expect(descriptionToken, 'approved catalogue should expose a searchable product description').toBeTruthy();
  await page.locator('#searchInput').fill(descriptionToken);
  await expect(page.locator('#productGrid [data-add="' + samples.descriptionId + '"]')).toHaveCount(1);
});




test('real approved catalogue normalizes required sellable fields and optional arrays', async ({ page }) => {
  await openStore(page);
  const catalogue = await page.evaluate(() => products.map(product => ({
    id: product.id,
    name: product.name,
    price: product.price,
    stock: product.stock,
    image: product.image,
    tagsAreArray: Array.isArray(product.tags),
    galleryIsArray: Array.isArray(product.gallery),
    galleryUrlsValid: product.gallery.every(item => { try { return ['http:', 'https:'].includes(new URL(item.src).protocol); } catch { return false; } })
  })));
  expect(catalogue.length, 'real approved catalogue should contain sellable products').toBeGreaterThan(0);
  for (const product of catalogue) {
    expect(product.id).toBeTruthy();
    expect(product.name).toBeTruthy();
    expect(product.price).toBeGreaterThan(0);
    expect(product.stock).toBeGreaterThan(0);
    expect(['http:', 'https:']).toContain(new URL(product.image).protocol);
    expect(product.tagsAreArray).toBe(true);
    expect(product.galleryIsArray).toBe(true);
    expect(product.galleryUrlsValid).toBe(true);
  }
});

test('Cloudinary primary and gallery images load successfully on product routes', async ({ page }) => {
  await openStore(page);
  const productIds = await page.evaluate(() => products.map(product => product.id));
  expect(productIds.length).toBeGreaterThan(0);

  for (const productId of productIds) {
    await navigateToHash(page, 'product/' + encodeURIComponent(productId));
    const mainImage = page.locator('#routeMainImage');
    await expect(mainImage).toBeVisible();
    await expect.poll(
      () => mainImage.evaluate(image => image.complete && image.naturalWidth > 0),
      { timeout: 15000 }
    ).toBe(true);

    const thumbnails = page.locator('#routeView [data-gallery-src]');
    const thumbnailCount = await thumbnails.count();
    for (let index = 0; index < thumbnailCount; index++) {
      await thumbnails.nth(index).click();
      await expect.poll(
        () => mainImage.evaluate(image => image.complete && image.naturalWidth > 0),
        { timeout: 15000 }
      ).toBe(true);
    }
  }
});

test('product detail tolerates null optional fields and ignores invalid gallery media', async ({ page }) => {
  await openStore(page);
  const card = page.locator('#productGrid .product-card').first();
  const productId = await card.locator('a[href^="#product/"]').first().getAttribute('href').then(href => decodeURIComponent(href.slice('#product/'.length)));
  const expectedImage = await card.locator('.product-image img').getAttribute('src');
  await page.evaluate(id => {
    const product = products.find(item => item.id === id);
    Object.assign(product, {
      brand: null, category: null, style: null, colour: null, dial: null,
      strap: null, sku: null, desc: null, imageAlt: null, tags: null,
      caseMaterial: 'Resin', waterResistance: '50 m',
      gallery: [{ src: null, alt: null }, { src: 'javascript:alert(1)', alt: 'unsafe' }]
    });
    location.hash = '#product/' + encodeURIComponent(id);
  }, productId);
  await expect(page.locator('#routeMainImage')).toBeVisible();
  await expect(page.locator('#routeMainImage')).toHaveAttribute('src', expectedImage);
  await expect(page.locator('#routeView [data-gallery-src]')).toHaveCount(0);
  const specsDisclosure = page.locator('#routeView .route-product-details').first();
  await expect(specsDisclosure.locator('summary')).toContainText('View product specifications');
  await expect(specsDisclosure).not.toHaveAttribute('open', '');
  await specsDisclosure.locator('summary').click();
  await expect(page.locator('#routeView .route-specs')).toBeVisible();
  await expect(page.locator('#routeView')).not.toContainText(/\b(?:null|undefined)\b/i);
  await expect(page.locator('#routeView')).toContainText(/IQA WATCHES/i);
});

test('cart contents and quantities persist after a full page reload', async ({ page }) => {
  await openStore(page);
  const card = page.locator('#productGrid .product-card').nth(1);
  const productId = await card.locator('[data-add]').getAttribute('data-add');
  await card.locator('[data-add]').click();
  await page.reload();
  await expect.poll(() => page.evaluate(() => typeof catalogueState === 'undefined' ? 'missing' : catalogueState), { timeout: 20000 }).toBe('ready');
  await navigateToHash(page, 'bag');
  const bag = page.locator('#routeView');
  await expect(bag.locator('[data-qty][data-delta="1"]')).toBeVisible();
  await expect(bag.locator('[data-remove="' + productId + '"]')).toBeVisible();
  await expect(bag.locator('.qty')).toContainText('1');
  await bag.locator('[data-qty][data-delta="1"]').click();
  await page.reload();
  await expect.poll(() => page.evaluate(() => typeof catalogueState === 'undefined' ? 'missing' : catalogueState), { timeout: 20000 }).toBe('ready');
  await navigateToHash(page, 'bag');
  await expect(page.locator('#routeView .qty')).toContainText('2');
});

test('customer discovery routes render and retain recently viewed products', async ({ page }) => {
  await openStore(page);
  const productLink = page.locator('#productGrid a[href^="#product/"]').first();
  const productName = (await productLink.textContent()).trim();
  await productLink.click();
  await navigateToHash(page, 'recently-viewed');
  await expect(page.locator('#routeView')).toContainText(/Recently viewed/i);
  await expect(page.locator('#routeView')).toContainText(productName);
  for (const [route, label] of [['brands', 'Shop by brand'], ['categories', 'Shop by category'], ['delivery', 'Delivery availability'], ['promotions', 'Offers & promotions'], ['compare', 'Compare watches']]) {
    await navigateToHash(page, route);
    await expect(page.locator('#routeView')).toContainText(new RegExp(label, 'i'));
  }
});

test('mobile product, collection, bag and wishlist routes fit the viewport', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile viewport only');
  await openStore(page);
  const productHref = await page.locator('#productGrid a[href^="#product/"]').first().getAttribute('href');
  const routes = [productHref, '#men', '#bag', '#wishlist', '#faq', '#policies'];
  for (const hash of routes) {
    await page.evaluate(value => { location.hash = value; }, hash);
    await page.waitForFunction(value => location.hash === value, hash);
    await page.waitForTimeout(50);
    const metrics = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth
    }));
    expect(metrics.content, hash + ' should not overflow horizontally').toBeLessThanOrEqual(metrics.viewport + 1);
  }
});

test('collection routes show only products matching approved audience and explicit tags', async ({ page }) => {
  await openStore(page);
  const routes = ['men', 'women', 'unisex', 'new-arrivals', 'bestsellers'];
  for (const route of routes) {
    const expectedIds = await page.evaluate((value) => {
      const normalize = input => String(input || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const definitions = {
        men: product => [product.audience, product.category, product.style, ...(Array.isArray(product.tags) ? product.tags : [])].some(value => ['men','mens'].includes(normalize(value)) || ['men','mens'].includes(normalize(value).split('-')[0])),
        women: product => [product.audience, product.category, product.style, ...(Array.isArray(product.tags) ? product.tags : [])].some(value => ['women','womens'].includes(normalize(value)) || ['women','womens'].includes(normalize(value).split('-')[0])),
        unisex: product => [product.audience, product.category, product.style, ...(Array.isArray(product.tags) ? product.tags : [])].some(value => normalize(value) === 'unisex' || normalize(value).split('-')[0] === 'unisex'),
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


test('product cards open a dedicated product page with app-style back navigation', async ({ page }) => {
 await openStore(page); const initialHash=await page.evaluate(()=>location.hash);
 const card=page.locator('#productGrid .product-card').first(), name=(await card.locator('.product-title').innerText()).trim(), id=await card.locator('.product-image-link').getAttribute('data-view');
 await card.locator('.product-image-link').click();
 await expect.poll(()=>page.evaluate(()=>location.hash)).toBe('#product/'+encodeURIComponent(id));
 await expect(page.locator('.route-pdp-appbar')).toBeVisible(); await expect(page.locator('[data-pdp-back]')).toContainText('Back');
 await expect(page.locator('.route-product-copy h1')).toHaveText(name); await expect(page.locator('#routeMainImage')).toBeVisible(); await expect(page.locator('[data-pdp-page]')).toBeVisible(); await expect(page.locator('#modalWrap.open')).toHaveCount(0);
 await expect(page.locator('.route-product-details')).toHaveCount(2); await expect(page.locator('.route-sticky-buybar')).toBeVisible(); await expect(page.locator('.route-sticky-buybar')).toHaveCSS('position','fixed');
 await expect(page.locator('.route-recommendations .route-card')).not.toHaveCount(0);
 await page.locator('[data-pdp-back]').click(); await expect.poll(()=>page.evaluate(()=>location.hash)).toBe(initialHash);
 await expect(page.locator('#productGrid .product-card').first()).toBeVisible();
});

test('account navigation opens the customer sign-in or safe unavailable panel', async ({ page, isMobile }) => {
  await page.goto('/');
  if (isMobile) {
    await page.locator('#menuToggle').click();
    await expect(page.locator('#mobileMenu')).toHaveClass(/open/);
    await page.locator('#mobileMenu a[href="#account"]').click();
  } else {
    await page.locator('a[aria-label="My account"]').first().click();
  }
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('#account');
  await expect(page.locator('#routeView')).toBeVisible();
  await expect(page.locator('#routeView')).toContainText(/Sign in|Account unavailable/i);
});

test('homepage Explore shortcuts remain removed while the hero and catalogue controls stay available', async ({ page }) => {
  await openStore(page);
  await expect(page.locator('.storefront-shortcuts')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Browse watch collections' })).toHaveCount(0);
  await expect(page.locator('.hero')).toBeVisible();
  await expect(page.locator('#searchInput')).toBeVisible();
  await expect(page.locator('#priceFilter')).toBeVisible();
  await expect(page.locator('#sortFilter')).toBeVisible();
});

test('Buy Now keeps its own quantity and does not mutate the shopping bag', async ({ page, isMobile }) => {
 await openStore(page); const card=page.locator('#productGrid .product-card').first(), id=await card.locator('.product-image-link').getAttribute('data-view');
 const before=await page.evaluate(id=>Number(cart[id]||0),id); await card.locator('.product-image-link').click();
 await expect(page.locator('.route-product-copy h1')).toBeVisible(); await page.locator('[data-buy-now]').click();
 await expect.poll(()=>page.evaluate(()=>location.hash)).toBe('#buy-now/'+encodeURIComponent(id));
 const buy=page.locator('#routeView'); await expect(buy).toContainText(/Review your selected timepiece/i); await expect(buy.locator('[data-buy-now-checkout]')).toBeVisible();
 expect(await page.evaluate(id=>Number(cart[id]||0),id)).toBe(before);
 if(isMobile)expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
});

test('full-screen product image viewer supports navigation, zoom and keyboard close', async ({ page }) => {
  await openStore(page);
  const card = page.locator('#productGrid .product-card').first();
  const selectedId = await card.locator('.product-image-link').getAttribute('data-view');
  const primary = await card.locator('.product-image img').getAttribute('src');
  await page.evaluate(({ id, src }) => {
    const product = products.find(item => item.id === id);
    product.gallery = [
      { src, alt: 'Primary full-screen image' },
      { src: src + '?phase3=secondary', alt: 'Secondary full-screen image' }
    ];
    location.hash = '#product/' + encodeURIComponent(id);
  }, { id: selectedId, src: primary });
  const mainImage = page.locator('#routeMainImage');
  await expect(mainImage).toBeVisible();
  await mainImage.click();
  const viewer = page.locator('#iqa-image-lightbox');
  await expect(viewer).toHaveClass(/open/);
  await expect(viewer.locator('[data-lightbox-back]')).toBeVisible();
  await expect(viewer.locator('[data-lightbox-back]')).toContainText('Back');
  await expect(viewer.locator('[data-lightbox-close]')).toHaveCount(0);
  await expect(viewer).toContainText('1 / 2');
  await viewer.locator('[data-lightbox-next]').click();
  await expect(viewer).toContainText('2 / 2');
  await expect(viewer.locator('.iqa-lightbox-caption')).toHaveText('Secondary full-screen image');
  await viewer.locator('[data-lightbox-zoom]').click();
  await expect(viewer.locator('img')).toHaveClass(/is-zoomed/);
  await viewer.locator('[data-lightbox-back]').click();
  await expect(viewer).not.toHaveClass(/open/);
  await expect(page.locator('#routeMainImage')).toBeVisible();
});

test('product details CTA opens the same dedicated full-page experience', async ({ page }) => {
 await openStore(page); await navigateToHash(page,'shop');
 const link=page.locator('#routeCatalogue .route-card .route-actions a[data-view]').first();
 await expect(link).toContainText(/Product details/i);
 await link.click();
 await expect(page.locator('[data-pdp-page]')).toBeVisible();
 await expect(page.locator('.route-product-copy h1')).not.toBeEmpty();
 await expect(page.locator('#modalWrap.open')).toHaveCount(0);
 await expect(page.locator('.route-sticky-buybar')).toHaveCSS('position','fixed');
});

test('collection product cards open the dedicated product page', async ({ page }) => {
 await openStore(page); await navigateToHash(page,'shop');
 const link=page.locator('#routeCatalogue .route-card a[data-view]').first(), href=await link.getAttribute('href');
 await link.click(); await expect.poll(()=>page.evaluate(()=>location.hash)).toBe(href);
 await expect(page.locator('.route-pdp-appbar')).toBeVisible(); await expect(page.locator('.route-product-copy h1')).not.toBeEmpty();
 await page.locator('[data-pdp-back]').click(); await expect.poll(()=>page.evaluate(()=>location.hash)).toBe('#shop');
});

test('customer comparison removes individual watches and prunes stale catalogue IDs', async ({ page }) => {
  await openStore(page);
  const cards = page.locator('#productGrid .product-card');
  const firstButton = cards.nth(0).locator('[data-customer-compare]');
  const secondButton = cards.nth(1).locator('[data-customer-compare]');
  await expect(firstButton).toBeVisible();
  await expect(secondButton).toBeVisible();
  const firstId = await firstButton.getAttribute('data-customer-compare');
  const secondId = await secondButton.getAttribute('data-customer-compare');
  await firstButton.click();
  await secondButton.click();
  await navigateToHash(page, 'compare');
  await expect(page.locator('[data-remove-customer-compare]')).toHaveCount(2);
  await page.locator('[data-remove-customer-compare="' + firstId + '"]').click();
  await expect(page.locator('[data-remove-customer-compare]')).toHaveCount(1);
  await expect(page.locator('[data-remove-customer-compare="' + secondId + '"]')).toBeVisible();
  await page.evaluate(id => localStorage.setItem('iqa-customer-storefront-v1', JSON.stringify({ compare: [id, 'deleted-catalogue-product'], recent: [] })), secondId);
  await page.reload();
  await openStore(page);
  await navigateToHash(page, 'compare');
  await expect(page.locator('[data-remove-customer-compare]')).toHaveCount(1);
  await expect(page.locator('[data-remove-customer-compare="' + secondId + '"]')).toBeVisible();
});

test('mobile drawer exposes modal navigation semantics, traps focus and restores background access', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile viewport only');
  await page.goto('/');
  const toggle = page.locator('#menuToggle');
  const menu = page.locator('#mobileMenu');
  await expect(toggle).toHaveAttribute('aria-controls', 'mobileMenu');
  await toggle.click();
  await expect(menu).toHaveAttribute('role', 'dialog');
  await expect(menu).toHaveAttribute('aria-modal', 'true');
  await expect(menu).toHaveAttribute('aria-hidden', 'false');
  await expect(menu.locator('nav[aria-label="Mobile navigation links"]')).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('main')).toHaveAttribute('inert', '');
  await expect(page.locator('#mobileMenuClose')).toBeFocused();

  const links = menu.locator('a');
  await expect(links).toHaveCount(14);
  await page.keyboard.press('Shift+Tab');
  await expect(links.last()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#mobileMenuClose')).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-hidden', 'true');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
  await expect(page.locator('main')).not.toHaveAttribute('inert', '');
  await expect(page.locator('.hero')).toBeVisible();
  await expect(page.locator('.storefront-shortcuts')).toHaveCount(0);
});


test('mobile watch detail is a full product page with compact app navigation', async ({ page, isMobile }) => {
 test.skip(!isMobile,'mobile viewport only'); await openStore(page);
 const card=page.locator('#productGrid .product-card').first(),id=await card.locator('.product-image-link').getAttribute('data-view'); await card.locator('.product-image-link').click();
 await expect.poll(()=>page.evaluate(()=>location.hash)).toBe('#product/'+encodeURIComponent(id));
 await expect(page.locator('.route-pdp-appbar')).toBeVisible(); await expect(page.locator('[data-pdp-back]')).toBeVisible();
 const size=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,doc:document.documentElement.scrollWidth,image:document.querySelector('#routeMainImage')?.getBoundingClientRect().height}));
 expect(size.doc).toBeLessThanOrEqual(size.viewport); expect(size.image).toBeGreaterThan(160); await expect(page.locator('.route-sticky-buybar')).toBeVisible();
});

test('multi-image product page gallery synchronizes thumbnail controls', async ({ page }) => {
 await openStore(page); const card=page.locator('#productGrid .product-card').first(),id=await card.locator('.product-image-link').getAttribute('data-view'),src=await card.locator('.product-image img').getAttribute('src');
 await page.evaluate(({id,src})=>{const p=products.find(x=>x.id===id);p.gallery=[{src,alt:'Primary watch image'},{src:src+'?gallery-test=secondary',alt:'Secondary watch image'},{src:src+'?gallery-test=tertiary',alt:'Tertiary watch image'}];location.hash='#product/'+encodeURIComponent(id)},{id,src});
 await expect(page.locator('#routeMainImage')).toBeVisible(); const thumbs=page.locator('[data-gallery-src]'); await expect(thumbs).toHaveCount(3);
 await thumbs.nth(1).click(); await expect(page.locator('#routeMainImage')).toHaveAttribute('alt','Secondary watch image'); await expect(thumbs.nth(1)).toHaveAttribute('aria-pressed','true');
});

test('homepage editorial banners are consolidated into an autoplay carousel with manual and touch navigation', async ({ page }) => {
  await openStore(page);
  const carousel = page.locator('[data-ad-carousel]');
  const slides = carousel.locator('[data-ad-slide]');
  await expect(carousel).toBeVisible();
  await expect(slides).toHaveCount(7);
  await expect(slides.nth(0).locator('h2')).toHaveText('Good design belongs in every day.');
  await expect(slides.nth(1).locator('h2')).toHaveText('Time is an art.');
  await expect(slides.nth(2).locator('h2')).toHaveText('Presence, before precision.');
  await expect(slides.nth(3).locator('h2')).toHaveText('Every second, considered.');
  await expect(slides.filter({ visible: true })).toHaveCount(1);
  await expect(carousel.locator('[data-ad-count]')).toHaveText('01 / 07');

  // The first banner advances automatically when the carousel is not hovered or focused.
  await page.mouse.move(0, 0);
  await expect(carousel.locator('[data-ad-count]')).toHaveText('02 / 07', { timeout: 8000 });
  await carousel.locator('[data-ad-next]').click();
  await expect(carousel.locator('[data-ad-count]')).toHaveText('03 / 07');
  await carousel.locator('[data-ad-prev]').click();
  await expect(carousel.locator('[data-ad-count]')).toHaveText('02 / 07');

  // A horizontal touch gesture advances the banner; vertical gestures remain page scrolling.
  await page.evaluate(() => {
    const track = document.querySelector('[data-ad-track]');
    const start = new Event('touchstart', { bubbles: true, cancelable: true });
    Object.defineProperty(start, 'touches', { value: [{ identifier: 71, clientX: 280, clientY: 180 }] });
    track.dispatchEvent(start);
    const end = new Event('touchend', { bubbles: true, cancelable: true });
    Object.defineProperty(end, 'changedTouches', { value: [{ identifier: 71, clientX: 90, clientY: 184 }] });
    document.dispatchEvent(end);
  });
  await expect(carousel.locator('[data-ad-count]')).toHaveText('03 / 07');
  await carousel.locator('[data-ad-pause]').click();
  await expect(carousel.locator('[data-ad-pause]')).toHaveAttribute('aria-pressed', 'true');
  await expect(carousel.locator('[data-ad-pause]')).toHaveAttribute('aria-label', 'Play automatic stories');
});

test('premium customer login exposes Google, email and OTP sections with responsive desktop and mobile layout', async ({ page, isMobile }) => {
  await page.goto('/');
  await navigateToHash(page, 'login');

  const layout = page.locator('.route-auth-layout.auth-experience');
  const main = page.locator('.auth-panel-main');
  const brand = page.locator('.auth-brand-panel');
  await expect(layout).toBeVisible();
  await expect(main).toBeVisible();
  await expect(brand).toBeVisible();
  await expect(main.locator('#authWelcomeTitle')).toHaveText('Welcome back');
  await expect(main.locator('#customerGoogleSignIn')).toContainText('Continue with Google');
  await expect(main.locator('#customerGoogleSignIn .auth-google-mark svg path')).toHaveCount(4);

  const emailForm = page.locator('#customerAuthForm');
  await expect(emailForm.locator('input[name="email"][type="email"]')).toBeVisible();
  await expect(emailForm.locator('input[name="password"][type="password"]')).toBeVisible();
  await expect(emailForm.locator('button[type="submit"]')).toContainText('Sign in with email');

  const phoneForm = page.locator('#customerPhoneForm');
  await expect(phoneForm.locator('input[name="phone"][type="tel"]')).toBeVisible();
  await expect(phoneForm.locator('#customerPhoneSubmit')).toContainText('Send OTP');
  await expect(page.locator('#phoneOtpLabel')).toBeHidden();
  await expect(brand).toContainText('TIME, WITH INTENTION');
  await expect(brand).toContainText('Your signature.');
  await expect(page.locator('.auth-stepper [data-auth-step="login"]')).toHaveClass(/is-active/);

  const columns = await layout.evaluate(el => getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length);
  expect(columns).toBe(1);
  const brandBox = await brand.boundingBox();
  const mainBox = await main.boundingBox();
  expect(brandBox.y).toBeLessThan(mainBox.y);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow, 'premium login should not overflow at any viewport').toBe(false);

  await page.locator('.auth-tabs a[href="#signup"]').click();
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('#signup');
  await expect(page.locator('#authWelcomeTitle')).toHaveText('Create your account');
  await expect(page.locator('#customerAuthForm input[name="full_name"]')).toBeVisible();
});


test('Featured Watches uses crawlable fallback cards while the static catalogue snapshot hydrates', async ({ page }) => {
  await page.goto('/');
  const fallback = page.locator('#productStaticFallback');
  await expect(fallback).toBeAttached();
  await expect(fallback.locator('.product-card')).toHaveCount(3);
  await expect(fallback).toContainText('AE-1200WHD-1AV');
  await expect(fallback).toContainText('AE-1200WHL-5AV');
  await expect(fallback).toContainText('Thor Multifunctional Analogue Watch');
  await expect.poll(
    () => page.evaluate(() => typeof catalogueState === 'undefined' ? 'missing' : catalogueState),
    { timeout: 20000 }
  ).toBe('ready');
  await expect(fallback).toBeHidden();
});

test('static catalogue loading failure shows retry action and retains crawlable fallback', async ({ page }) => {
  let failCatalogue = true;
  await page.route('**/data/catalogue.json*', async route => {
    if (failCatalogue) {
      await route.abort('failed');
      return;
    }
    await route.continue();
  });
  await page.goto('/');
  await expect.poll(
    () => page.evaluate(() => typeof catalogueState === 'undefined' ? 'missing' : catalogueState),
    { timeout: 20000 }
  ).toBe('error');
  await expect(page.locator('#productGrid [data-catalogue-retry]')).toBeVisible();
  await expect(page.locator('#productStaticFallback')).toBeVisible();
  failCatalogue = false;
  await page.locator('#productGrid [data-catalogue-retry]').click();
  await expect.poll(
    () => page.evaluate(() => typeof catalogueState === 'undefined' ? 'missing' : catalogueState),
    { timeout: 20000 }
  ).toBe('ready');
  await expect(page.locator('#productStaticFallback')).toBeHidden();
});
