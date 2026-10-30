(function(){
const root=document.getElementById('routeView');
const $r=id=>document.getElementById(id);
const esc=v=>typeof escapeHtml==='function'?escapeHtml(v):String(v??'');
function hero(k,t,d){return '<header class="route-hero"><div class="eyebrow">'+esc(k)+'</div><h1>'+esc(t)+'</h1><p>'+esc(d)+'</p></header>'}
function product(id){
 const p=products.find(x=>x.id===id);
 if(!p){root.innerHTML=hero('IQA WATCHES · PRODUCT','Product not found','This product is not currently in the approved catalogue.')+'<div class="route-content"><a class="button" href="#shop">Shop All</a></div>';return}
 const casio=p.sku==='CAS-AE1200WHL5AVDF-001'||p.sku==='AE-1200WHL-5AV';
 const specs=casio?'<table class="route-specs"><tr><th>Display</th><td>Digital</td></tr><tr><th>Case size</th><td>45 × 42.1 × 12.5 mm</td></tr><tr><th>Case material</th><td>Resin</td></tr><tr><th>Band</th><td>Brown leather</td></tr><tr><th>Water resistance</th><td>100 metres</td></tr><tr><th>Battery life</th><td>Approx. 10 years (CR2025)</td></tr><tr><th>Functions</th><td>World Time, stopwatch, countdown timer, 5 alarms, LED light, auto-calendar</td></tr><tr><th>Availability</th><td>'+Number(p.stock)+' units in current catalogue stock</td></tr></table><p class="route-note">Official Casio India product reference lists MRP ₹4,495. IQA WATCHES selling price: ₹1,200. Warranty and sourcing documentation should be confirmed with the seller before purchase.</p>':'<table class="route-specs"><tr><th>Brand</th><td>'+esc(p.brand)+'</td></tr><tr><th>Category</th><td>'+esc(p.category)+'</td></tr><tr><th>Style</th><td>'+esc(p.style)+'</td></tr><tr><th>Colour</th><td>'+esc(p.colour||'Not specified')+'</td></tr><tr><th>Strap</th><td>'+esc(p.strap||'Not specified')+'</td></tr><tr><th>SKU</th><td>'+esc(p.sku||'Not specified')+'</td></tr><tr><th>Availability</th><td>'+Number(p.stock)+' units available</td></tr></table>';
 root.innerHTML=hero('IQA WATCHES · PRODUCT',p.name,casio?'Casio AE-1200WHL-5AV · World Time Illuminator':'Verified product details and current catalogue availability')+'<div class="route-content"><div class="route-columns"><div><img src="'+esc(safeImageUrl(p.image))+'" alt="'+esc(p.name)+'" style="width:100%;max-height:680px;object-fit:contain;background:#f7f5f1" onerror="this.alt=\'Product image unavailable\';this.style.opacity=\'.25\'"></div><div><div class="eyebrow">'+esc(p.brand)+' · IQA WATCHES</div><h2 style="font:400 42px var(--serif)">'+esc(p.name)+'</h2><p><strong style="font-size:30px">'+money(p.price)+'</strong> '+(p.compareAt>p.price?'<span style="text-decoration:line-through;opacity:.65">'+money(p.compareAt)+'</span>':'')+'</p><span class="sample-label">PUBLISHED · '+Number(p.stock)+' AVAILABLE</span><p>'+esc(p.desc)+'</p>'+specs+'<div class="route-actions"><a class="button light" href="#shop">Back to catalogue</a><button class="button light" data-wish="'+esc(p.id)+'">♡ Wishlist</button></div><div class="route-disabled">This website is currently a product catalogue; online checkout and payment are not enabled.</div></div></div></div>';
}
function render(){
 const raw=(location.hash||'#home').slice(1),parts=raw.split('/'),r=parts[0]||'home',arg=decodeURIComponent(parts.slice(1).join('/')||'');
 if(!root)return;
 if(r==='home'){root.classList.add('hidden');Array.from(document.getElementById('home').children).forEach(x=>{if(x!==root)x.classList.remove('hidden')});return}
 Array.from(document.getElementById('home').children).forEach(x=>{if(x!==root)x.classList.add('hidden')});
 root.classList.remove('hidden');window.scrollTo(0,0);
 if(r==='product')return product(arg);
 if(['shop','men','women','unisex','new-arrivals','bestsellers'].includes(r)){
  root.innerHTML=hero('IQA WATCHES · COLLECTION','Shop watches','Browse all currently approved products in the live catalogue.')+'<div class="route-content"><div id="routeCatalogue" class="route-grid" style="margin-top:22px"></div></div>';
  const grid=$r('routeCatalogue');
  grid.innerHTML=products.length?products.map(p=>'<article class="route-card"><a href="#product/'+encodeURIComponent(p.id)+'"><img src="'+esc(safeImageUrl(p.image))+'" alt="'+esc(p.name)+'"></a><div class="route-card-copy"><div class="product-brand">'+esc(p.brand)+'</div><h3><a href="#product/'+encodeURIComponent(p.id)+'">'+esc(p.name)+'</a></h3><p>'+money(p.price)+' · '+Number(p.stock)+' available</p><a class="button light" href="#product/'+encodeURIComponent(p.id)+'">View product</a></div></article>').join(''):'<div class="route-empty">No approved products are currently available.</div>';
  return;
 }
 root.innerHTML=hero('IQA WATCHES','Page not found','This destination is unavailable.')+'<div class="route-content"><a class="button" href="#home">Home</a> <a class="button light" href="#shop">Shop All</a></div>';
}
window.addEventListener('hashchange',render);
window.addEventListener('load',render);
window.addEventListener('catalogue:ready',render);
document.addEventListener('click',e=>{const add=e.target.closest('[data-add-compare]');if(add)location.hash='comparison'});
window.renderRouteFromHash=render;
render();
})();