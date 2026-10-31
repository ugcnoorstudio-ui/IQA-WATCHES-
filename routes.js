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


let customerClient=null;
function customerAuthClient(){
 if(customerClient)return customerClient;
 const cfg=window.IQA_SUPABASE_CONFIG;
 if(!window.supabase||!cfg?.url||!cfg?.publishableKey)throw new Error('Secure customer sign-in is not configured.');
 customerClient=window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 return customerClient;
}
function infoRoute(kicker,title,description,body){
 root.innerHTML=hero(kicker,title,description)+'<div class="route-content">'+body+'</div>';
}
function routeCard(title,description,href,label='Explore'){
 return '<article class="route-feature"><h3>'+esc(title)+'</h3><p>'+esc(description)+'</p><a class="button light" href="'+href+'">'+esc(label)+'</a></article>';
}
function renderAbout(){
 infoRoute('IQA WATCHES · OUR STORY','Time, with intention.','Thoughtful watch styling for everyday life.',
 '<div class="route-columns"><div class="route-feature"><h2>Our point of view</h2><p>IQA WATCHES is built around considered design, useful details and watches chosen to complement everyday moments.</p><p>We aim to make product information clear, keep the shopping experience straightforward and treat customer trust as essential.</p></div><div class="route-feature"><h2>Our promise</h2><p>Clear product details, transparent pricing and secure shopping. Product availability, delivery commitments and policies will be shown only when verified.</p><a class="button light" href="#shop">Explore the collection</a></div></div>');
}
function renderFaq(){
 const faqs=[
 ['How do I find a watch?','Use Shop All, product search, brand and price filters. Open a product to review its available details.'],
 ['How do I add a watch to my bag?','Open a product and choose Add to Bag. Your current bag is saved in this browser.'],
 ['Can I place an order online?','Secure checkout and payment are not enabled yet. No order or payment can currently be submitted through this website.'],
 ['How can I check delivery availability?','Delivery coverage and delivery estimates are not yet connected, so we do not display unverified delivery promises.'],
 ['What is the return policy?','The return and refund policy is being finalized. Please do not assume a return window until the final policy is published.'],
 ['How do I contact support?','Customer support channels are being configured. The support form will become available after customer-data access controls are in place.'],
 ['Are all watches covered by a manufacturer warranty?','Warranty terms vary by product and seller. Check the product-specific warranty information before purchase; do not assume manufacturer coverage.']
 ];
 infoRoute('IQA WATCHES · CUSTOMER CARE','Frequently asked questions','Helpful information about browsing and the current store status.',
 '<div class="route-feature">'+faqs.map((x,i)=>'<details class="faq-item"><summary>'+esc(x[0])+'</summary><p>'+esc(x[1])+'</p></details>').join('')+'</div>');
}
function renderPolicies(){
 const entries=[
 ['Shipping','Delivery partners, shipping charges, serviceable PIN codes and delivery timelines are not yet configured. No delivery promise is currently made.'],
 ['Returns & refunds','A final return, exchange and refund policy has not yet been published. Online ordering is not enabled.'],
 ['Warranty','Warranty coverage is product- and seller-specific. Only written, verified terms supplied with a product should be relied upon.'],
 ['Privacy','Customer account and personal-data features will be enabled only with documented access controls. Do not submit sensitive information through an unverified channel.'],
 ['Terms','Online ordering and payment are not enabled. Final terms will be published before checkout is launched.'],
 ['Authenticity & sourcing','Product-specific sourcing and authenticity claims must be verified before they are displayed as guarantees.'],
 ['Watch care','Follow the care guidance supplied by the watch manufacturer for the exact model. Water resistance and battery information are model-specific.']
 ];
 infoRoute('IQA WATCHES · INFORMATION','Store policies','We will publish final policies before enabling online orders.',
 '<div class="route-feature">'+entries.map(x=>'<section class="policy-item"><h3>'+esc(x[0])+'</h3><p>'+esc(x[1])+'</p></section>').join('')+'</div>');
}
function renderContact(){
 infoRoute('IQA WATCHES · GET IN TOUCH','Contact us','We are preparing verified customer-care channels.',
 '<div class="route-feature"><h2>Customer care is being set up</h2><p>We have not published an email address, phone number or WhatsApp support line because a monitored contact channel has not yet been verified.</p><p>Support tickets will be enabled after customer ownership and privacy policies are deployed and tested.</p><a class="button light" href="#faq">Read FAQs</a></div>');
}
function renderAuth(mode='login'){
 const signup=mode==='signup';
 infoRoute('IQA WATCHES · MY ACCOUNT',signup?'Create your account':'Sign in','Secure account access powered by Supabase Authentication.',
 '<div class="route-auth-layout"><div class="route-feature"><div class="auth-tabs"><a class="chip '+(!signup?'active':'')+'" href="#login">Sign in</a><a class="chip '+(signup?'active':'')+'" href="#signup">Create account</a></div><form id="customerAuthForm" class="route-form">'+(signup?'<label>Full name<input name="full_name" autocomplete="name" required maxlength="100"></label>':'')+'<label>Email address<input name="email" type="email" autocomplete="email" required></label><label>Password<input name="password" type="password" autocomplete="'+(signup?'new-password':'current-password')+'" minlength="8" required></label><button class="button" type="submit">'+(signup?'Create account':'Sign in securely')+'</button><p class="route-note" id="authMessage" role="status" aria-live="polite"></p></form><p class="route-note">Never share your password or one-time codes. Email confirmation may be required for new accounts.</p></div><div class="route-feature"><h2>Your IQA account</h2><p>Account access is available. Orders, saved addresses and support history will appear once their customer-specific database permissions are ready.</p></div></div>');
 const form=$r('customerAuthForm');
 form.addEventListener('submit',async e=>{
  e.preventDefault();const button=form.querySelector('button[type="submit"]'),msg=$r('authMessage'),fd=new FormData(form);
  button.disabled=true;msg.textContent='Please wait…';
  try{
   const client=customerAuthClient(),email=String(fd.get('email')||'').trim(),password=String(fd.get('password')||'');
   if(signup){
    const full_name=String(fd.get('full_name')||'').trim();
    const {data,error}=await client.auth.signUp({email,password,options:{data:{full_name}}});
    if(error)throw error;
    msg.textContent=data.session?'Account created. Opening your account…':'Account request created. Check your email to confirm the address, then sign in.';
    if(data.session)location.hash='account';
   }else{
    const {error}=await client.auth.signInWithPassword({email,password});if(error)throw error;
    location.hash='account';
   }
  }catch(err){msg.textContent=err.message||'Sign-in could not be completed.';}
  finally{button.disabled=false;}
 });
}
async function renderAccount(){
 try{
  const client=customerAuthClient(),{data,error}=await client.auth.getSession();if(error)throw error;
  const user=data.session?.user;
  if(!user){renderAuth('login');return;}
  const meta=user.user_metadata||{};
  infoRoute('IQA WATCHES · MY IQA','Welcome'+(meta.full_name?' back, '+meta.full_name.split(' ')[0]:''),'Your customer account and preferences.',
   '<div class="route-columns"><div class="route-feature"><h2>Profile</h2><form id="customerProfileForm" class="route-form"><label>Full name<input name="full_name" maxlength="100" value="'+esc(meta.full_name||'')+'"></label><label>Email address<input value="'+esc(user.email||'')+'" disabled></label><label>Phone number<input name="phone" type="tel" maxlength="20" value="'+esc(meta.phone||'')+'"></label><button class="button" type="submit">Save profile</button><p class="route-note" id="profileMessage" role="status"></p></form><button class="button light" id="customerSignOut" type="button">Sign out</button></div><div class="route-feature"><h2>My IQA</h2><ul class="account-links"><li><a href="#orders">My orders & order details</a></li><li><a href="#tracking">Track an order</a></li><li><a href="#addresses">Saved addresses</a></li><li><a href="#wishlist">Wishlist</a></li><li><a href="#reviews">My reviews</a></li><li><a href="#returns">Returns & refunds</a></li><li><a href="#support">Customer support</a></li><li><a href="#coupons">My coupons</a></li></ul></div></div>');
  $r('customerProfileForm').addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.currentTarget),msg=$r('profileMessage');try{const {error}=await client.auth.updateUser({data:{full_name:String(fd.get('full_name')||'').trim(),phone:String(fd.get('phone')||'').trim()}});if(error)throw error;msg.textContent='Profile details saved securely.';}catch(err){msg.textContent=err.message||'Profile could not be saved.';}});
  $r('customerSignOut').addEventListener('click',async()=>{const {error}=await client.auth.signOut();if(error){$r('profileMessage').textContent=error.message;return;}location.hash='login';});
 }catch(err){infoRoute('IQA WATCHES · MY ACCOUNT','Account unavailable','Secure customer authentication could not be initialized.','<div class="route-disabled">'+esc(err.message||'Please try again later.')+'</div>');}
}
function renderCustomerDataPage(route){
 const copy={
  orders:['My orders','Your order history will appear here after customer-owned order access and secure order creation are enabled.'],
  tracking:['Track an order','Live courier tracking is not connected yet. No shipment status will be invented.'],
  addresses:['Saved addresses','Address storage is not enabled yet. We will not store personal addresses in browser-only storage.'],
  reviews:['My reviews','Customer review submission and verified-purchase checks are not enabled yet.'],
  support:['Customer support','Support ticket creation is waiting for customer ownership and privacy policies.'],
  returns:['Returns & refunds','Return requests will be enabled after order ownership checks and the final return policy are deployed.'],
  coupons:['My coupons','Customer-specific coupon access is not available yet.'],
  offers:['Offers & rewards','Only verified active offers will be shown here. No live offers are currently published.']
 };
 const item=copy[route]||['My account','Customer account information'];
 infoRoute('IQA WATCHES · MY IQA',item[0],item[1],'<div class="route-feature"><p>'+esc(item[1])+'</p><a class="button" href="#account">Go to My Account</a></div>');
}
function renderSearch(){
 const draw=(query='',brand='All',price='all')=>{
  const q=query.trim().toLowerCase();
  const list=products.filter(p=>{
   const text=[p.name,p.brand,p.category,p.style,p.sku,p.desc].join(' ').toLowerCase();
   const matchText=!q||text.includes(q),matchBrand=brand==='All'||p.brand===brand;
   const matchPrice=price==='all'||(price==='under1000'&&p.price<1000)||(price==='1000to2500'&&p.price>=1000&&p.price<=2500)||(price==='over2500'&&p.price>2500);
   return matchText&&matchBrand&&matchPrice;
  });
  const host=$r('searchResults');host.innerHTML=list.length?list.map(p=>'<article class="route-card"><a href="#product/'+encodeURIComponent(p.id)+'"><img src="'+esc(safeImageUrl(p.image))+'" alt="'+esc(p.name)+'"></a><div class="route-card-copy"><div class="product-brand">'+esc(p.brand)+'</div><h3><a href="#product/'+encodeURIComponent(p.id)+'">'+esc(p.name)+'</a></h3><p>'+money(p.price)+'</p><a class="button light" href="#product/'+encodeURIComponent(p.id)+'">View product</a></div></article>').join(''):'<div class="route-empty">No matching published products. Try a different search or filter.</div>';
  $r('searchCount').textContent=list.length+' matching products';
 };
 const brands=[...new Set(products.map(p=>p.brand).filter(Boolean))].sort();
 infoRoute('IQA WATCHES · DISCOVER','Search the collection','Find a watch by name, brand, style or model number.',
 '<div class="toolbar"><input id="routeSearchInput" type="search" placeholder="Search watches, brands or model…" aria-label="Search products"><select id="routeBrand"><option value="All">All brands</option>'+brands.map(b=>'<option value="'+esc(b)+'">'+esc(b)+'</option>').join('')+'</select><select id="routePrice"><option value="all">Any price</option><option value="under1000">Under ₹1,000</option><option value="1000to2500">₹1,000–₹2,500</option><option value="over2500">Over ₹2,500</option></select></div><p class="results-count" id="searchCount"></p><div id="searchResults" class="route-grid"></div>');
 const update=()=>draw($r('routeSearchInput').value,$r('routeBrand').value,$r('routePrice').value);
 $r('routeSearchInput').addEventListener('input',update);$r('routeBrand').addEventListener('change',update);$r('routePrice').addEventListener('change',update);update();
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
 if(r==='login')return renderAuth('login');
 if(r==='signup')return renderAuth('signup');
 if(r==='account'||r==='profile')return renderAccount();
 if(r==='orders'||r==='tracking'||r==='addresses'||r==='reviews'||r==='support'||r==='returns'||r==='coupons'||r==='offers')return renderCustomerDataPage(r);
 if(r==='search')return renderSearch();
 if(r==='about'||r==='story')return renderAbout();
 if(r==='faq')return renderFaq();
 if(r==='policies')return renderPolicies();
 if(r==='contact')return renderContact();

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