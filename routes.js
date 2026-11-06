(function(){
const root=document.getElementById('routeView');
const $r=id=>document.getElementById(id);
const esc=v=>typeof escapeHtml==='function'?escapeHtml(v):String(v??'');
function hero(k,t,d){return '<header class="route-hero"><div class="eyebrow">'+esc(k)+'</div><h1>'+esc(t)+'</h1><p>'+esc(d)+'</p></header>'}
function product(id){
 if(typeof catalogueState!=='undefined'&&catalogueState==='loading'){
  root.innerHTML=hero('IQA WATCHES · PRODUCT','Loading product details','Fetching the latest approved product information and availability.')+'<div class="route-content"><div class="route-feature" role="status" aria-live="polite">Please wait while the product catalogue loads…</div></div>';return;
 }
 if(typeof catalogueState!=='undefined'&&catalogueState==='error'){
  root.innerHTML=hero('IQA WATCHES · PRODUCT','Product temporarily unavailable','The approved product catalogue could not be loaded.')+'<div class="route-content"><div class="route-disabled" role="alert">Please refresh the page or return to the collection. No purchase has been created.</div><a class="button light" href="#shop">Back to Shop</a></div>';return;
 }
 const p=products.find(x=>x.id===id);
 if(!p){root.innerHTML=hero('IQA WATCHES · PRODUCT','Product not found','This product is not currently in the approved catalogue.')+'<div class="route-content"><a class="button" href="#shop">Shop All</a></div>';return}
 const casio=p.sku==='CAS-AE1200WHL5AV-001'||p.sku==='CAS-AE1200WHL5AVDF-001'||p.sku==='AE-1200WHL-5AV'||p.sku==='AE-1200WHL-5AVDF';
 const galleryItems=(Array.isArray(p.gallery)?p.gallery:[]).map(item=>({src:safeImageUrl(item.src),alt:String(item.alt||p.name)})).filter(item=>item.src);
 if(!galleryItems.length&&p.image){const fallback=safeImageUrl(p.image);if(fallback)galleryItems.push({src:fallback,alt:p.imageAlt||p.name})}
 const primaryIndex=galleryItems.findIndex(item=>item.src===safeImageUrl(p.image));
 if(primaryIndex>0)galleryItems.unshift(galleryItems.splice(primaryIndex,1)[0]);
 const mainImage=galleryItems[0]||{src:'',alt:p.name};
 const thumbnails=galleryItems.length>1?'<div class="route-gallery-thumbs" aria-label="Product images">'+galleryItems.map((item,index)=>'<button type="button" class="route-gallery-thumb" data-gallery-src="'+esc(item.src)+'" data-gallery-alt="'+esc(item.alt)+'" aria-pressed="'+(index===0?'true':'false')+'" aria-label="Show product image '+(index+1)+'"><img src="'+esc(item.src)+'" alt="" loading="lazy"></button>').join('')+'</div>':'';
 const specRows=[['Brand',p.brand],['Category',p.category],['Watch type',p.style],['Audience',p.audience],['Dial colour',p.dial],['Colour',p.colour],['Case diameter',p.caseDiameter?p.caseDiameter+' mm':''],['Case thickness',p.caseThickness?p.caseThickness+' mm':''],['Lug-to-lug',p.lugToLug?p.lugToLug+' mm':''],['Case material',p.caseMaterial],['Strap',p.strap],['Strap width',p.strapWidth?p.strapWidth+' mm':''],['Movement',p.movement],['Water resistance',p.waterResistance],['Warranty',p.warranty],['SKU',p.sku]].filter(([,value])=>value!==null&&value!==undefined&&String(value).trim()!=='');
 const specs='<section class="route-product-section"><h3>Specifications</h3><table class="route-specs"><tbody>'+specRows.map(([label,value])=>'<tr><th>'+esc(label)+'</th><td>'+esc(value)+'</td></tr>').join('')+'</tbody></table></section>';
 const related=products.filter(item=>item.id!==p.id&&Number(item.stock)>0).map(item=>({item,score:(item.category===p.category?4:0)+(item.brand===p.brand?3:0)+(item.style===p.style?2:0)+(item.audience===p.audience?1:0)})).sort((a,b)=>b.score-a.score||Math.abs(Number(a.item.price)-Number(p.price))-Math.abs(Number(b.item.price)-Number(p.price))).slice(0,4).map(x=>x.item);
 const recommendations='<section class="route-recommendations"><div class="eyebrow">THE IQA EDIT</div><h2>You May Also Like</h2><p class="route-note">Suggestions are selected from currently published, in-stock watches with similar catalogue attributes.</p><div class="route-grid">'+(related.length?related.map(item=>'<article class="route-card"><a href="#product/'+encodeURIComponent(item.id)+'" data-view="'+esc(item.id)+'"><img src="'+esc(safeImageUrl(item.image))+'" alt="'+esc(item.imageAlt||item.name)+'" loading="lazy"></a><div class="route-card-copy"><div class="product-brand">'+esc(item.brand)+'</div><h3><a href="#product/'+encodeURIComponent(item.id)+'" data-view="'+esc(item.id)+'">'+esc(item.name)+'</a></h3><p>'+money(item.price)+' · '+Number(item.stock)+' available</p><div class="route-actions"><a class="button light" href="#product/'+encodeURIComponent(item.id)+'" data-view="'+esc(item.id)+'">View details</a><button class="button" type="button" data-add="'+esc(item.id)+'">Add to bag</button></div></div></article>').join(''):'<p class="route-note">More watches coming soon.</p>')+'</div></section>';
 const discount=p.compareAt>p.price?Math.round((p.compareAt-p.price)/p.compareAt*100):0;
 const ratingNote='<div class="route-rating-note" aria-label="Customer rating information"><strong>Not yet rated</strong><span>Customer ratings will appear after verified reviews are approved.</span></div>';
 const description='<section class="route-product-description"><h3>About this watch</h3><p>'+esc(p.desc||'A detailed description for this watch has not yet been provided by the store.')+'</p></section>';
 const assurance='<div class="route-product-assurance"><article><strong>Catalogue checked</strong><span>Product details are sourced from the approved store catalogue.</span></article><article><strong>Availability</strong><span>'+Number(p.stock)+' unit'+(Number(p.stock)===1?'':'s')+' shown in the latest catalogue update.</span></article><article><strong>Delivery information</strong><span>Delivery fee and ETA are not yet configured for checkout.</span></article><article><strong>Warranty</strong><span>'+esc(p.warranty||'Not verified in the catalogue.')+'</span></article></div>';
 const reviewSummary='<section class="route-review-summary"><h3>Customer reviews</h3><p>No published customer reviews are available for this watch yet. We will show a star rating only after genuine customer reviews have been approved.</p></section>';
 const discountMarkup=discount?'<span class="sample-label">'+discount+'% below listed MRP</span>':'<span class="sample-label">APPROVED CATALOGUE · '+Number(p.stock)+' AVAILABLE</span>';
 root.innerHTML=hero('THE IQA COLLECTION',p.name,'Explore the gallery, current catalogue price and verified product specifications.')+'<div class="route-content route-product-page"><nav class="route-product-breadcrumb" aria-label="Breadcrumb"><a href="#home">Home</a><span aria-hidden="true">/</span><a href="#shop">Shop all</a><span aria-hidden="true">/</span><span aria-current="page">'+esc(p.name)+'</span></nav><div class="route-product-layout"><div class="route-product-media"><div class="route-gallery"><div class="route-gallery-main"><img id="routeMainImage" role="button" tabindex="0" aria-label="Open full-screen product image" src="'+esc(mainImage.src)+'" alt="'+esc(mainImage.alt)+'" loading="eager" onerror="this.alt=&#39;Product image unavailable&#39;;this.style.opacity=&#39;.25&#39;"></div>'+thumbnails+'</div></div><div class="route-product-copy"><div class="eyebrow">'+esc(p.brand)+' · IQA WATCHES</div><h2>'+esc(p.name)+'</h2><p class="route-product-price">'+money(p.price)+' '+(p.compareAt>p.price?'<del>'+money(p.compareAt)+'</del>':'')+'</p>'+discountMarkup+ratingNote+description+'<div class="route-purchase-actions"><button class="button route-add-button" type="button" data-add="'+esc(p.id)+'">Add to Cart</button><button class="button route-buy-button" type="button" data-buy-now="'+esc(p.id)+'">Buy Now</button><button class="button light route-wish-button" type="button" data-wish="'+esc(p.id)+'">♡ Wishlist</button></div>'+specs+assurance+reviewSummary+'</div></div>'+recommendations+'</div>';
}

function renderBuyNow(id){
 const p=products.find(item=>item.id===id);
 if(!p||Number(p.stock)<1){root.innerHTML=hero('IQA WATCHES · BUY NOW','Watch unavailable','This product is not currently available in the approved catalogue.')+'<div class="route-content"><a class="button" href="#shop">Back to Shop</a></div>';return;}
 if(!window.iqaBuyNowSelection||window.iqaBuyNowSelection.productId!==p.id)window.iqaBuyNowSelection={productId:p.id,quantity:1};
 const quantity=Math.max(1,Math.min(Number(p.stock)||1,Number(window.iqaBuyNowSelection.quantity)||1));
 window.iqaBuyNowSelection.quantity=quantity;
 const subtotal=Number(p.price)*quantity;
 root.innerHTML=hero('IQA WATCHES · BUY NOW','Review your selected timepiece','This selection is separate from your shopping bag. Final order totals are confirmed only by secure checkout.')+'<div class="route-content"><a class="route-back-link" href="#product/'+encodeURIComponent(p.id)+'">← Back to watch details</a><section class="buy-now-panel"><div class="buy-now-image"><img src="'+esc(safeImageUrl(p.image))+'" alt="'+esc(p.imageAlt||p.name)+'"></div><div class="buy-now-copy"><span class="buy-now-kicker">Your selection · IQA WATCHES</span><h2>'+esc(p.name)+'</h2><p class="buy-now-price">'+money(p.price)+'</p><p class="buy-now-description">'+esc(String(p.desc||'').slice(0,180))+(String(p.desc||'').length>180?'…':'')+'</p><div class="buy-now-summary"><div class="total-row"><span>Quantity</span><div class="qty buy-now-quantity" aria-label="Buy Now quantity"><button type="button" data-buy-qty="-1" aria-label="Decrease Buy Now quantity" '+(quantity<=1?'disabled':'')+'>−</button><strong aria-live="polite">'+quantity+'</strong><button type="button" data-buy-qty="1" aria-label="Increase Buy Now quantity" '+(quantity>=Number(p.stock)?'disabled':'')+'>+</button></div></div><div class="total-row"><span>Item subtotal</span><strong>'+money(subtotal)+'</strong></div><div class="total-row"><span>Delivery</span><span>Calculated after address and store settings are verified</span></div></div><div class="buy-now-status"><strong>Cash on Delivery is available.</strong> Confirm your delivery details and address at secure checkout. Online payment methods will be added later.</div><div class="buy-now-actions"><button class="button" type="button" data-buy-now-checkout>Continue to COD Checkout</button><a class="button light" href="#bag">View Shopping Bag</a><a class="button" href="#shop">Continue exploring</a></div></div></section></div>';
}
function renderBagRoute(){
 const entries=Object.entries(cart||{}).map(([id,qty])=>({p:products.find(x=>x.id===id),qty:Number(qty)})).filter(x=>x.p&&x.qty>0);
 const subtotal=entries.reduce((sum,x)=>sum+x.p.price*x.qty,0);
 const shippingFee=subtotal>500?0:40,total=subtotal+shippingFee;
 const progress='<nav class="commerce-progress shopping-progress" aria-label="Shopping progress"><ol><li class="is-current" aria-current="step"><span class="commerce-step-number">01</span><span>Shopping bag</span></li><li><span class="commerce-step-number">02</span><span>Delivery</span></li><li><span class="commerce-step-number">03</span><span>Payment</span></li></ol></nav>';
 const rows=entries.map(({p,qty})=>'<article class="cart-row"><div class="cart-thumb"><img src="'+esc(safeImageUrl(p.image))+'" alt="'+esc(p.name)+'"></div><div class="cart-item-copy"><div class="product-brand">'+esc(p.brand)+'</div><h3>'+esc(p.name)+'</h3><p>'+money(p.price)+' each</p><div class="qty" aria-label="Quantity controls for '+esc(p.name)+'"><button type="button" data-qty="'+esc(p.id)+'" data-delta="-1" aria-label="Decrease quantity of '+esc(p.name)+'">−</button><span aria-live="polite">'+qty+'</span><button type="button" data-qty="'+esc(p.id)+'" data-delta="1" aria-label="Increase quantity of '+esc(p.name)+'">+</button></div><button type="button" class="remove" data-remove="'+esc(p.id)+'" aria-label="Remove '+esc(p.name)+' from shopping bag">Remove</button></div><strong class="cart-line-total">'+money(p.price*qty)+'</strong></article>').join('');
 const deliveryMessage=shippingFee===0?'Your order qualifies for free delivery.':'Add '+money(Math.max(0,501-subtotal))+' more to unlock free delivery.';
 const summary='<aside class="shopping-summary route-feature"><span class="eyebrow">YOUR ORDER</span><h2>Order summary</h2><div class="total-row"><span>Subtotal · '+entries.length+' '+(entries.length===1?'style':'styles')+'</span><strong>'+money(subtotal)+'</strong></div><div class="total-row"><span>Delivery</span><strong>'+(shippingFee===0?'FREE':money(shippingFee))+'</strong></div><div class="total-row shopping-grand-total"><strong>Estimated total</strong><strong>'+money(total)+'</strong></div><p class="delivery-threshold" role="status">'+deliveryMessage+'</p><a class="button shopping-checkout-button" href="#checkout">Continue to checkout <span aria-hidden="true">→</span></a><p class="route-note">Secure checkout requires your IQA account. Available payment methods are shown before order confirmation.</p><a class="button light shopping-continue-button" href="#shop">Continue shopping</a></aside>';
 const empty='<section class="route-feature shopping-empty"><div class="empty-state"><span class="eyebrow">A MOMENT FOR SOMETHING TIMELESS</span><h2>Your bag is empty</h2><p>Explore the collection and add a watch to your bag.</p><a class="button" href="#shop">Explore watches</a></div><div class="route-disabled" role="status"><strong>Checkout is unavailable.</strong> Add a watch to your bag before continuing. No order or payment can be submitted from an empty bag.</div></section>';
 root.innerHTML=hero('IQA WATCHES · SHOPPING BAG','Your shopping bag','Review your selected pieces before continuing.')+'<div class="route-content">'+(entries.length?progress+'<div class="shopping-layout"><section class="shopping-items route-feature" aria-label="Items in your shopping bag"><div class="shopping-items-head"><div><span class="eyebrow">YOUR SELECTION</span><h2>Selected timepieces</h2></div><span class="shopping-item-count">'+entries.length+' '+(entries.length===1?'item':'items')+'</span></div>'+rows+'</section>'+summary+'</div>':empty)+'</div>';
}
function renderWishlistRoute(){
 const items=(wishlist||[]).map(id=>products.find(p=>p.id===id)).filter(Boolean);
 root.innerHTML=hero('IQA WATCHES · YOUR EDIT','Wishlist','Keep your favourite pieces together.')+'<div class="route-content"><div class="route-grid">'+(items.length?items.map(p=>'<article class="route-card"><a href="#product/'+encodeURIComponent(p.id)+'" data-view="'+esc(p.id)+'"><img src="'+esc(safeImageUrl(p.image))+'" alt="'+esc(p.name)+'"></a><div class="route-card-copy"><div class="product-brand">'+esc(p.brand)+'</div><h3><a href="#product/'+encodeURIComponent(p.id)+'" data-view="'+esc(p.id)+'">'+esc(p.name)+'</a></h3><p>'+money(p.price)+'</p><div class="route-actions"><button class="button" data-add="'+esc(p.id)+'">Add to bag</button><button class="button light" data-wish="'+esc(p.id)+'">Remove</button></div></div></article>').join(''):'<div class="route-empty">Your wishlist is empty. Save products using the heart icon.<br><a class="button" href="#shop">Discover watches</a></div>')+'</div></div>';
}
async function renderCheckoutRoute(){
 const requestedHash=location.hash,stage=requestedHash==='#checkout-payment'?'payment':requestedHash==='#checkout-review'?'review':'details';
 const stepState=step=>stage===step?'is-current':((stage==='review'&&step==='details')||(stage==='payment'&&(step==='details'||step==='review'))?'is-complete':'');
 const checkoutProgress='<nav class="commerce-progress checkout-progress" aria-label="Checkout progress"><ol><li class="'+stepState('details')+'" '+(stage==='details'?'aria-current="step"':'')+'><span class="commerce-step-number">'+(stage==='details'?'01':stage==='review'||stage==='payment'?'✓':'01')+'</span><span>Delivery details</span></li><li class="'+stepState('review')+'" '+(stage==='review'?'aria-current="step"':'')+'><span class="commerce-step-number">'+(stage==='payment'?'✓':'02')+'</span><span>Review order</span></li><li class="'+stepState('payment')+'" '+(stage==='payment'?'aria-current="step"':'')+'><span class="commerce-step-number">03</span><span>Payment</span></li></ol></nav>';
 const client=customerAuthClient();
 const {data:sessionData,error:sessionError}=await client.auth.getSession();
 if(sessionError){infoRoute('IQA WATCHES · CHECKOUT','Account check failed','Please try again.','<div class="route-disabled">'+esc(sessionError.message)+'</div>');return;}
 const user=sessionData.session?.user;
 if(!user){sessionStorage.setItem('iqa-checkout-return',requestedHash);renderAuth('login');return;}
 try{
  const customerId=await ensureCustomer(client,user);if(location.hash!==requestedHash)return;
  const [{data:profile,error:profileError},{data:addresses,error:addressError}]=await Promise.all([
   client.from('customers').select('full_name,phone,email').eq('id',customerId).single(),
   client.from('customer_addresses').select('id,label,recipient_name,phone,address_line1,address_line2,landmark,city,state,postal_code,country,is_default').eq('customer_id',customerId).order('is_default',{ascending:false}).order('created_at',{ascending:false})
  ]);
  if(profileError)throw profileError;if(addressError)throw addressError;if(location.hash!==requestedHash)return;
  const entries=Object.entries(cart||{}).map(([id,qty])=>({p:products.find(x=>x.id===id),qty:Number(qty)})).filter(x=>x.p&&x.qty>0);
  if(!entries.length){infoRoute('IQA WATCHES · CHECKOUT','Your bag is empty','Add a watch before continuing.','<a class="button" href="#shop">Explore watches</a>');return;}
  const subtotal=entries.reduce((sum,x)=>sum+x.p.price*x.qty,0),shippingFee=subtotal>500?0:40,total=subtotal+shippingFee;
  const addressId=sessionStorage.getItem('iqa-checkout-address')||'';
  const selected=(addresses||[]).find(a=>a.id===addressId)||(addresses||[]).find(a=>a.is_default)||(addresses||[])[0];
  const addressText=a=>a?'<strong>'+esc(a.label)+'</strong><br>'+esc(a.recipient_name)+' · '+esc(a.phone)+'<br>'+esc(a.address_line1)+' '+esc(a.address_line2||'')+(a.landmark?' · '+esc(a.landmark):'')+'<br>'+esc(a.city)+', '+esc(a.state)+' '+esc(a.postal_code)+', '+esc(a.country):'No saved delivery address yet.';
  const items=entries.map(x=>'<div class="checkout-item"><img src="'+esc(safeImageUrl(x.p.image))+'" alt="'+esc(x.p.name)+'"><div><strong>'+esc(x.p.name)+'</strong><small>Qty '+x.qty+' · '+money(x.p.price)+'</small></div><b>'+money(x.p.price*x.qty)+'</b></div>').join('');
  const summary='<div class="checkout-summary"><h2>Order summary</h2>'+items+'<div class="total-row"><span>Subtotal</span><strong>'+money(subtotal)+'</strong></div><div class="total-row"><span>Delivery</span><strong>'+(shippingFee===0?'FREE':money(shippingFee))+'</strong></div><div class="total-row checkout-grand-total"><strong>Total</strong><strong>'+money(total)+'</strong></div></div>';
  const profileForm='<form id="checkoutProfileForm" class="route-form checkout-contact"><label>Full name<input name="full_name" autocomplete="name" maxlength="100" required value="'+esc(profile.full_name||user.user_metadata?.full_name||'')+'"></label><label>Email address<input type="email" value="'+esc(user.email||'')+'" disabled></label><label>Mobile number<input name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="20" required value="'+esc(profile.phone||'')+'" placeholder="+91 98765 43210"></label></form>';
  const saveContact=async()=>{const fd=new FormData($r('checkoutProfileForm')),full_name=String(fd.get('full_name')||'').trim(),phone=String(fd.get('phone')||'').trim();if(!full_name||!phone)throw new Error('Please enter your full name and mobile number.');const {error}=await client.from('customers').update({full_name,phone,email:user.email||null}).eq('id',customerId).eq('auth_user_id',user.id);if(error)throw error;const {error:metaError}=await client.auth.updateUser({data:{full_name,phone}});if(metaError)throw metaError;};
  if(stage==='details'){
   const opts=(addresses||[]).map(a=>'<label class="checkout-address-option"><input type="radio" name="address_id" value="'+esc(a.id)+'" '+(selected?.id===a.id?'checked':'')+' required><span>'+addressText(a)+'</span></label>').join('');
   infoRoute('IQA WATCHES · STEP 01 OF 03','Your details & delivery','Add your contact information and choose where your watch should be delivered.',
    checkoutProgress+'<div class="checkout-layout"><div class="checkout-main"><section class="checkout-section"><div class="checkout-section-head"><span>01</span><div><h2>Contact details</h2><p>Used for order updates and delivery coordination.</p></div></div>'+profileForm+'<p class="route-note">Your contact details will be saved to your IQA account.</p></section><section class="checkout-section"><div class="checkout-section-head"><span>02</span><div><h2>Delivery address</h2><p>Select a saved address or add a new one.</p></div></div>'+(opts?'<div class="checkout-address-list">'+opts+'</div>':'<div class="route-disabled">No saved address yet. Add your delivery address to continue.</div>')+'<a class="button light" id="checkoutAddAddress" href="#addresses">+ Add / manage saved address</a></section><p id="checkoutMessage" role="status" aria-live="polite"></p><button class="button checkout-submit" id="checkoutContinue" type="button">Save details &amp; continue</button></div>'+summary+'</div>');
   const add=$r('checkoutAddAddress');if(add)add.addEventListener('click',()=>sessionStorage.setItem('iqa-address-return','#checkout'));
   $r('checkoutContinue')?.addEventListener('click',async()=>{const msg=$r('checkoutMessage');try{await saveContact();const chosen=document.querySelector('input[name="address_id"]:checked');if(!chosen)throw new Error('Please select or add a delivery address.');sessionStorage.setItem('iqa-checkout-address',chosen.value);location.hash='checkout-review';}catch(err){msg.textContent=err.message||'Could not save your details.';}});
   return;
  }
  if(!selected){infoRoute('IQA WATCHES · DELIVERY','Add a delivery address','A saved address is required before reviewing your order.','<a class="button" href="#addresses" id="checkoutAddAddress">Add delivery address</a>');$r('checkoutAddAddress')?.addEventListener('click',()=>sessionStorage.setItem('iqa-address-return','#checkout'));return;}
  if(stage==='review'){
   infoRoute('IQA WATCHES · STEP 02 OF 03','Review your order','Check your delivery address and order total before proceeding to payment.',
    checkoutProgress+'<div class="checkout-layout"><div class="checkout-main"><section class="checkout-section"><div class="checkout-section-head"><span>✓</span><div><h2>Contact details saved</h2><p>'+esc(profile.full_name||user.user_metadata?.full_name||'')+' · '+esc(profile.phone||'')+'</p></div></div></section><section class="checkout-section"><div class="checkout-section-head"><span>02</span><div><h2>Delivery address</h2></div></div><p>'+addressText(selected)+'</p><a class="button light" href="#checkout">Change details / address</a></section><button class="button checkout-submit" id="checkoutPlaceOrder" type="button">Place Order · Continue to Payment</button></div>'+summary+'</div>');
   $r('checkoutPlaceOrder')?.addEventListener('click',()=>{sessionStorage.setItem('iqa-checkout-address',selected.id);location.hash='checkout-payment';});return;
  }
  infoRoute('IQA WATCHES · STEP 03 OF 03','Choose your payment','Select how you would like to pay for your order.',
   checkoutProgress+'<div class="checkout-layout"><div class="checkout-main"><section class="checkout-section"><div class="checkout-section-head"><span>03</span><div><h2>Payment method</h2><p>Online payments will be activated after gateway setup.</p></div></div><div class="checkout-payments"><label class="checkout-payment-option"><input type="radio" name="payment_method" value="cash_on_delivery" checked><span><strong>Cash on Delivery (COD)</strong><small>Pay when your order is delivered.</small></span><b>COD</b></label><label class="checkout-payment-option is-unavailable"><input type="radio" disabled><span><strong>UPI · Google Pay · PhonePe · Paytm</strong><small>Coming Soon</small></span><b>UPI</b></label><label class="checkout-payment-option is-unavailable"><input type="radio" disabled><span><strong>Credit / Debit Cards</strong><small>Coming Soon</small></span><b>CARDS</b></label><label class="checkout-payment-option is-unavailable"><input type="radio" disabled><span><strong>Net Banking</strong><small>Coming Soon</small></span><b>BANK</b></label><label class="checkout-payment-option is-unavailable"><input type="radio" disabled><span><strong>Wallets</strong><small>Coming Soon</small></span><b>WALLET</b></label></div><p class="route-note checkout-setup-note">COD is available. Your order will be created securely and payment will be collected only at delivery.</p><p id="codOrderMessage" role="status" aria-live="polite"></p><button class="button checkout-submit" type="button" id="confirmCodOrder">Confirm COD Order</button><a class="button light" href="#checkout-review">Back to order review</a></section></div>'+summary+'</div>');
  $r('confirmCodOrder')?.addEventListener('click',async()=>{
   const button=$r('confirmCodOrder'),message=$r('codOrderMessage');if(!button||button.disabled)return;
   button.disabled=true;button.textContent='Placing your order…';message.textContent='Please wait while we securely verify your watch, stock and delivery address.';   try{
    const cfg=window.IQA_SUPABASE_CONFIG,session=(await client.auth.getSession()).data.session;
    if(!cfg?.url||!cfg?.publishableKey||!session?.access_token)throw new Error('Your secure session expired. Please sign in again.');
    const requestKey=crypto.randomUUID(),orderItems=entries.map(x=>({product_id:String(x.p.id||''),variant_id:String(x.p.variantId||''),quantity:Number(x.qty)}));
    if(orderItems.some(x=>!(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x.product_id))))throw new Error('A selected watch is missing its catalogue product reference. Please refresh your bag.');
    const response=await fetch(cfg.url.replace(/\/$/,'')+'/functions/v1/iqa-customer-checkout',{method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.publishableKey,'Authorization':'Bearer '+session.access_token,'x-idempotency-key':requestKey},body:JSON.stringify({address_id:selected.id,items:orderItems})});
    const result=await response.json().catch(()=>({}));if(!response.ok||result.ok!==true)throw new Error(result.error||'We could not place your order. Please try again.');
    const order=result.order||{};
    infoRoute('IQA WATCHES · ORDER CONFIRMED','Thank you. Your order is placed.','Your Cash on Delivery order has been recorded successfully.','<section class="checkout-section order-success" role="status"><div class="eyebrow">ORDER CONFIRMATION</div><h2>Order placed successfully ✓</h2><p>Your order number is <strong>'+esc(order.order_number||'Confirmed')+'</strong>.</p><p>Payment method: <strong>Cash on Delivery</strong></p><p>Order total: <strong>'+money(Number(order.payable_total??total))+'</strong></p><p class="route-note">Please keep your phone available for delivery coordination. Payment is due when the watch is delivered.</p><a class="button" href="#orders">View my orders</a> <a class="button light" href="#shop">Continue shopping</a></section>');
   }catch(err){message.textContent=err.message||'Order could not be placed. Please try again.';button.disabled=false;button.textContent='Confirm COD Order';}
  });
 }catch(err){if(location.hash!==requestedHash)return;infoRoute('IQA WATCHES · CHECKOUT','Checkout could not be loaded','Your saved account data has not been changed.','<div class="route-disabled">'+esc(err.message||'Please try again later.')+'</div><a class="button light" href="#bag">Back to bag</a>');}
}

