'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('hidden shopping drawer and inactive story slides are removed from keyboard navigation', () => {
  assert.match(html, /id="drawer"[^>]*aria-hidden="true" inert/);
  assert.match(html, /removeAttribute\('inert'\)/);
  assert.match(html, /setAttribute\('inert',''\)/);
  assert.equal((html.match(/data-ad-slide aria-hidden="true" inert/g) || []).length, 6);
});

test('wrist size form controls have explicit visible labels and hidden tool card stays hidden', () => {
  assert.match(html, /label for="wristValue"/);
  assert.match(html, /label for="wristUnit"/);
  assert.match(html, /label for="fitPreference"/);
  assert.match(html, /#sizeCard\[hidden\]\{display:none!important\}/);
});

test('small carousel dots meet minimum touch target size and secondary text uses readable contrast', () => {
  assert.match(html, /\.homepage-ad-dot\{min-width:24px;min-height:24px/);
  assert.match(html, /--muted:#5d5951/);
  assert.match(html, /\.trust-strip span\{color:#5f513d!important\}/);
  assert.match(html, /\.eyebrow\{color:#72531f!important\}/);
});

test('visible navigation and cart labels remain included in their accessible names', () => {
  assert.doesNotMatch(html, /aria-label="IQA WATCHES home"/);
  assert.match(html, /id="wishlistOpen" aria-label="♡ Wishlist"/);
  assert.match(html, /id="cartOpen" aria-label="Bag"/);
  assert.match(html, /aria-label="Add to Bag — '\+escapeHtml\(p\.name\)/);
});
