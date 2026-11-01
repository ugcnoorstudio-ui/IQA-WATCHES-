(function(){
'use strict';
const KEY='iqa-customer-storefront-v1';
const $=id=>document.getElementById(id);
const esc=v=>typeof escapeHtml==='function'?escapeHtml(v):String(v??'');
const money=v=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(v||0));
const root=()=>document.getElementById('routeView');
const saved=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const state=saved(KEY,{compare:[],recent:[]});
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(_){}}
function hero(title,sub){return '<header class="route-hero"><div class="eyebrow">IQA WATCHES · CUSTOMER STORE</div><h1>'+esc(title)+'</h1><p>'+esc(sub)+'</p></header>'}
function shell(title,sub,body){const r=root();if(!r)return;r.classList.remove('hidden');r.innerHTML=hero(title,sub)+'<div class="route-content">'+body+'</div>';window.scrollTo(0,0)}
function card(p){return '<article class="route-card"><a href="#product/'+encodeURIComponent(p.id)+'" data-view="'+esc(p.id)+'"><img src="'+esc(safeImageUrl(p.image))+'" alt="'+esc(p.imageAlt||p.name)+'" loading="lazy"></a><div class="route-card-copy"><div class="product-brand">'+esc(p.brand||'IQA WATCHES')+'</div><h3><a href="#product/'+encodeURIComponent(p.id)+'" data-view="'+esc(p.id)+'">'+esc(p.name)+'</a></h3><p>'+money(p.price)+'</p><div class="route-actions"><a class="button light" href="#product/'+encodeURIComponent(p.id)+'" data-view="'+esc(p.id)+'">Product details</a><button class="button light" type="button" data-customer-compare="'+esc(p.id)+'">'+(state.compare.includes(p.id)?'Remove compare':'Compare')+'</button></div></div></article>'}
function productList(items){return '<div class="route-grid">'+(items.length?items.map(card).join(''):'<div class="route-empty">No matching products are currently published.</div>')+'</div>'}
function renderCompare(){
 const items=state.compare.map(id=>(typeof products!=='undefined'?products:[]).find(p=>p.id===id)).filter(Boolean);
 shell('Compare watches','Compare up to four watches side by side.',
 '<div class="route-feature"><p>Select Compare on product cards to add watches here. You can compare up to four products.</p><button class="button light" id="clearCustomerCompare" type="button">Clear comparison</button></div>'+
 (items.length?'<div class="route-feature" style="overflow-x:auto"><table class="route-specs"><thead><tr><th>Feature</th>'+items.map(p=>'<th>'+esc(p.name)+'<br><button class="button light" type="button" data-remove-customer-compare="'+esc(p.id)+'">Remove</button></th>').join('')+'</tr></thead><tbody>'+
 [['Brand',p=>p.brand],['Price',p=>money(p.price)],['Category',p=>p.category],['Style',p=>p.style],['Colour',p=>p.colour],['Strap',p=>p.strap],['SKU',p=>p.sku],['Available units',p=>p.stock]].map(([label,fn])=>'<tr><th>'+label+'</th>'+items.map(p=>'<td>'+esc(fn(p)??'Not specified')+'</td>').join('')+'</tr>').join('')+
 '</tbody></table></div>':'<div class="route-empty">No watches selected yet. <a href="#shop">Browse the collection</a>.</div>'));
 const clear=$('clearCustomerCompare');if(clear)clear.addEventListener('click',()=>{state.compare=[];persist();renderCompare()});
 const table=root()?.querySelector('[data-remove-customer-compare]')?.closest('table');
 if(table)table.addEventListener('click',e=>{const button=e.target.closest('[data-remove-customer-compare]');if(!button)return;state.compare=state.compare.filter(id=>id!==button.dataset.removeCustomerCompare);persist();renderCompare()});
}
function renderBrands(){
 const groups=[...new Set((typeof products!=='undefined'?products:[]).map(p=>p.brand).filter(Boolean))].sort();
 shell('Shop by brand','Discover the brands featured in our collection.',
 '<div class="route-grid">'+groups.map(b=>{const count=(typeof products!=='undefined'?products:[]).filter(p=>p.brand===b).length;return '<article class="route-feature"><h2>'+esc(b)+'</h2><p>'+count+' available catalogue '+(count===1?'watch':'watches')+'</p><a class="button light" href="#brand/'+encodeURIComponent(b)+'">View brand</a></article>'}).join('')+'</div>');
}
function renderBrand(name){const items=(typeof products!=='undefined'?products:[]).filter(p=>p.brand===name);shell(name,'Explore '+name+' watches.',productList(items))}
function renderCategories(){
 const groups=[...new Set((typeof products!=='undefined'?products:[]).map(p=>p.category).filter(Boolean))].sort();
 shell('Shop by category','Choose a category to explore matching watches.',
 '<div class="route-grid">'+groups.map(c=>{const count=(typeof products!=='undefined'?products:[]).filter(p=>p.category===c).length;return '<article class="route-feature"><h2>'+esc(c)+'</h2><p>'+count+' catalogue '+(count===1?'watch':'watches')+'</p><a class="button light" href="#category/'+encodeURIComponent(c)+'">Explore category</a></article>'}).join('')+'</div>');
}
function renderCategory(name){const items=(typeof products!=='undefined'?products:[]).filter(p=>p.category===name||p.audience===name||p.style===name);shell(name,'Watches listed under '+name+'.',productList(items))}
function renderRecent(){
 const items=state.recent.map(id=>(typeof products!=='undefined'?products:[]).find(p=>p.id===id)).filter(Boolean);
 shell('Recently viewed','Your recently opened watches on this device.',productList(items));
}
function renderDelivery(){
 shell('Delivery availability','Check delivery information for your PIN code. Enter your PIN code and we will help confirm delivery availability, charges and estimated timelines.',
 '<div class="route-columns"><div class="route-feature"><h2>Check your PIN code</h2><form id="deliveryCheckForm" class="route-form"><label>6-digit PIN code<input name="pin" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required placeholder="Enter delivery PIN code"></label><button class="button" type="submit">Check availability</button><p id="deliveryCheckMessage" role="status" aria-live="polite"></p></form></div><div class="route-feature"><h2>Delivery status</h2><p id="deliveryConfigStatus">Please message us on WhatsApp to confirm delivery availability, charges and estimated timelines for your PIN code.</p><a class="button light" href="#policies">Read shipping policy</a></div></div>');
 const form=$('deliveryCheckForm');form.addEventListener('submit',async e=>{
  e.preventDefault();const pin=String(new FormData(form).get('pin')||'').trim(),msg=$('deliveryCheckMessage');
  if(!/^[0-9]{6}$/.test(pin)){msg.textContent='Please enter a valid 6-digit PIN code.';return;}
  msg.textContent='We cannot confirm delivery automatically just yet. Please message us on WhatsApp to check delivery for '+pin+'. .';
 });
}
function renderOffers(){
 shell('Offers & promotions','Browse currently published promotions.',
 '<div class="route-feature"><p>Explore the offers listed here. Coupon validity, minimum order value and eligibility will be confirmed at checkout.</p><a class="button light" href="#coupons">My coupons</a></div>');
}