let customerClient=null;
function customerAuthClient(){
 if(customerClient)return customerClient;
 const cfg=window.IQA_SUPABASE_CONFIG;
 if(!window.supabase||!cfg?.url||!cfg?.publishableKey)throw new Error('Secure customer sign-in is not configured.');
 customerClient=window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});
 // Keep the public catalogue client stateless; only this customer client persists a session.
 customerClient.auth.onAuthStateChange((event,session)=>{
  const accountLink=document.querySelector('a[href="#account"][aria-label="My account"]');
  if(accountLink)accountLink.textContent=session?.user?'My account':'Account';
  if(event==='SIGNED_IN'){const next=sessionStorage.getItem('iqa-checkout-return');if(next){sessionStorage.removeItem('iqa-checkout-return');location.hash=next;}}
  if(event==='SIGNED_OUT'&&['account','profile','orders','tracking','addresses'].includes((location.hash||'#').slice(1).split('/')[0]))location.hash='login';
 });
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
 ['Can I place an order online?','Cash on Delivery orders can be submitted through secure checkout when your account, delivery address and stock are verified. Online payments are coming soon.'],
 ['How can I check delivery availability?','Delivery coverage and delivery estimates are not yet connected, so we do not display unverified delivery promises.'],
 ['Can I cancel my order?','A confirmed Cash on Delivery order can be cancelled from My Account → My orders until processing begins.'],
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
 const returnAfterAuth=()=>{const next=sessionStorage.getItem('iqa-checkout-return');sessionStorage.removeItem('iqa-checkout-return');location.hash=next||'account';};
 infoRoute('IQA WATCHES · MY ACCOUNT',signup?'Create your account':'Sign in','Choose a secure way to access your IQA WATCHES account.',
 '<div class="route-auth-layout auth-experience"><section class="route-feature auth-panel-main" aria-labelledby="authWelcomeTitle"><div class="auth-panel-kicker">IQA WATCHES · PRIVATE CLIENT ACCESS</div><div class="auth-tabs"><a class="chip '+(!signup?'active':'')+'" href="#login">Sign in</a><a class="chip '+(signup?'active':'')+'" href="#signup">Create account</a></div><h2 id="authWelcomeTitle">'+(signup?'Create your account':'Welcome back')+'</h2><p class="auth-intro">'+(signup?'Join IQA WATCHES to keep your details and orders together.':'Sign in to continue to your account, saved details and orders.')+'</p>'+
 '<div class="auth-methods"><button class="button auth-google-button" type="button" id="customerGoogleSignIn"><span class="auth-google-mark" aria-hidden="true">G</span><span>Continue with Google</span><span class="auth-button-arrow" aria-hidden="true">→</span></button></div>'+
 '<div class="auth-divider"><span>OR CONTINUE WITH EMAIL</span></div>'+
 '<form id="customerAuthForm" class="route-form auth-email-form">'+(signup?'<label>Full name<input name="full_name" autocomplete="name" required maxlength="100" placeholder="Your full name"></label>':'')+'<label>Email address<input name="email" type="email" autocomplete="email" required placeholder="you@example.com"></label><label>Password<input name="password" type="password" autocomplete="'+(signup?'new-password':'current-password')+'" minlength="8" required placeholder="Enter your password"></label><button class="button auth-email-button" type="submit">'+(signup?'Create account':'Sign in with email')+'<span aria-hidden="true">→</span></button><p class="route-note auth-status" id="authMessage" role="status" aria-live="polite"></p></form>'+
 '<div class="auth-divider auth-mobile-divider"><span>OR USE YOUR MOBILE NUMBER</span></div><form id="customerPhoneForm" class="route-form auth-phone-form"><label>Mobile number<input name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="16" placeholder="+91 98765 43210" required></label><label id="phoneOtpLabel" hidden>6-digit verification code<input name="otp" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="Enter OTP"></label><button class="button auth-phone-button" type="submit" id="customerPhoneSubmit">Send OTP <span aria-hidden="true">→</span></button><p class="route-note auth-status" id="phoneAuthMessage" role="status" aria-live="polite"></p></form>'+
 '<p class="route-note auth-security-note"><span aria-hidden="true">◇</span> Your sign-in is protected. Never share your password or one-time codes. Mobile sign-in requires SMS delivery to be configured.</p></section><aside class="route-feature auth-brand-panel"><div class="auth-brand-orbit" aria-hidden="true"><span class="auth-orbit-ring"></span><span class="auth-watch-symbol">IQA</span></div><div class="auth-brand-copy"><span class="auth-panel-kicker">TIME, WITH INTENTION</span><h2>Your time.<br><em>Your signature.</em></h2><p>A considered account experience for the watches you choose and the moments you make yours.</p></div><div class="auth-brand-foot"><span>DESIGNED FOR EVERY DAY</span><span>EST. IQA WATCHES</span></div></aside></div>');
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
    if(data.session)returnAfterAuth();
   }else{
    const {error}=await client.auth.signInWithPassword({email,password});if(error)throw error;
    returnAfterAuth();
   }
  }catch(err){msg.textContent=err.message||'Sign-in could not be completed.';}
  finally{button.disabled=false;}
 });
 $r('customerGoogleSignIn').addEventListener('click',async e=>{
  const button=e.currentTarget;button.disabled=true;  try{
   const client=customerAuthClient();
   const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:'https://ugcnoorstudio-ui.github.io/IQA-WATCHES-/'}});
   if(error)throw error;
  }catch(err){$r('authMessage').textContent=err.message||'Google sign-in could not be started.';button.disabled=false;}
 });
 let otpRequested=false,requestedPhone='';
 const phoneForm=$r('customerPhoneForm');
 phoneForm.addEventListener('submit',async e=>{
  e.preventDefault();const button=$r('customerPhoneSubmit'),msg=$r('phoneAuthMessage'),fd=new FormData(phoneForm);
  const phone=String(fd.get('phone')||'').trim(),otp=String(fd.get('otp')||'').trim();
  button.disabled=true;msg.textContent='Please wait…';
  try{
   const client=customerAuthClient();
   if(!otpRequested){
    if(!/^\+[1-9]\d{7,14}$/.test(phone))throw new Error('Enter your mobile number with country code, e.g. +919876543210.');
    const {error}=await client.auth.signInWithOtp({phone,options:{shouldCreateUser:true}});
    if(error)throw error;
    requestedPhone=phone;otpRequested=true;
    $r('phoneOtpLabel').hidden=false;$r('customerPhoneForm').querySelector('[name="phone"]').readOnly=true;
    button.textContent='Verify OTP';msg.textContent='A verification code has been requested. Enter the 6-digit code sent to your phone.';
   }else{
    if(!/^[0-9]{6}$/.test(otp))throw new Error('Enter the 6-digit verification code.');
    const {error}=await client.auth.verifyOtp({phone:requestedPhone,token:otp,type:'sms'});
    if(error)throw error;
    returnAfterAuth();
   }
  }catch(err){msg.textContent=err.message||'Phone sign-in could not be completed.';}
  finally{button.disabled=false;}
 });
}
async function renderAccount(){
 const requestedHash=location.hash;
 try{
  const client=customerAuthClient(),{data,error}=await client.auth.getSession();if(error)throw error;
  if(location.hash!==requestedHash)return;
  const user=data.session?.user;
  if(!user){renderAuth('login');return;}
  const meta=user.user_metadata||{},customerId=await ensureCustomer(client,user);
  if(location.hash!==requestedHash)return;
  const {data:profile,error:profileError}=await client.from('customers').select('full_name,phone,email').eq('id',customerId).single();
  if(profileError)throw profileError;
  if(location.hash!==requestedHash)return;
  const fullName=profile.full_name||meta.full_name||'';
  const phone=profile.phone||meta.phone||'';
  infoRoute('IQA WATCHES · MY IQA','Welcome'+(fullName?' back, '+fullName.split(' ')[0]:''),'Your customer account and preferences.',
   '<div class="route-columns"><div class="route-feature"><h2>Profile</h2><form id="customerProfileForm" class="route-form"><label>Full name<input name="full_name" maxlength="100" value="'+esc(fullName)+'" required></label><label>Email address<input value="'+esc(user.email||'')+'" disabled></label><label>Phone number<input name="phone" type="tel" maxlength="20" value="'+esc(phone)+'"></label><button class="button" type="submit">Save profile</button><p class="route-note" id="profileMessage" role="status"></p></form><button class="button light" id="customerSignOut" type="button">Sign out</button></div><div class="route-feature"><h2>My IQA</h2><ul class="account-links"><li><a href="#orders">My orders & order details</a></li><li><a href="#tracking">Track an order</a></li><li><a href="#addresses">Saved addresses</a></li><li><a href="#wishlist">Wishlist</a></li><li><a href="#returns">Returns & refunds</a></li><li><a href="#support">Customer support</a></li></ul></div></div>');
  $r('customerProfileForm').addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.currentTarget),msg=$r('profileMessage'),nextName=String(fd.get('full_name')||'').trim(),nextPhone=String(fd.get('phone')||'').trim();try{const {error:dbError}=await client.from('customers').update({full_name:nextName,phone:nextPhone||null,email:user.email||null}).eq('id',customerId).eq('auth_user_id',user.id);if(dbError)throw dbError;const {error:authError}=await client.auth.updateUser({data:{full_name:nextName,phone:nextPhone}});if(authError)throw authError;msg.textContent='Profile details saved securely.';}catch(err){msg.textContent=err.message||'Profile could not be saved.';}});
  $r('customerSignOut').addEventListener('click',async()=>{const {error}=await client.auth.signOut();if(error){$r('profileMessage').textContent=error.message;return;}location.hash='login';});
 }catch(err){infoRoute('IQA WATCHES · MY ACCOUNT','Account unavailable','Secure customer authentication could not be initialized.','<div class="route-disabled">'+esc(err.message||'Please try again later.')+'</div>');}
}

