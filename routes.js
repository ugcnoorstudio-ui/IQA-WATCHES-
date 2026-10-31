(function(){
const root=document.getElementById('routeView');
const $r=id=>document.getElementById(id);
const esc=v=>typeof escapeHtml==='function'?escapeHtml(v):String(v??'');
function hero(k,t,d){return '<header class="route-hero"><div class="eyebrow">'+esc(k)+'</div><h1>'+esc(t)+'</h1><p>'+esc(d)+'</p></header>'}
function product(id){
 const p=products.find(x=>x.id===id);
 if(!p){root.innerHTML=hero('IQA WATCHES · PRODUCT','Product not found','This product is not currently in the approved catalogue.')+'<div class="route-content"><a class="button" href="#shop">Shop All</a></div>';return}
 const casio=p.sku==='CAS-AE1200WHL5AVDF-001'||p.sku==='AE-1200WHL-5AV';
 const galleryItems=(Array.isArray(p.gallery)?p.gallery:[]).map(item=>({src:safeImageUrl(item.src),alt:String(item.alt||p.name)})).filter(item=>item.src);
 if(!galleryItems.length&&p.image){const fallback=safeImageUrl(p.image);if(fallback)galleryItems.push({src:fallback,alt:p.imageAlt||p.name})}
 const primaryIndex=galleryItems.findIndex(item=>item.src===safeImageUrl(p.image));
 if(primaryIndex>0)galleryItems.unshift(galleryItems.splice(primaryIndex,1)[0]);
 const mainImage=galleryItems[0]||{src:'',alt:p.name};
 const thumbnails=galleryItems.length>1?'<div class="route-gallery-thumbs" aria-label="Product images">'+galleryItems.map((item,index)=>'<button type="button" class="route-gallery-thumb" data-gallery-src="'+esc(item.src)+'" data-gallery-alt="'+esc(item.alt)+'" aria-pressed="'+(index===0?'true':'false')+'" aria-label="Show product image '+(index+1)+'"><img src="'+esc(item.src)+'" alt="" loading="lazy"></button>').join('')+'</div>':'';
 const specs=casio?'<table class="route-specs"><tr><th>Display</th><td>Digital</td></tr><tr><th>Case size</th><td>45 × 42.1 × 12.5 mm</td></tr><tr><th>Case material</th><td>Resin</td></tr><tr><th>Band</th><td>Brown leather</td></tr><tr><th>Water resistance</th><td>100 metres</td></tr><tr><th>Battery life</th><td>Approx. 10 years (CR2025)</td></tr><tr><th>Functions</th><td>World Time, stopwatch, countdown timer, 5 alarms, LED light, auto-calendar</td></tr><tr><th>Availability</th><td>'+Number(p.stock)+' units in current catalogue stock</td></tr></table><p class="route-note">Official Casio India product reference lists MRP ₹4,495. IQA WATCHES selling price: ₹1,200. Warranty and sourcing documentation should be confirmed with the seller before purchase.</p>':'<table class="route-specs"><tr><th>Brand</th><td>'+esc(p.brand)+'</td></tr><tr><th>Category</th><td>'+esc(p.category)+'</td></tr><tr><th>Style</th><td>'+esc(p.style)+'</td></tr><tr><th>Colour</th><td>'+esc(p.colour||'Not specified')+'</td></tr><tr><th>Strap</th><td>'+esc(p.strap||'Not specified')+'</td></tr><tr><th>SKU</th><td>'+esc(p.sku||'Not specified')+'</td></tr><tr><th>Availability</th><td>'+Number(p.stock)+' units available</td></tr></table>';
 root.innerHTML=hero('IQA WATCHES · PRODUCT',p.name,casio?'Casio AE-1200WHL-5AV · World Time Illuminator':'Verified product details and current catalogue availability')+'<div class="route-content"><div class="route-product-layout"><div class="route-product-media"><div class="route-gallery"><div class="route-gallery-main"><img id="routeMainImage" src="'+esc(mainImage.src)+'" alt="'+esc(mainImage.alt)+'" loading="eager" onerror="this.alt=\\'Product image unavailable\\';this.style.opacity=\\'.25\\'"></div>'+thumbnails+'</div></div><div class="route-product-copy"><div class="eyebrow">'+esc(p.brand)+' · IQA WATCHES</div><h2>'+esc(p.name)+'</h2><p class="route-product-price">'+money(p.price)+' '+(p.compareAt>p.price?'<span style="font-size:15px;text-decoration:line-through;opacity:.65">'+money(p.compareAt)+'</span>':'')+'</p><span class="sample-label">PUBLISHED · '+Number(p.stock)+' AVAILABLE</span><p>'+esc(p.desc)+'</p>'+specs+'<div class="route-actions"><a class="button light" href="#shop">Back to catalogue</a><button class="button light" data-wish="'+esc(p.id)+'">♡ Wishlist</button></div><div class="route-disabled">This website is currently a product catalogue; online checkout and payment are not enabled.</div></div></div></div>';
}
function normalizeTag(value){return String(value||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
function collectionForRoute(route){
 const definitions={
  shop:{title:'Shop all watches',description:'Browse every currently approved watch with available stock.',matches:()=>true},
  men:{title:'Men’s watches',description:'Watches assigned to the Men audience in the approved catalogue.',matches:p=>normalizeTag(p.audience)==='men'},
  women:{title:'Women’s watches',description:'Watches assigned to the Women audience in the approved catalogue.',matches:p=>normalizeTag(p.audience)==='women'},
  unisex:{title:'Unisex watches',description:'Watches assigned to the Unisex audience in the approved catalogue.',matches:p=>normalizeTag(p.audience)==='unisex'},
  'new-arrivals':{title:'New arrivals',description:'Recently added watches explicitly tagged “New Arrivals” in the approved catalogue.',matches:p=>(Array.isArray(p.tags)?p.tags:[]).some(tag=>['new-arrival','new-arrivals'].includes(normalizeTag(tag)))},
  bestsellers:{title:'Bestsellers',description:'Watches explicitly tagged as bestsellers in the approved catalogue.',matches:p=>(Array.isArray(p.tags)?p.tags:[]).some(tag=>['bestseller','bestsellers','best-seller'].includes(normalizeTag(tag)))}
 };
 return definitions[route]||definitions.shop;
}
function render(){
 const raw=(location.hash||'#home').slice(1),parts=raw.split('/'),r=parts[0]||'home',arg=decodeURIComponent(parts.slice(1).join('/')||'');
 if(!root)return;
 if(r==='home'){root.classList.add('hidden');Array.from(document.getElementById('home').children).forEach(x=>{if(x!==root)x.classList.remove('hidden')});return}
 Array.from(document.getElementById('home').children).forEach(x=>{if(x!==root)x.classList.add('hidden')});
 root.classList.remove('hidden');window.scrollTo(0,0);
 if(r==='product')return product(arg);
 if(['shop','men','women','unisex','new-arrivals','bestsellers'].includes(r)){
  const collection=collectionForRoute(r);
  const matchingProducts=products.filter(collection.matches);
  root.innerHTML=hero('IQA WATCHES · COLLECTION',collection.title,collection.description)+'<div class="route-content"><div id="routeCatalogue" class="route-grid" style="margin-top:22px"></div></div>';
  const grid=$r('routeCatalogue');
  grid.innerHTML=matchingProducts.length?matchingProducts.map(p=>'<article class="route-card"><a href="#product/'+encodeURIComponent(p.id)+'"><img src="'+esc(safeImageUrl(p.image))+'" alt="'+esc(p.name)+'" loading="lazy"></a><div class="route-card-copy"><div class="product-brand">'+esc(p.brand)+'</div><h3><a href="#product/'+encodeURIComponent(p.id)+'">'+esc(p.name)+'</a></h3><p>'+money(p.price)+' · '+Number(p.stock)+' available</p><a class="button light" href="#product/'+encodeURIComponent(p.id)+'">View product</a></div></article>').join(''):'<div class="route-empty">No watches currently match this collection. Products appear here only when the Owner-approved catalogue includes the required audience or collection tag. <a href="#shop">Browse all watches</a>.</div>';
  return;
 }
 root.innerHTML=hero('IQA WATCHES','Page not found','This destination is unavailable.')+'<div class="route-content"><a class="button" href="#home">Home</a> <a class="button light" href="#shop">Shop All</a></div>';
}
window.IQA_ROUTE_COLLECTIONS=Object.freeze({normalizeTag,collectionForRoute});
window.addEventListener('hashchange',render);
window.addEventListener('load',render);
window.addEventListener('catalogue:ready',render);
document.addEventListener('click',e=>{const thumb=e.target.closest('[data-gallery-src]');if(thumb){const main=document.getElementById('routeMainImage');if(main){main.src=thumb.dataset.gallerySrc;main.alt=thumb.dataset.galleryAlt||main.alt;}document.querySelectorAll('[data-gallery-src]').forEach(button=>button.setAttribute('aria-pressed',String(button===thumb)));}const add=e.target.closest('[data-add-compare]');if(add)location.hash='comparison'});
window.renderRouteFromHash=render;
render();
})();