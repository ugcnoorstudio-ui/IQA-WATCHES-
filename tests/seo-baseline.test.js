import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, robots, sitemap] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../robots.txt', import.meta.url), 'utf8'),
  readFile(new URL('../sitemap.xml', import.meta.url), 'utf8'),
]);

const canonical = 'https://iqa-watches-storefront.pages.dev/';

test('homepage declares one canonical URL for the current public site', () => {
  assert.ok(html.includes('<link rel="canonical" href="' + canonical + '">'));
  assert.match(html, /<meta name="robots" content="index,follow">/);
  assert.ok(html.includes('<meta property="og:url" content="' + canonical + '">'));
});

test('robots file allows public storefront crawling and points to the sitemap', () => {
  assert.match(robots, /User-agent: \*/);
  assert.ok(robots.includes('Allow: /'));
  assert.ok(robots.includes('Sitemap: ' + canonical + 'sitemap.xml'));
});

test('sitemap contains only the crawlable canonical homepage, not hash routes', () => {
  assert.ok(sitemap.includes('<loc>' + canonical + '</loc>'));
  assert.doesNotMatch(sitemap, /#(?:product|shop|category|brand)\//);
});