async function ensureCustomer(client,user){
 const {data:found,error:findError}=await client.from('customers').select('id').eq('auth_user_id',user.id).maybeSingle();
 if(findError)throw findError;
 if(found?.id)return found.id;
 const meta=user.user_metadata||{};
 const {data,error}=await client.from('customers').insert({auth_user_id:user.id,email:user.email||null,full_name:meta.full_name||'',phone:meta.phone||null}).select('id').single();
 if(error){
  // Concurrent first visits can race on the unique auth_user_id constraint.
  if(error.code==='23505'){
   const {data:retry,error:retryError}=await client.from('customers').select('id').eq('auth_user_id',user.id).maybeSingle();
   if(retryError)throw retryError;
   if(retry?.id)return retry.id;
  }
  throw error;
 }
 return data.id;
}
async function requireCustomer(){
 const client=customerAuthClient(),{data,error}=await client.auth.getSession();
 if(error)throw error;
 if(!data.session?.user){location.hash='login';return null;}
 const customerId=await ensureCustomer(client,data.session.user);
 return {client,user:data.session.user,customerId};
}
function customerMessage(target,message,isError=false){
 const el=$r(target);if(el){el.textContent=message;el.style.color=isError?'#a33':'';}
}
async function renderCustomerDataPage(route){
 const titles={orders:'My orders',tracking:'Track an order',addresses:'Saved addresses',reviews:'My reviews',support:'Customer support',returns:'Returns & refunds',coupons:'My coupons',offers:'Offers & rewards'};
 infoRoute('IQA WATCHES · MY IQA',titles[route]||'My account','Private customer information is loaded only after secure sign-in.','<div class="route-feature" id="customerPanel"><p>Loading your secure customer area…</p></div>');
 try{
  const ctx=await requireCustomer();if(!ctx)return;
  const {client,customerId}=ctx,host=$r('customerPanel');if(!host)return;
  if(route==='addresses'){
   const draw=async()=>{
    const {data,error}=await client.from('customer_addresses').select('*').eq('customer_id',customerId).order('is_default',{ascending:false}).order('created_at',{ascending:false});
    if(error)throw error;
    host.innerHTML='<h2>Saved delivery addresses</h2><form id="addressForm" class="route-form"><label>Label<input name="label" value="Home" maxlength="40" required></label><label>Recipient name<input name="recipient_name" autocomplete="name" required maxlength="100"></label><label>Phone<input name="phone" type="tel" required maxlength="20"></label><label>Address line 1<input name="address_line1" autocomplete="address-line1" required maxlength="200"></label><label>Address line 2<input name="address_line2" autocomplete="address-line2" maxlength="200"></label><label>Landmark<input name="landmark" maxlength="120"></label><label>City<input name="city" autocomplete="address-level2" required></label><label>State<input name="state" autocomplete="address-level1" required></label><label>PIN code<input name="postal_code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required></label><label><input name="is_default" type="checkbox"> Set as default address</label><button class="button" type="submit">Save address</button><p id="addressMessage" role="status"></p></form><div class="route-grid">'+(data||[]).map(a=>'<article class="route-feature"><h3>'+esc(a.label)+(a.is_default?' · Default':'')+'</h3><p>'+esc(a.recipient_name)+' · '+esc(a.phone)+'<br>'+esc(a.address_line1)+' '+esc(a.address_line2||'')+'<br>'+esc(a.city)+', '+esc(a.state)+' '+esc(a.postal_code)+', '+esc(a.country)+'</p><button class="button light" data-delete-address="'+esc(a.id)+'">Delete</button></article>').join('')+'</div>';
    $r('addressForm').addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const row={customer_id:customerId,label:String(fd.get('label')).trim(),recipient_name:String(fd.get('recipient_name')).trim(),phone:String(fd.get('phone')).trim(),address_line1:String(fd.get('address_line1')).trim(),address_line2:String(fd.get('address_line2')||'').trim()||null,landmark:String(fd.get('landmark')||'').trim()||null,city:String(fd.get('city')).trim(),state:String(fd.get('state')).trim(),postal_code:String(fd.get('postal_code')).trim(),is_default:fd.get('is_default')==='on'};try{if(row.is_default){const {error:defaultError}=await client.from('customer_addresses').update({is_default:false}).eq('customer_id',customerId);if(defaultError)throw defaultError;}const {error}=await client.from('customer_addresses').insert(row);if(error)throw error;const returnToCheckout=sessionStorage.getItem('iqa-address-return');if(returnToCheckout){sessionStorage.removeItem('iqa-address-return');location.hash='checkout';return;}await draw();}catch(err){customerMessage('addressMessage',err.message||'Could not save address.',true);}});
    host.querySelectorAll('[data-delete-address]').forEach(b=>b.addEventListener('click',async()=>{const {error}=await client.from('customer_addresses').delete().eq('id',b.dataset.deleteAddress).eq('customer_id',customerId);if(error){customerMessage('addressMessage',error.message,true);return;}await draw();}));
   };await draw();return;
  }
  if(route==='orders'||route==='tracking'){
   const {data:orders,error}=await client.from('orders').select('id,order_number,state,payment_state,currency,item_total,discount_total,shipping_total,tax_total,payable_total,created_at,delivery_snapshot').eq('customer_id',customerId).neq('state','pending').order('created_at',{ascending:false});
   if(error)throw error;
   if(!orders?.length){host.innerHTML='<h2>'+titles[route]+'</h2><p>No orders are linked to this account yet.</p><a class="button light" href="#shop">Explore watches</a>';return;}
   const ids=orders.map(o=>o.id);
   const [{data:items,error:itemError},{data:events,error:eventError}]=await Promise.all([client.from('order_items').select('order_id,sku_snapshot,product_snapshot,quantity,unit_price,line_total').in('order_id',ids),client.from('order_status_events').select('order_id,previous_state,new_state,reason,created_at').in('order_id',ids).order('created_at',{ascending:false})]);   if(itemError)throw itemError;if(eventError)throw eventError;
   host.innerHTML='<h2>'+titles[route]+'</h2>'+orders.map(o=>{
    const oi=(items||[]).filter(i=>i.order_id===o.id),ev=(events||[]).filter(x=>x.order_id===o.id);
    const canCancel=route==='orders'&&o.state==='confirmed'&&o.payment_state==='pending'&&o.delivery_snapshot?.payment_method==='cash_on_delivery';
    const cancelButton=canCancel?'<button class="button light" type="button" data-cancel-order="'+esc(o.id)+'">Cancel order</button><p class="route-note">Cancellation is available until processing begins.</p>':'';
    return '<article class="route-feature"><h3>Order '+esc(o.order_number||o.id.slice(0,8))+'</h3><p>'+new Date(o.created_at).toLocaleString('en-IN')+' · '+esc(({confirmed:'Order Confirmed',processing:'Processing',packed:'Packed',ready_for_pickup:'Ready for Pickup',shipped:'Out for delivery',delivered:'Delivered',cancelled:'Cancelled',returned:'Returned',refunded:'Refunded',refund_pending:'Refund pending',return_requested:'Return requested',payment_failed:'Payment failed'})[o.state]||o.state)+' · Payment: '+esc(o.payment_state)+'</p><p><strong>₹'+Number(o.payable_total||0).toLocaleString('en-IN')+'</strong></p><ul>'+oi.map(i=>'<li>'+esc(i.product_snapshot?.name||i.sku_snapshot||'Product')+' × '+Number(i.quantity)+' — ₹'+Number(i.line_total||0).toLocaleString('en-IN')+'</li>').join('')+'</ul>'+(route==='tracking'?'<h4>Order status history</h4><ol>'+ev.map(x=>'<li>'+esc(({confirmed:'Order Confirmed',processing:'Processing',packed:'Ready for dispatch',shipped:'Out for delivery',delivered:'Delivered',cancelled:'Cancelled',returned:'Returned',refunded:'Refunded',refund_pending:'Refund pending',return_requested:'Return requested',payment_failed:'Payment failed'})[x.new_state]||x.new_state)+' · '+new Date(x.created_at).toLocaleString('en-IN')+(x.reason?' — '+esc(x.reason):'')+'</li>').join('')+'</ol><p>Courier location tracking is shown only when a verified carrier integration supplies it.</p>':'<a class="button light" href="#tracking">Track this order</a> <a class="button light" href="#returns">Request return</a>'+cancelButton)+'</article>';
   }).join('');
   if(window.__iqaOrderRefreshTimer)clearInterval(window.__iqaOrderRefreshTimer);
   window.__iqaOrderRefreshTimer=setInterval(()=>{
    if(['orders','tracking'].includes((location.hash||'').slice(1).split('/')[0]))renderCustomerDataPage(route);
    else clearInterval(window.__iqaOrderRefreshTimer);
   },15000);
   host.querySelectorAll('[data-cancel-order]').forEach(button=>button.addEventListener('click',async()=>{
    const orderId=button.dataset.cancelOrder;
    if(!orderId||button.disabled)return;
    if(!window.confirm('Cancel this confirmed Cash on Delivery order? The reserved stock will be released.'))return;
    button.disabled=true;button.textContent='Cancelling…';
    try{
     const {data,error}=await client.functions.invoke('iqa-customer-cancel-order',{body:{order_id:orderId}});
     if(error)throw error;
     if(!data?.ok)throw new Error(data?.error||'Order cancellation was not confirmed.');
     await renderCustomerDataPage('orders');
    }catch(err){
     button.disabled=false;button.textContent='Cancel order';
     const note=button.nextElementSibling;
     if(note)note.textContent=err.message||'Could not cancel this order. Please try again.';
    }
   }));
   return;
  }
  if(route==='returns'){
   const {data:orders,error}=await client.from('orders').select('id,order_number,state,created_at').eq('customer_id',customerId).order('created_at',{ascending:false});if(error)throw error;
   const {data:existing,error:retError}=await client.from('return_requests').select('id,order_id,kind,reason,state,created_at,orders!inner(customer_id)').eq('orders.customer_id',customerId).order('created_at',{ascending:false});if(retError)throw retError;
   host.innerHTML='<h2>Request a return</h2><form id="returnForm" class="route-form"><label>Order<select name="order_id" required><option value="">Choose your order</option>'+(orders||[]).map(o=>'<option value="'+esc(o.id)+'">'+esc(o.order_number||o.id.slice(0,8))+' · '+esc(o.state)+'</option>').join('')+'</select></label><label>Request type<select name="kind"><option value="return">Return</option><option value="refund">Refund</option><option value="warranty">Warranty</option></select></label><label>Reason<textarea name="reason" required minlength="5" maxlength="1000"></textarea></label><button class="button" type="submit">Submit request</button><p id="returnMessage" role="status"></p></form><h3>Previous requests</h3>'+((existing||[]).map(x=>'<p>Request '+esc(x.id.slice(0,8))+' · '+esc(x.kind)+' · '+esc(x.state)+' — '+esc(x.reason)+'</p>').join('')||'<p>No return requests yet.</p>')+'<p class="route-note">Requests are subject to the final published return policy and staff review. Submitting does not guarantee approval.</p>';
   $r('returnForm').addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const {error}=await client.from('return_requests').insert({order_id:fd.get('order_id'),kind:fd.get('kind'),reason:String(fd.get('reason')).trim(),state:'requested'});if(error){customerMessage('returnMessage',error.message,true);return;}customerMessage('returnMessage','Return request submitted for review.');e.currentTarget.reset();});return;
  }
  if(route==='reviews'){
   const {data:catalog,error}=await client.from('products').select('id,name').eq('state','published').order('name');if(error)throw error;
   const {data:mine,error:mineError}=await client.from('reviews').select('id,product_id,rating,body,state,created_at').eq('customer_id',customerId).order('created_at',{ascending:false});if(mineError)throw mineError;
   host.innerHTML='<h2>Write a product review</h2><form id="reviewForm" class="route-form"><label>Product<select name="product_id" required><option value="">Choose a product</option>'+(catalog||[]).map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('')+'</select></label><label>Rating<select name="rating" required><option value="">Choose rating</option><option value="5">5 — Excellent</option><option value="4">4 — Very good</option><option value="3">3 — Good</option><option value="2">2 — Fair</option><option value="1">1 — Poor</option></select></label><label>Your review<textarea name="body" required minlength="10" maxlength="2000"></textarea></label><button class="button" type="submit">Submit for moderation</button><p id="reviewMessage" role="status"></p></form><h3>Your submitted reviews</h3>'+((mine||[]).map(x=>'<article class="route-feature"><strong>'+Number(x.rating)+'/5 · '+esc(x.state)+'</strong><p>'+esc(x.body)+'</p><small>'+new Date(x.created_at).toLocaleDateString('en-IN')+'</small></article>').join('')||'<p>No reviews submitted yet.</p>')+'<p class="route-note">Reviews are submitted as pending and are not marked as verified purchases automatically.</p>';
   $r('reviewForm').addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const {error}=await client.from('reviews').insert({product_id:fd.get('product_id'),customer_id:customerId,rating:Number(fd.get('rating')),body:String(fd.get('body')).trim(),state:'pending',verified_purchase:false});if(error){customerMessage('reviewMessage',error.message,true);return;}customerMessage('reviewMessage','Review submitted for moderation.');e.currentTarget.reset();});return;
  }
  if(route==='support'){
   host.innerHTML='<h2>Contact customer support</h2><form id="supportForm" class="route-form"><label>Subject<input name="subject" required maxlength="160"></label><label>How can we help?<textarea name="body" required minlength="10" maxlength="3000"></textarea></label><button class="button" type="submit">Submit support request</button><p id="supportMessage" role="status"></p></form><p class="route-note">Your message is private to your account and authorized support staff. Internal staff notes are never shown in this customer panel.</p>';
   $r('supportForm').addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const {error}=await client.from('support_tickets').insert({customer_id:customerId,subject:String(fd.get('subject')).trim(),body:String(fd.get('body')).trim()});if(error){customerMessage('supportMessage',error.message,true);return;}customerMessage('supportMessage','Support request submitted successfully.');e.currentTarget.reset();});return;
  }
  if(route==='coupons'||route==='offers'){
   const {data,error}=await client.from('coupons').select('code,kind,value,minimum_order,starts_at,ends_at,rules').eq('active',true).order('ends_at',{ascending:true});if(error)throw error;
   const now=Date.now(),valid=(data||[]).filter(c=>(!c.starts_at||new Date(c.starts_at).getTime()<=now)&&(!c.ends_at||new Date(c.ends_at).getTime()>now));
   host.innerHTML='<h2>'+titles[route]+'</h2>'+(valid.length?'<div class="route-grid">'+valid.map(c=>'<article class="route-feature"><h3>'+esc(c.code)+'</h3><p>'+ (c.kind==='percent'?Number(c.value)+'% off':c.kind==='fixed'?'₹'+Number(c.value).toLocaleString('en-IN')+' off':'Offer')+'</p>'+(c.minimum_order?'<p>Minimum order: ₹'+Number(c.minimum_order).toLocaleString('en-IN')+'</p>':'')+(c.ends_at?'<p>Valid until '+new Date(c.ends_at).toLocaleDateString('en-IN')+'</p>':'')+'</article>').join('')+'</div>':'<p>No active offers are published right now.</p>');return;
  }
 }catch(err){
  if(err?.message==='Auth session missing!'){location.hash='login';return;}
  const host=$r('customerPanel');if(host)host.innerHTML='<div class="route-disabled">'+esc(err.message||'This customer feature is temporarily unavailable.')+'</div>';
 }
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
  const host=$r('searchResults');host.innerHTML=list.length?list.map(p=>'<article class="route-card"><a href="#product/'+encodeURIComponent(p.id)+'" data-view="'+esc(p.id)+'"><img src="'+esc(safeImageUrl(p.image))+'" alt="'+esc(p.name)+'"></a><div class="route-card-copy"><div class="product-brand">'+esc(p.brand)+'</div><h3><a href="#product/'+encodeURIComponent(p.id)+'" data-view="'+esc(p.id)+'">'+esc(p.name)+'</a></h3><p>'+money(p.price)+'</p><a class="button light" href="#product/'+encodeURIComponent(p.id)+'" data-view="'+esc(p.id)+'">View product</a></div></article>').join(''):'<div class="route-empty">No matching published products. Try a different search or filter.</div>';
  $r('searchCount').textContent=list.length+' matching products';
 };
 const brands=[...new Set(products.map(p=>p.brand).filter(Boolean))].sort();
 infoRoute('SEARCH','Search the collection','Search by watch name, brand, style or model number.',
 '<div class="toolbar"><input id="routeSearchInput" type="search" placeholder="Search watches, brands or model…" aria-label="Search products"><select id="routeBrand"><option value="All">All brands</option>'+brands.map(b=>'<option value="'+esc(b)+'">'+esc(b)+'</option>').join('')+'</select><select id="routePrice"><option value="all">Any price</option><option value="under1000">Under ₹1,000</option><option value="1000to2500">₹1,000–₹2,500</option><option value="over2500">Over ₹2,500</option></select></div><p class="results-count" id="searchCount"></p><div id="searchResults" class="route-grid"></div>');
 const update=()=>draw($r('routeSearchInput').value,$r('routeBrand').value,$r('routePrice').value);
 $r('routeSearchInput').addEventListener('input',update);$r('routeBrand').addEventListener('change',update);$r('routePrice').addEventListener('change',update);update();
}