function installCustomerNav(){
 // Keep the homepage header clean. Category chips and the brand filter remain
 // available in the Shop section; do not inject a second navigation shortcuts row.
}
function renderRoute(){
 const raw=(location.hash||'#home').slice(1),parts=raw.split('/'),route=parts[0],arg=decodeURIComponent(parts.slice(1).join('/')||'');
 if(route==='compare')return renderCompare();
 if(route==='brands')return renderBrands();
 if(route==='brand')return renderBrand(arg);
 if(route==='categories')return renderCategories();
 if(route==='category')return renderCategory(arg);
 if(route==='recently-viewed')return renderRecent();
 if(route==='delivery')return renderDelivery();
 if(route==='promotions')return renderOffers();
}
function recordViewed(){
 const match=(location.hash||'').match(/^#product\/(.+)$/);if(!match)return;
 let id;try{id=decodeURIComponent(match[1])}catch(_){return}
 if(!(typeof products!=='undefined'?products:[]).some(p=>p.id===id))return;
 state.recent=[id,...state.recent.filter(x=>x!==id)].slice(0,12);persist();
}
window.addEventListener('iqa:product-viewed',event=>{
 const id=event.detail?.productId;
 if(!id||!(typeof products!=='undefined'?products:[]).some(p=>p.id===id))return;
 state.recent=[id,...state.recent.filter(x=>x!==id)].slice(0,12);persist();
});
function addCompareButtons(){
 document.querySelectorAll('.product-card,.route-card').forEach(el=>{
  const link=el.querySelector('a[href^="#product/"]');if(!link)return;
  const id=decodeURIComponent(link.getAttribute('href').split('/').slice(1).join('/'));
  if(!id||el.querySelector('[data-customer-compare]'))return;
  const target=el.querySelector('.card-actions,.route-card-copy')||el;
  const btn=document.createElement('button');btn.type='button';btn.className='button light';btn.dataset.customerCompare=id;btn.textContent=state.compare.includes(id)?'Remove compare':'Compare';
  target.appendChild(btn);
 });
}
document.addEventListener('click',e=>{
 const btn=e.target.closest('[data-customer-compare]');if(!btn)return;
 const id=btn.dataset.customerCompare;
 if(state.compare.includes(id))state.compare=state.compare.filter(x=>x!==id);
 else if(state.compare.length>=4){if(typeof toast==='function')toast('Compare up to four watches at a time.');return}
 else state.compare.push(id);
 persist();document.querySelectorAll('[data-customer-compare="'+CSS.escape(id)+'"]').forEach(x=>x.textContent=state.compare.includes(id)?'Remove compare':'Compare');
 if((location.hash||'')==='#compare')renderCompare();
});
const observer=new MutationObserver(()=>addCompareButtons());
if(document.body)observer.observe(document.body,{childList:true,subtree:true});
window.addEventListener('storage',event=>{
 if(event.key!==KEY&&event.key!==null)return;
 const next=saved(KEY,{compare:[],recent:[]});
 const clean=(values,limit)=>Array.isArray(values)?values.filter((id,index,list)=>typeof id==='string'&&id.length>0&&id.length<=128&&list.indexOf(id)===index).slice(0,limit):[];
 state.compare=clean(next.compare,4);state.recent=clean(next.recent,12);
 if((location.hash||'')==='#compare')renderCompare();
 if((location.hash||'')==='#recently-viewed')renderRecent();
 addCompareButtons();
});
window.addEventListener('hashchange',()=>{recordViewed();renderRoute();});
window.addEventListener('load',()=>{installCustomerNav();recordViewed();renderRoute();addCompareButtons();});
window.addEventListener('catalogue:ready',()=>{const valid=state.compare.filter(id=>(typeof products!=='undefined'?products:[]).some(p=>p.id===id));if(valid.length!==state.compare.length){state.compare=valid;persist()}renderRoute();addCompareButtons();});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{installCustomerNav();renderRoute();addCompareButtons()});else{installCustomerNav();renderRoute();addCompareButtons()}
})();
