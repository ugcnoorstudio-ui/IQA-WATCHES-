(function(){
const root=document.getElementById('routeView');
const $r=id=>document.getElementById(id);
const esc=v=>typeof escapeHtml==='function'?escapeHtml(v):String(v??'');
function hero(k,t,d){return '<header class="route-hero"><div class="eyebrow">'+esc(k)+'</div><h1>'+esc(t)+'</h1><p>'+esc(d)+'</p></header>'}
function product(id){
 const p=products.find(x=>x.id===id);
 if(!p){root.innerHTML=hero('IQA WATCHES · PRODUCT','Product not found','This product is not currently in the approved catalogue.')+'<div class="route-content"><a class="button" href="#shop">Shop All</a></div>';return}
 const casio=p.sku==='CAS-AE1200WHL5AV-001'||p.sku==='CAS-AE1200WHL5AVDF-001'||p.sku==='AE-1200WHL-5AV'||p.sku==='AE-1200WHL-5AVDF';
 const galleryItems=(Array.isArray(p.gallery)?p.gallery:[]).map(item=>({src:safeImageUrl(item.src),alt:String(item.alt||p.name)})).filter(item=>item.src);
 if(!galleryItems.length&&p.image){const fallback=safeImageUrl(p.image);if(fallback)galleryItems.push({src:fallback,alt:p.imageAlt||p.name})}
 const primaryIndex=galleryItems.findIndex(item=>item.src===safeImageUrl(p.image));
 if(primaryIndex>0)galleryItems.unshift(galleryItems.splice(primaryIndex,1)[0]);
 const mainImage=galleryItems[0]||{src:'',alt:p.name};
 const thumbnails=galleryItems.length>1?'<div class="route-gallery-thumbs" aria-label="Product images">'+galleryItems.map((item,index)=>'<button type="button" class="route-gallery-thumb" data-gallery-src="'+esc(item.src)+'" data-gallery-alt="'+esc(item.alt)+'" aria-pressed="'+(index===0?'true':'false')+'" aria-label="Show product image '+(index+1)+'"><img src="'+esc(item.src)+'" alt="" loading="lazy"></button>').join('')+'</div>':'';
 const specs=casio?'<table class="route-specs"><tr><th>Display</th><td>Digital</td></tr><tr><th>Case size</th><td>45 × 42.1 × 12.5 mm</td></tr><tr><th>Case material</th><td>Resin</td></tr><tr><th>Band</th><td>Brown leather</td></tr><tr><th>Water resistance</th><td>100 metres</td></tr><tr><th>Battery life</th><td>Approx. 10 years (CR2025)</td></tr><tr><th>Functions</th><td>World Time, stopwatch, countdown timer, 5 alarms, LED light, auto-calendar</td></tr><tr><th>Availability</th><td>'+Number(p.stock)+' units in current catalogue stock</td></tr></table><p class="route-note">Official Casio India product reference lists MRP ₹4,495. IQA WATCHES selling price: ₹1,200. Warranty and sourcing documentation should be confirmed with the seller before purchase.</p>':'<table class="route-specs"><tr><th>Brand</th><td>'+esc(p.brand)+'</td></tr><tr><th>Category</th><td>'+esc(p.category)+'</td></tr><tr><th>Style</th><td>'+esc(p.style)+'</td></tr><tr><th>Colour</th><td>'+esc(p.colour||'Not specified')+'</td></tr><tr><th>Strap</th><td>'+esc(p.strap||'Not specified')+'</td></tr><tr><th>SKU</th><td>'+esc(p.sku||'Not specified')+'</td></tr><tr><th>Availability</th><td>'+Number(p.stock)+' units available</td></tr></table>';
 const related=products.filter(item=>item.id!==p.id).slice(0,4);
 const recommendations='<section class="route-recommendations"><div class="eyebrow">THE IQA EDIT</div><h2>You May Also Like</h2><div class="route-grid">'+(related.length?related.map(item=>'<article class="route-card"><a href="#product/'+encodeURIComponent(item.id)+'"><img src="'+esc(safeImageUrl(item.image))+'" alt="'+esc(item.imageAlt||item.name)+'" loading="lazy"></a><div class="route-card-copy"><div class="product-brand">'+esc(item.brand)+'</div><h3><a href="#product/'+encodeURIComponent(item.id)+'">'+esc(item.name)+'</a></h3><p>'+money(item.price)+'</p><a class="button light" href="#product/'+encodeURIComponent(item.id)+'">View details</a></div></article>').join(''):'<p class="route-note">More watches coming soon.</p>')+'</div></section>';
 root.innerHTML=hero('IQA WATCHES · PRODUCT',p.name,casio?'Casio AE-1200WHL-5AV · World Time Illuminator':'Verified product details and current catalogue availability')+'<div class="route-content"><div class="route-product-layout"><div class="route-product-media"><div class="route-gallery"><div class="route-gallery-main"><img id="routeMainImage" src="'+esc(mainImage.src)+'" alt="'+esc(mainImage.alt)+'" loading="eager" onerror="this.alt=\'Product image unavailable\';this.style.opacity=\'.25\'"></div>'+thumbnails+'</div></div><div class="route-product-copy"><div class="eyebrow">'+esc(p.brand)+' · IQA WATCHES</div><h2>'+esc(p.name)+'</h2><p class="route-product-price">'+money(p.price)+' '+(p.compareAt>p.price?'<span style="font-size:15px;text-decoration:line-through;opacity:.65">'+money(p.compareAt)+'</span>':'')+'</p><span class="sample-label">PUBLISHED · '+Number(p.stock)+' AVAILABLE</span><p>'+esc(p.desc)+'</p>'+specs+'<div class="route-actions"><a class="button light" href="#shop">Back to catalogue</a><button class="button" type="button" data-add="'+esc(p.id)+'">Add to bag</button><a class="button light" href="#bag">View bag</a><button class="button light" data-wish="'+esc(p.id)+'">♡ Wishlist</button></div><div class="route-disabled">You can add this product to your bag. Secure checkout and payment are not enabled yet.</div></div></div></div>'+recommendations;
}

function renderBagRoute(){
 const entries=Object.entries(cart||{}).map(([id,qty])=>({p:products.find(x=>x.id===id),qty})).filter(x=>x.p);
 const subtotal=entries.reduce((sum,x)=>sum+x.p.price*x.qty,0);
 const rows=entries.map(({p,qty})=>'<div class="cart-row"><div class="cart-thumb"><img src="'+esc(safeImageUrl(p.image))+'" alt="'+esc(p.name)+'"></div><div><div class="product-brand">'+esc(p.brand)+'</div><h3>'+esc(p.name)+'</h3><p>'+money(p.price)+' each</p><div class="qty"><button data-qty="'+esc(p.id)+'" data-delta="-1">−</button><span>'+qty+'</span><button data-qty="'+esc(p.id)+'" data-delta="1">+</button></div><button class="remove" data-remove="'+esc(p.id)+'">Remove</button></div><strong>'+money(p.price*qty)+'</strong></div>').join('');
 root.innerHTML=hero('IQA WATCHES · SHOPPING BAG','Your shopping bag','Review your selected pieces before continuing.')+'<div class="route-content"><div class="route-feature">'+(rows||'<div class="empty-state"><h2>Your bag is empty</h2><p>Explore the collection and add a watch to your bag.</p><a class="button" href="#shop">Explore Watches</a></div>')+'</div>'+(entries.length?'<div class="route-columns"><div class="route-feature"><h2>Order summary</h2><div class="total-row"><span>Subtotal</span><strong>'+money(subtotal)+'</strong></div><div class="total-row"><span>Shipping</span><span>Calculated at checkout</span></div><div class="total-row"><strong>Estimated total</strong><strong>'+money(subtotal)+'</strong></div><a class="button" href="#checkout">Continue to checkout</a><p class="route-note">Secure checkout and payment are not enabled yet.</p></div><div class="route-feature"><h2>Shopping with IQA</h2><p class="route-note">Your bag is currently saved in this browser preview.</p><a class="button light" href="#shop">Continue shopping</a></div></div>':'')+'</div>';
}
function renderWishlistRoute(){
 const items=(wishlist||[]).map(id=>products.find(p=>p.id===id)).filter(Boolean);
 root.innerHTML=hero('IQA WATCHES · YOUR EDIT','Wishlist','Keep your favourite pieces together.')+'<div class="route-content"><div class="route-grid">'+(items.length?items.map(p=>'<article class="route-card"><a href="#product/'+encodeURIComponent(p.id)+'"><img src="'+esc(safeImageUrl(p.image))+'" alt="'+esc(p.name)+'"></a><div class="route-card-copy"><div class="product-brand">'+esc(p.brand)+'</div><h3><a href="#product/'+encodeURIComponent(p.id)+'">'+esc(p.name)+'</a></h3><p>'+money(p.price)+'</p><div class="route-actions"><button class="button" data-add="'+esc(p.id)+'">Add to bag</button><button class="button light" data-wish="'+esc(p.id)+'">Remove</button></div></div></article>').join(''):'<div class="route-empty">Your wishlist is empty. Save products using the heart icon.<br><a class="button" href="#shop">Discover watches</a></div>')+'</div></div>';
}
function renderCheckoutRoute(){
 root.innerHTML=hero('IQA WATCHES · SECURE CHECKOUT','Checkout','Your order is not placed until secure checkout is enabled.')+'<div class="route-content"><div class="route-disabled"><strong>Checkout is not available yet.</strong><br>Server-side stock reservation, verified delivery charges, order creation, payment callbacks and duplicate-order protection must be tested first. No payment or order can be submitted from this preview.</div><a class="button light" href="#bag">Return to bag</a></div>';
}

function render(){
 const raw=(location.hash||'#home').slice(1),parts=raw.split('/'),r=parts[0]||'home',arg=decodeURIComponent(parts.slice(1).join('/')||'');
 if(!root)return;
 if(r==='home'){root.classList.add('hidden');Array.from(document.getElementById('home').children).forEach(x=>{if(x!==root)x.classList.remove('hidden')});return}
 Array.from(document.getElementById('home').children).forEach(x=>{if(x!==root)x.classList.add('hidden')});
 root.classList.remove('hidden');window.scrollTo(0,0);
 if(r==='product')return product(arg);
 if(r==='bag'||r==='cart')return renderBagRoute();
 if(r==='wishlist')return renderWishlistRoute();
 if(r==='checkout')return renderCheckoutRoute();
 if(['shop','men','women','unisex','new-arrivals','bestsellers'].includes(r)){
  root.innerHTML=hero('IQA WATCHES · COLLECTION','Shop watches','Browse all currently approved products in the live catalogue.')+'<div class="route-content"><div id="routeCatalogue" class="route-grid" style="margin-top:22px"></div></div>';
  const grid=$r('routeCatalogue');
  grid.innerHTML=products.length?products.map(p=>'<article class="route-card"><a href="#product/'+encodeURIComponent(p.id)+'"><img src="'+esc(safeImageUrl(p.image))+'" alt="'+esc(p.name)+'"></a><div class="route-card-copy"><div class="product-brand">'+esc(p.brand)+'</div><h3><a href="#product/'+encodeURIComponent(p.id)+'">'+esc(p.name)+'</a></h3><p>'+money(p.price)+' · '+Number(p.stock)+' available</p><a class="button light" href="#product/'+encodeURIComponent(p.id)+'">View product</a></div></article>').join(''):'<div class="route-empty">No approved products are currently available.</div>';
  return;
 }
 root.innerHTML=hero('IQA WATCHES','Page not found','This destination is unavailable.')+'<div class="route-content"><a class="button" href="#home">Home</a> <a class="button light" href="#shop">Shop All</a></div>';
}
document.addEventListener('click',e=>{if(e.target.closest('[data-qty],[data-remove],[data-add],[data-wish]'))setTimeout(()=>{const route=(location.hash||'').slice(1);if(['bag','cart','wishlist'].includes(route))render();},0);});
window.addEventListener('hashchange',render);
window.addEventListener('load',render);
window.addEventListener('catalogue:ready',render);
document.addEventListener('click',e=>{const thumb=e.target.closest('[data-gallery-src]');if(thumb){const main=document.getElementById('routeMainImage');if(main){main.src=thumb.dataset.gallerySrc;main.alt=thumb.dataset.galleryAlt||main.alt;}document.querySelectorAll('[data-gallery-src]').forEach(button=>button.setAttribute('aria-pressed',String(button===thumb)));}const add=e.target.closest('[data-add-compare]');if(add)location.hash='comparison'});
window.renderRouteFromHash=render;
render();
})();