function normalizeCollectionTag(value){return String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
function matchesAudienceCollection(product,terms){const values=[product.audience,product.category,product.style,...(Array.isArray(product.tags)?product.tags:[])].filter(Boolean).map(normalizeCollectionTag);return values.some(value=>terms.includes(value)||value.split('-').some(token=>terms.includes(token)))}
function collectionForRoute(route){const definitions={shop:{title:'Shop all watches',description:'Browse every currently approved watch with available stock.',matches:()=>true},men:{title:'Men’s watches',description:'Watches assigned to the Men audience, category, style or tag in the approved catalogue.',matches:p=>matchesAudienceCollection(p,['men','mens'])},women:{title:'Women’s watches',description:'Watches assigned to the Women audience, category, style or tag in the approved catalogue.',matches:p=>matchesAudienceCollection(p,['women','womens'])},unisex:{title:'Unisex watches',description:'Watches assigned to the Unisex audience, category, style or tag in the approved catalogue.',matches:p=>matchesAudienceCollection(p,['unisex'])},'new-arrivals':{title:'New arrivals',description:'Watches explicitly tagged New Arrivals in the approved catalogue.',matches:p=>(Array.isArray(p.tags)?p.tags:[]).some(tag=>['new-arrival','new-arrivals'].includes(normalizeCollectionTag(tag)))},bestsellers:{title:'Bestsellers',description:'Watches explicitly tagged as bestsellers in the approved catalogue.',matches:p=>(Array.isArray(p.tags)?p.tags:[]).some(tag=>['bestseller','bestsellers','best-seller'].includes(normalizeCollectionTag(tag)))}};return definitions[route]||definitions.shop}
window.IQA_ROUTE_COLLECTIONS=Object.freeze({normalizeTag:normalizeCollectionTag,collectionForRoute});
function showHomeSection(id){const home=document.getElementById('home');if(!home)return;root.classList.add('hidden');document.getElementById('mobileMenu')?.classList.remove('open');document.getElementById('menuToggle')?.setAttribute('aria-expanded','false');Array.from(home.children).forEach(x=>{if(x!==root)x.classList.remove('hidden')});requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'}));}


function renderBrands(selectedBrand=''){
 const brands=[...new Set(products.map(p=>p.brand).filter(Boolean))].sort();
 const chosen=selectedBrand?products.filter(p=>p.brand===selectedBrand):[];
 const cards=list=>list.length?'<div class="route-grid">'+list.map(p=>'<article class="route-card"><a href="#product/'+encodeURIComponent(p.id)+'" data-view="'+esc(p.id)+'"><img src="'+esc(safeImageUrl(p.image))+'" alt="'+esc(p.name)+'" loading="lazy"></a><div class="route-card-copy"><div class="product-brand">'+esc(p.brand)+'</div><h3><a href="#product/'+encodeURIComponent(p.id)+'" data-view="'+esc(p.id)+'">'+esc(p.name)+'</a></h3><p>'+money(p.price)+'</p><a class="button light" href="#product/'+encodeURIComponent(p.id)+'" data-view="'+esc(p.id)+'">View product</a></div></article>').join('')+'</div>':'<div class="route-empty">No currently published products are listed for this brand.</div>';
 infoRoute('IQA WATCHES · BRANDS',selectedBrand||'Explore our brands','Browse brands represented in the currently approved product catalogue.',selectedBrand?'<p><a class="button light" href="#brands">All brands</a></p>'+cards(chosen):(brands.length?'<div class="route-grid">'+brands.map(b=>'<article class="route-feature"><h2>'+esc(b)+'</h2><p>'+products.filter(p=>p.brand===b).length+' catalogue item(s)</p><a class="button light" href="#brands/'+encodeURIComponent(b)+'">Explore brand</a></article>').join('')+'</div>':'<div class="route-empty">No brands are currently listed in the approved catalogue.</div>'));
}
function renderCategories(selectedCategory=''){
 const values=[...new Set(products.flatMap(p=>[p.category,p.audience,p.style,...(Array.isArray(p.tags)?p.tags:[])]).filter(v=>typeof v==='string'&&v.trim()))].sort();
 const matches=selectedCategory?products.filter(p=>p.category===selectedCategory||p.audience===selectedCategory||p.style===selectedCategory||(Array.isArray(p.tags)&&p.tags.includes(selectedCategory))):[];
 const cards=list=>list.length?'<div class="route-grid">'+list.map(p=>'<article class="route-card"><a href="#product/'+encodeURIComponent(p.id)+'" data-view="'+esc(p.id)+'"><img src="'+esc(safeImageUrl(p.image))+'" alt="'+esc(p.name)+'" loading="lazy"></a><div class="route-card-copy"><div class="product-brand">'+esc(p.brand)+'</div><h3><a href="#product/'+encodeURIComponent(p.id)+'" data-view="'+esc(p.id)+'">'+esc(p.name)+'</a></h3><p>'+money(p.price)+'</p><a class="button light" href="#product/'+encodeURIComponent(p.id)+'" data-view="'+esc(p.id)+'">View product</a></div></article>').join('')+'</div>':'<div class="route-empty">No published products currently match this category.</div>';
 infoRoute('IQA WATCHES · CATEGORIES',selectedCategory||'Shop by category','Explore categories derived from approved catalogue attributes.',selectedCategory?'<p><a class="button light" href="#categories">All categories</a></p>'+cards(matches):'<div class="route-grid">'+values.map(v=>'<article class="route-feature"><h2>'+esc(v)+'</h2><p>'+products.filter(p=>p.category===v||p.audience===v||p.style===v||(Array.isArray(p.tags)&&p.tags.includes(v))).length+' matching catalogue item(s)</p><a class="button light" href="#categories/'+encodeURIComponent(v)+'">Explore category</a></article>').join('')+'</div>');
}
function renderDelivery(){
 infoRoute('IQA WATCHES · DELIVERY','Delivery information','Delivery coverage and estimates will be displayed only after verified shipping configuration is connected.',
 '<div class="route-feature"><h2>Delivery setup is not active</h2><p>PIN-code serviceability, courier partners, shipping charges, handling times and delivery estimates are not currently connected to this storefront.</p><p>No delivery date, fee or serviceability promise can be made from this page. Checkout remains disabled.</p><a class="button light" href="#faq">Read FAQs</a> <a class="button light" href="#policies">Store policies</a></div>');
}
function render(){
 try{
 const raw=(location.hash||'#home').slice(1),parts=raw.split('/'),r=parts[0]||'home';
 let arg='';try{arg=decodeURIComponent(parts.slice(1).join('/')||'')}catch(_){arg=''}
 if(!root)return;
 root.hidden=false;
 if(r==='home'){root.classList.add('hidden');Array.from(document.getElementById('home').children).forEach(x=>{if(x!==root)x.classList.remove('hidden')});return}
 Array.from(document.getElementById('home').children).forEach(x=>{if(x!==root)x.classList.add('hidden')});
 root.classList.remove('hidden');window.scrollTo(0,0);
 if(r==='product')return product(arg);
 if(r==='buy-now')return renderBuyNow(arg);
 if(r==='bag'||r==='cart')return renderBagRoute();
 if(r==='wishlist')return renderWishlistRoute();
 if(r==='payment'){showHomeSection('payment');return;}
 if(r==='checkout'||r==='checkout-review'||r==='checkout-payment')return renderCheckoutRoute();
 if(r==='login')return renderAuth('login');
 if(r==='signup')return renderAuth('signup');
 if(r==='account'||r==='profile')return renderAccount();
 if(r==='orders'||r==='tracking'||r==='addresses'||r==='reviews'||r==='support'||r==='returns'||r==='coupons'||r==='offers')return renderCustomerDataPage(r);
 if(r==='compare'){infoRoute('IQA WATCHES · COMPARISON','Compare watches','Review selected watches side by side using the comparison tool on the home page.','<div class="route-feature"><p>Choose watches from the collection and add them to comparison. Your selected items are kept in this browser.</p><a class="button" href="#comparison">Open comparison tool</a></div>');return;}
 if(r==='brands')return renderBrands(arg);
 if(r==='categories'||r==='category')return renderCategories(arg);
 if(r==='delivery'||r==='shipping')return renderDelivery();
 if(r==='search')return renderSearch();
 if(r==='about'||r==='story')return renderAbout();
 if(r==='faq')return renderFaq();
 if(r==='policies')return renderPolicies();
 if(r==='contact')return renderContact();

 if(r==='care')return renderPolicies();
 if(r==='recently-viewed'){infoRoute('IQA WATCHES · SAVED','Recently viewed','Your recently viewed watches will appear here soon.','<div class="route-feature"><p class="route-disabled">Coming soon — a private list of the watches you have recently explored is being prepared.</p><a class="button" href="#shop">Explore watches</a></div>');return;}
 if(r==='journal'){infoRoute('IQA WATCHES · JOURNAL','The Watch Journal is coming soon','Guides, watch-care notes and product education are being prepared.','<div class="route-feature"><p>We will publish model-specific guides only when product details and manufacturer information have been verified.</p><a class="button" href="#shop">Explore watches</a></div>');return;}
 if(r==='smart-shopping'||r==='finder'){showHomeSection('smart-shopping');return;}
 if(r==='comparison'||r==='compareCard'){showHomeSection('compareCard');return;}
 if(['shop','men','women','unisex','new-arrivals','bestsellers'].includes(r)){
  const collection=collectionForRoute(r),matching=products.filter(collection.matches);
  root.innerHTML=hero('IQA WATCHES · COLLECTION',collection.title,collection.description)+'<div class="route-content"><div id="routeCatalogue" class="route-grid" style="margin-top:22px"></div></div>';
  const grid=$r('routeCatalogue');
  grid.innerHTML=matching.length?matching.map(p=>'<article class="route-card"><a href="#product/'+encodeURIComponent(p.id)+'" data-view="'+esc(p.id)+'"><img src="'+esc(safeImageUrl(p.image))+'" alt="'+esc(p.name)+'" loading="lazy"></a><div class="route-card-copy"><div class="product-brand">'+esc(p.brand)+'</div><h3><a href="#product/'+encodeURIComponent(p.id)+'" data-view="'+esc(p.id)+'">'+esc(p.name)+'</a></h3><p>'+money(p.price)+' · '+Number(p.stock)+' available</p><a class="button light" href="#product/'+encodeURIComponent(p.id)+'" data-view="'+esc(p.id)+'">View product</a></div></article>').join(''):'<div class="route-empty">No watches currently match this collection. Products appear here only when the approved catalogue includes the required audience or collection tag. <a href="#shop">Browse all watches</a>.</div>';
  return;
 }
 root.innerHTML=hero('IQA WATCHES','Page not found','This destination is unavailable.')+'<div class="route-content"><a class="button" href="#home">Home</a> <a class="button light" href="#shop">Shop All</a></div>';
 }catch(error){
  console.error('IQA WATCHES route render failed:',error);
  if(root){root.hidden=false;root.classList.remove('hidden');root.innerHTML=hero('IQA WATCHES · PAGE ERROR','This page could not be displayed','The page encountered a rendering problem.')+'<div class="route-content"><div class="route-disabled" role="alert">Please reload the page or return to the home page. No order or account changes were made.</div><a class="button light" href="#home">Return home</a></div>';}
 }
}
document.addEventListener('click',e=>{if(e.target.closest('[data-qty],[data-remove],[data-add],[data-wish]'))setTimeout(()=>{const route=(location.hash||'').slice(1);if(['bag','cart','wishlist'].includes(route))render();},0);});
// Explicitly open the customer area on every account-link tap, even if #account is already active.
document.addEventListener('click',e=>{const link=e.target.closest('a[href="#account"]');if(!link)return;e.preventDefault();if(location.hash!=='#account')location.hash='account';render();});
window.addEventListener('hashchange',render);
window.addEventListener('load',render);
window.addEventListener('pageshow',render);
window.addEventListener('catalogue:ready',render);
window.addEventListener('catalogue:error',render);
function setRouteGalleryIndex(index){const main=document.getElementById('routeMainImage');if(!main)return;const thumbs=Array.from(document.querySelectorAll('[data-gallery-src]'));const total=Math.max(1,thumbs.length);const next=(index+total)%total;if(thumbs.length){const thumb=thumbs[next];main.src=thumb.dataset.gallerySrc;main.alt=thumb.dataset.galleryAlt||main.alt;thumbs.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===next)));}main.dataset.galleryIndex=String(next);const count=document.querySelector('.route-gallery-count');if(count)count.textContent=(next+1)+' / '+total;}
document.addEventListener('click',e=>{const thumb=e.target.closest('[data-gallery-src]');if(thumb){const thumbs=Array.from(document.querySelectorAll('[data-gallery-src]'));setRouteGalleryIndex(thumbs.indexOf(thumb));}const add=e.target.closest('[data-add-compare]');if(add)location.hash='comparison'});

