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
 assert.match(html,/data-category="Men" aria-pressed="false"/);
 assert.ok(html.includes("aria-pressed=\"'+(activeCategory==='All'?'true':'false')+'\""));
 assert.ok(html.includes("b.setAttribute('aria-pressed',String(selected))"));
});

test('product card controls have product-specific accessible names and wishlist state',()=>{
 assert.ok(html.includes("aria-label=\"'+(wishlist.includes(p.id)?'Remove '+escapeHtml(p.name)+' from wishlist':'Add '+escapeHtml(p.name)+' to wishlist')+'\" aria-pressed=\"'+(wishlist.includes(p.id)?'true':'false')+'\""));
 assert.ok(html.includes("aria-label=\"View details for '+escapeHtml(p.name)+'\""));
 assert.ok(html.includes("aria-label=\"Add '+escapeHtml(p.name)+' to bag\""));
});

test('shop and Watch Finder share one price-range configuration',()=>{
 assert.match(html,/const PRICE_RANGES=Object\.freeze\(\[/);
 assert.ok(html.includes("$('priceFilter').innerHTML=priceRangeOptions('Any price')"));
 assert.ok(html.includes("finderBudget.innerHTML=priceRangeOptions('Any budget')"));
 assert.ok(html.includes("priceOk=price==='all'||matchesPriceRange(p.price,price)"));
 assert.ok(html.includes("budget==='all'||matchesPriceRange(p.price,budget)"));
});
test('shared price ranges cover boundaries exactly once',()=>{
 const start=html.indexOf('const PRICE_RANGES=Object.freeze([');
 const end=html.indexOf('\nfunction priceRangeOptions',start);
 assert.ok(start>=0&&end>start,'shared price configuration and matcher must exist');
 const source=html.slice(start,end);
 const sandbox={};
 vm.runInNewContext(source+';this.matchesPriceRange=matchesPriceRange;this.PRICE_RANGES=PRICE_RANGES;',sandbox);
 const matches=price=>Array.from(sandbox.PRICE_RANGES).filter(range=>sandbox.matchesPriceRange(price,range.id)).map(range=>range.id);
 assert.deepEqual(matches(999),['under1000']);
 assert.deepEqual(matches(1000),['1000to1500']);
 assert.deepEqual(matches(1499.99),['1000to1500']);
 assert.deepEqual(matches(1500),['1000to1500']);
 assert.deepEqual(matches(1500.01),['over1500']);
 assert.deepEqual(matches(2500),['over1500']);
 assert.deepEqual(matches(5000),['over1500']);
 assert.deepEqual(matches(-1),[]);
});
