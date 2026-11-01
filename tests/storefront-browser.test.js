import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const products = Array.from({ length: 5 }, (_, index) => ({
  id: 'watch-' + (index + 1),
  name: 'Browser Test Watch ' + (index + 1),
  brand: 'IQA Test',
  category: 'Analog',
  audience: 'Unisex',
  description: 'Synthetic browser-test catalogue item',
  selling_price: 1200 + index * 100,
  mrp: 1500 + index * 100,
  specs: { style: 'Analog', image_url: 'https://example.test/watch-' + (index + 1) + '.jpg' },
  state: 'published',
  is_sample: false,
  verified_sellable: true
}));
const variants = products.map((product, index) => ({
  id: 'variant-' + (index + 1),
  product_id: product.id,
  options: {},
  selling_price: product.selling_price,
  stock_on_hand: index === 0 ? 2 : 8,
  stock_reserved: 0,
  active: true
}));

let server;
let browser;
let baseUrl;

test.before(async () => {
  server = createServer(async (req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const filePath = resolve(root, '.' + pathname);
    if (filePath !== root && !filePath.startsWith(root + sep)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    try {
      const body = await readFile(filePath);
      const type = extname(filePath) === '.html' ? 'text/html'
        : extname(filePath) === '.js' ? 'text/javascript'
        : extname(filePath) === '.css' ? 'text/css'
        : 'application/octet-stream';
      res.writeHead(200, { 'content-type': type + '; charset=utf-8' }).end(body);
    } catch {
      res.writeHead(404).end('Not found');
    }
  });
  await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
  baseUrl = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ headless: true });
});

test.after(async () => {
  await browser?.close();
  await new Promise(resolveClose => server?.close(resolveClose));
});

async function openStore() {
  const page = await browser.newPage();
  await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', route => route.fulfill({
    status: 200,
    contentType: 'text/javascript',
    body: `window.supabase = {
      createClient: () => ({
        from: table => {
          const query = {
            select() { return this; },
            eq() { return this; },
            order() { return this; },
            limit() { return this; },
            in() { return this; },
            then(resolve, reject) {
              const data = table === 'products' ? ${JSON.stringify(products)}
                : table === 'product_variants' ? ${JSON.stringify(variants)} : [];
              return Promise.resolve({ data, error: null }).then(resolve, reject);
            }
          };
          return query;
        },
        storage: { from: () => ({ getPublicUrl: path => ({ data: { publicUrl: 'https://example.test/' + path } }) }) }
      })
    };`
  }));
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.locator('.product-card').first().waitFor({ state: 'visible', timeout: 15000 });
  return page;
}

test('Wishlist add, remove and refresh persistence work in Chromium', async () => {
  const page = await openStore();
  try {
    await page.locator('[data-wish="watch-1"]').click();
    await assert.doesNotReject(() => page.locator('#wishCount').filter({ hasText: '1' }).waitFor());
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('.product-card').first().waitFor();
    assert.equal(await page.locator('#wishCount').textContent(), '1');
    await page.locator('#wishlistOpen').click();
    await page.locator('#drawer').getByText('Browser Test Watch 1').waitFor();
    await page.locator('#drawer [data-wish="watch-1"]').click();
    assert.equal(await page.locator('#wishCount').textContent(), '0');
    assert.equal(await page.locator('#drawer').getByText('Your wishlist is empty').count(), 1);
  } finally {
    await page.close();
  }
});

test('Cart quantity persists, respects stock and can be removed in Chromium', async () => {
  const page = await openStore();
  try {
    await page.locator('[data-add="watch-1"]').click();
    await page.locator('#cartOpen').click();
    await page.locator('#drawer').getByText('Browser Test Watch 1').waitFor();
    await page.locator('#drawer [data-qty="watch-1"][data-delta="1"]').click();
    assert.equal(await page.locator('#drawer .qty span').textContent(), '2');
    await page.locator('#drawer [data-qty="watch-1"][data-delta="1"]').click();
    assert.equal(await page.locator('#drawer .qty span').textContent(), '2', 'stock limit must prevent a third unit');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('.product-card').first().waitFor();
    assert.equal(await page.locator('#cartCount').textContent(), '2');
    await page.locator('#cartOpen').click();
    assert.equal(await page.locator('#drawer .qty span').textContent(), '2');
    await page.locator('#drawer [data-remove="watch-1"]').click();
    assert.equal(await page.locator('#cartCount').textContent(), '0');
    assert.equal(await page.locator('#drawer').getByText('Your bag is empty').count(), 1);
  } finally {
    await page.close();
  }
});

test('Compare is interactive, capped at four, persistent, removable and clearable in Chromium', async () => {
  const page = await openStore();
  try {
    for (let index = 1; index <= 5; index += 1) {
      await page.locator('[data-customer-compare="watch-' + index + '"]').click();
    }
    await page.locator('#compare').waitFor().catch(() => {});
    await page.goto(baseUrl + '#compare');
    await page.getByRole('heading', { name: 'Compare watches' }).waitFor();
    assert.equal(await page.locator('.route-specs thead th').count(), 5, 'feature column plus four watch columns');
    assert.equal(await page.locator('.route-specs thead').getByText('Browser Test Watch 5').count(), 0);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Compare watches' }).waitFor();
    assert.equal(await page.locator('.route-specs thead th').count(), 5);
    await page.locator('[data-remove-customer-compare="watch-2"]').click();
    assert.equal(await page.locator('.route-specs thead th').count(), 4);
    await page.locator('#clearCustomerCompare').click();
    assert.equal(await page.locator('#drawer').count(), 1);
    await page.locator('.route-empty').getByText('No watches selected yet').waitFor();
  } finally {
    await page.close();
  }
});