function ensureIqaImageLightbox(){
 let layer=document.getElementById('iqa-image-lightbox');
 if(layer)return layer;
 layer=document.createElement('section');
 layer.id='iqa-image-lightbox';
 layer.setAttribute('role','dialog');
 layer.setAttribute('aria-modal','true');
 layer.setAttribute('aria-label','Full-screen product image');
 layer.innerHTML='<div class="iqa-lightbox-toolbar"><span class="iqa-lightbox-count" aria-live="polite"></span><div class="iqa-lightbox-controls"><button type="button" data-lightbox-zoom aria-label="Zoom image" title="Zoom">⌕</button><button type="button" data-lightbox-close aria-label="Close full-screen image" title="Close">×</button></div></div><div class="iqa-lightbox-stage"><button type="button" data-lightbox-prev aria-label="Previous image">‹</button><img alt="" draggable="false"><button type="button" data-lightbox-next aria-label="Next image">›</button></div><div class="iqa-lightbox-caption"></div>';
 document.body.appendChild(layer);
 const close=()=>{layer.classList.remove('open');document.body.classList.toggle('locked',!!(document.getElementById('drawer')?.classList.contains('open')||document.getElementById('modalWrap')?.classList.contains('open')||document.getElementById('mobileMenu')?.classList.contains('open')));if(layer.returnFocus?.isConnected)layer.returnFocus.focus();};
 layer.querySelector('[data-lightbox-close]').addEventListener('click',close);
 layer.addEventListener('click',event=>{if(event.target===layer)close()});
 layer.querySelector('[data-lightbox-prev]').addEventListener('click',()=>window.iqaStepImageLightbox(-1));
 layer.querySelector('[data-lightbox-next]').addEventListener('click',()=>window.iqaStepImageLightbox(1));
 layer.querySelector('[data-lightbox-zoom]').addEventListener('click',()=>{const image=layer.querySelector('img');image.classList.toggle('is-zoomed');layer.querySelector('[data-lightbox-zoom]').setAttribute('aria-label',image.classList.contains('is-zoomed')?'Reset image zoom':'Zoom image')});
 document.addEventListener('keydown',event=>{if(!layer.classList.contains('open'))return;if(event.key==='Escape'){event.preventDefault();close()}else if(event.key==='ArrowRight')window.iqaStepImageLightbox(1);else if(event.key==='ArrowLeft')window.iqaStepImageLightbox(-1)});
 return layer;
}
window.iqaImageLightboxState={items:[],index:0};
window.iqaStepImageLightbox=function(delta){
 const state=window.iqaImageLightboxState,layer=document.getElementById('iqa-image-lightbox');
 if(!layer||!state.items.length)return;
 state.index=(state.index+delta+state.items.length)%state.items.length;
 const item=state.items[state.index],image=layer.querySelector('img');
 image.src=item.src;image.alt=item.alt;image.classList.remove('is-zoomed');
 layer.querySelector('.iqa-lightbox-count').textContent=(state.index+1)+' / '+state.items.length;
 layer.querySelector('.iqa-lightbox-caption').textContent=item.alt;
 layer.querySelector('[data-lightbox-prev]').disabled=state.items.length<2;
 layer.querySelector('[data-lightbox-next]').disabled=state.items.length<2;
};
window.iqaOpenImageLightbox=function(items,index){
 const safe=(Array.isArray(items)?items:[]).map(item=>({src:safeImageUrl(item.src||item.image||item.image_url),alt:String(item.alt||item.alt_text||'IQA WATCHES product image')})).filter(item=>item.src);
 if(!safe.length)return;
 const layer=ensureIqaImageLightbox();
 layer.returnFocus=document.activeElement;
 window.iqaImageLightboxState={items:safe,index:Math.max(0,Math.min(Number(index)||0,safe.length-1))};
 layer.classList.add('open');document.body.classList.add('locked');
 window.iqaStepImageLightbox(0);
 layer.querySelector('[data-lightbox-close]').focus();
};
document.addEventListener('click',event=>{
 const image=event.target.closest('#routeMainImage,#productModalMainImage');
 if(!image)return;
 if(image.id==='productModalMainImage'){
  window.iqaOpenImageLightbox(window.iqaCurrentModalGallery||[{src:image.src,alt:image.alt}],window.iqaCurrentModalGalleryIndex||0);
  return;
 }
 const id=decodeURIComponent((location.hash.split('/')[1]||''));
 const productItem=products.find(item=>item.id===id);
 const gallery=(Array.isArray(productItem?.gallery)?productItem.gallery:[]).map(item=>({src:item.src||item.image_url,alt:item.alt||item.alt_text||productItem.name}));
 if(productItem?.image&&!gallery.some(item=>safeImageUrl(item.src)===safeImageUrl(productItem.image)))gallery.unshift({src:productItem.image,alt:productItem.imageAlt||productItem.name});
 const current=gallery.findIndex(item=>safeImageUrl(item.src)===safeImageUrl(image.src));
 window.iqaOpenImageLightbox(gallery,current<0?0:current);
});
document.addEventListener('keydown',event=>{
 if((event.key==='Enter'||event.key===' ')&&event.target.matches('#routeMainImage,#productModalMainImage')){event.preventDefault();event.target.click()}
});
document.addEventListener('click',event=>{
 const checkout=event.target.closest('[data-buy-now-checkout]');
 if(checkout){
  const selection=window.iqaBuyNowSelection,productItem=products.find(item=>item.id===selection?.productId);
  if(!productItem){toast('Please select a watch again.');return;}
  const quantity=Math.max(1,Math.min(Number(selection.quantity)||1,Number(productItem.stock)||1));
  for(let index=0;index<quantity;index++){if(!addCart(productItem.id))return;}
  location.hash='checkout';return;
 }
 const control=event.target.closest('[data-buy-qty]');
 if(!control)return;
 const state=window.iqaBuyNowSelection,productItem=products.find(item=>item.id===state?.productId);
 if(!productItem)return;
 const next=Math.max(1,Math.min(Number(productItem.stock)||1,Number(state.quantity||1)+Number(control.dataset.buyQty)));
 window.iqaBuyNowSelection={productId:productItem.id,quantity:next};
 render();
});

