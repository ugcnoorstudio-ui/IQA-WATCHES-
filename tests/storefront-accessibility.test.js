const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');

test('storefront inline JavaScript remains syntactically valid',()=>{
 const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter(([,attrs,body])=>!/\bsrc\s*=/.test(attrs)&&body.trim());
 assert.ok(scripts.length>0,'expected at least one inline storefront script');
 scripts.forEach(([,attrs,body],index)=>new vm.Script(body,{filename:'index.inline-'+(index+1)+'.js'}));
});

test('cart and wishlist totals announce updates to assistive technology',()=>{
 assert.match(html,/id="wishCount" aria-live="polite" aria-atomic="true"/);
 assert.match(html,/id="cartCount" aria-live="polite" aria-atomic="true"/);
});

test('category filters expose and synchronize their pressed state',()=>{
 assert.match(html,/data-category="All" aria-pressed="true"/);
 assert.ok(html.includes("data-category=\"'+escapeHtml(v)+'\" aria-pressed=\"'+(activeCategory===v?'true':'false')+'\""));
 assert.ok(html.includes("aria-pressed=\"'+(activeCategory==='All'?'true':'false')+'\""));
 assert.ok(html.includes("b.setAttribute('aria-pressed',String(selected))"));
});

test('product card controls have product-specific accessible names and wishlist state',()=>{
 assert.ok(html.includes("aria-label=\"'+(wishlist.includes(p.id)?'Remove '+escapeHtml(p.name)+' from wishlist':'Add '+escapeHtml(p.name)+' to wishlist')+'\" aria-pressed=\"'+(wishlist.includes(p.id)?'true':'false')+'\""));
 assert.ok(html.includes("aria-label=\"View details for '+escapeHtml(p.name)+'\""));
 assert.ok(html.includes("aria-label=\"Add '+escapeHtml(p.name)+' to preview bag\""));
});

const customer=fs.readFileSync(path.join(__dirname,'..','customer-storefront.js'),'utf8');
const routes=fs.readFileSync(path.join(__dirname,'..','routes.js'),'utf8');

test('mobile drawer exposes an explicit close control and closes on Escape',()=>{
 assert.match(html,/id="mobileMenuClose" aria-label="Close navigation"/);
 assert.match(html,/mobileMenuClose.*setMobileMenu\\(false\\)/s);
 assert.match(html,/closeModal\\(\\);\\$\\('mobileMenu'\\)\\.classList\\.remove\\('open'\\);return/);
});

test('customer comparison state is bounded, validated and synchronized across tabs',()=>{
 assert.match(customer,/const cleanIds=\\(value,limit\\)/);
 assert.match(customer,/cleanIds\\(initialState\\?\\.compare,4\\)/);
 assert.match(customer,/cleanIds\\(initialState\\?\\.recent,12\\)/);
 assert.match(customer,/window\\.addEventListener\\('storage'/);
 assert.match(customer,/const valid=state\\.compare\\.filter/);
});

test('collection routes normalize audience, category, style and collection labels',()=>{
 assert.match(routes,/function matchesAudienceCollection\\(/);
 assert.match(routes,/matches:p=>matchesAudienceCollection\\(p,\\['new-arrival','new-arrivals'\\]\\)/);
 assert.match(routes,/matches:p=>matchesAudienceCollection\\(p,\\['bestseller','bestsellers','best-seller'\\]\\)/);
});