window.renderRouteFromHash=render;
render();
})();
/* Reliable touch/pointer swipe for the product-detail gallery. */
(function(){
 let active=null;
 function currentGallery(){return typeof document.querySelector==='function'?document.querySelector('.route-gallery-main'):null;}
 function select(delta){
  const gallery=currentGallery();if(!gallery)return;
  const image=gallery.querySelector('#routeMainImage');
  const thumbs=Array.from(document.querySelectorAll('[data-gallery-src]'));
  if(!image||thumbs.length<2)return;
  let index=thumbs.findIndex(button=>button.dataset.gallerySrc===image.getAttribute('src')||button.dataset.gallerySrc===image.src);
  if(index<0)index=0;
  thumbs[(index+delta+thumbs.length)%thumbs.length].click();
  gallery.dataset.swipeMoved='true';
  let counter=gallery.querySelector('.route-gallery-count');
  if(!counter){counter=document.createElement('span');counter.className='route-gallery-count';gallery.appendChild(counter);}
  const nextCount=((index+delta+thumbs.length)%thumbs.length+1)+' / '+thumbs.length;if(counter.textContent!==nextCount)counter.textContent=nextCount;
 }
 document.addEventListener('pointerdown',event=>{
  const gallery=event.target.closest('.route-gallery-main');if(!gallery)return;
  active={gallery,x:event.clientX,y:event.clientY,id:event.pointerId};
 },{passive:true});
 document.addEventListener('pointerup',event=>{
  if(!active||active.id!==event.pointerId)return;
  const dx=event.clientX-active.x,dy=event.clientY-active.y,gallery=active.gallery;active=null;
  if(Math.abs(dx)>48&&Math.abs(dx)>Math.abs(dy)*1.2){select(dx<0?1:-1);}
 },{passive:true});
 document.addEventListener('pointercancel',()=>{active=null},{passive:true});
 document.addEventListener('click',event=>{
  const image=event.target.closest('#routeMainImage');
  if(!image)return;
  const gallery=image.closest('.route-gallery-main');
  if(gallery&&gallery.dataset.swipeMoved==='true'){delete gallery.dataset.swipeMoved;event.preventDefault();event.stopImmediatePropagation();}
 },true);
 function install(){
  const gallery=currentGallery();if(!gallery)return;
  const thumbs=Array.from(document.querySelectorAll('[data-gallery-src]'));
  if(thumbs.length<2)return;
  let counter=gallery.querySelector('.route-gallery-count');
  if(!counter){counter=document.createElement('span');counter.className='route-gallery-count';gallery.appendChild(counter);}
  const image=gallery.querySelector('#routeMainImage');
  const index=thumbs.findIndex(button=>button.dataset.gallerySrc===image?.getAttribute('src')||button.dataset.gallerySrc===image?.src);
  const nextCount=(Math.max(0,index)+1)+' / '+thumbs.length;if(counter.textContent!==nextCount)counter.textContent=nextCount;
 }
 const root=document.getElementById('routeView');
 if(root&&'MutationObserver' in window)new MutationObserver(install).observe(root,{childList:true,subtree:true});
 document.addEventListener('DOMContentLoaded',install);window.addEventListener('load',install);window.addEventListener('hashchange',install);
})();

(function(){
 function installControls(){
  if(typeof document.querySelector!=='function'||typeof document.querySelectorAll!=='function')return;
  const gallery=document.querySelector('.route-gallery-main');
  const image=gallery&&gallery.querySelector('#routeMainImage');
  const thumbs=Array.from(document.querySelectorAll('[data-gallery-src]'));
  if(!gallery||!image||thumbs.length<2||gallery.querySelector('.route-gallery-controls'))return;
  const controls=document.createElement('div');controls.className='route-gallery-controls';
  const prev=document.createElement('button');prev.type='button';prev.textContent='‹';prev.setAttribute('aria-label','Previous product image');
  const next=document.createElement('button');next.type='button';next.textContent='›';next.setAttribute('aria-label','Next product image');
  const count=document.createElement('span');count.className='route-gallery-count';count.setAttribute('aria-live','polite');
  function move(delta){
   const current=thumbs.findIndex(button=>button.dataset.gallerySrc===image.getAttribute('src')||button.dataset.gallerySrc===image.src);
   const index=(Math.max(0,current)+delta+thumbs.length)%thumbs.length;
   thumbs[index].click();count.textContent=(index+1)+' / '+thumbs.length;
  }
  prev.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));
  controls.append(prev,count,next);gallery.appendChild(controls);
  const current=thumbs.findIndex(button=>button.dataset.gallerySrc===image.getAttribute('src')||button.dataset.gallerySrc===image.src);
  count.textContent=(Math.max(0,current)+1)+' / '+thumbs.length;
 }
 const root=document.getElementById('routeView');
 if(root&&'MutationObserver' in window)new MutationObserver(installControls).observe(root,{childList:true,subtree:true});
 document.addEventListener('DOMContentLoaded',installControls);window.addEventListener('load',installControls);window.addEventListener('hashchange',installControls);
})();

/* The full-screen image viewer must also respond to horizontal swipes. */
(function(){
 function attach(){
  if(typeof document.querySelector!=='function')return;
  const stage=document.querySelector('#iqa-image-lightbox .iqa-lightbox-stage');
  if(!stage||stage.dataset.swipeReady==='true')return;
  stage.dataset.swipeReady='true';
  let start=null;
  stage.addEventListener('pointerdown',event=>{start={x:event.clientX,y:event.clientY,id:event.pointerId}},{passive:true});
  stage.addEventListener('pointerup',event=>{
   if(!start||start.id!==event.pointerId)return;
   const dx=event.clientX-start.x,dy=event.clientY-start.y;start=null;
   if(Math.abs(dx)>48&&Math.abs(dx)>Math.abs(dy)*1.2&&typeof window.iqaStepImageLightbox==='function')window.iqaStepImageLightbox(dx<0?1:-1);
  },{passive:true});
  stage.addEventListener('pointercancel',()=>{start=null},{passive:true});
 }
 if('MutationObserver' in window)new MutationObserver(attach).observe(document.body,{childList:true,subtree:true});
 attach();
})();
