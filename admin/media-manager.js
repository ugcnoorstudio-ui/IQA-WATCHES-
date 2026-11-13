(()=>{'use strict';
const STATIC=[
 {id:'home-hero',label:'Homepage hero',group:'Homepage',alt:'Homepage hero watch image'},
 {id:'collection-classic',label:'Classic collection',group:'Homepage',alt:'Classic watch collection image'},
 {id:'collection-sport',label:'Sport collection',group:'Homepage',alt:'Sport watch collection image'},
 {id:'collection-editorial',label:'Editorial collection',group:'Homepage',alt:'Editorial watch collection image'},
 {id:'collection-modern',label:'Modern collection',group:'Homepage',alt:'Modern watch collection image'},
 {id:'editorial-detail',label:'Editorial detail',group:'Homepage',alt:'Editorial watch detail image'}
];
const CATEGORIES=[
 {id:'collection-classic',label:'Men’s Watches',alt:'Classic watch category'},
 {id:'collection-sport',label:'Women’s Watches',alt:'Sport watch category'},
 {id:'collection-editorial',label:'Unisex Watches',alt:'Unisex watch category'},
 {id:'collection-modern',label:'New Arrivals',alt:'New arrivals category'}
];
const EDITORIAL=[
 {id:'home-hero',label:'Story · Beginning',alt:'Editorial watch silhouette'},
 {id:'collection-editorial',label:'Story · Movement',alt:'Editorial watch dial'},
 {id:'collection-modern',label:'Story · Craft',alt:'Editorial watch detail'},
 {id:'collection-sport',label:'Story · Details',alt:'Editorial watch case and strap'},
 {id:'editorial-detail',label:'Story · Timepiece',alt:'Editorial complete watch'}
];
const BRAND=[
 {id:'iqa-watches-favicon',label:'IQA favicon',ext:'svg'},
 {id:'iqa-watches-header-logo',label:'Header logo',ext:'svg'},
 {id:'iqa-watches-primary-logo',label:'Primary logo',ext:'svg'}
];
const CLOUD='https://res.cloudinary.com/rrmdzam7/image/upload/';
let active='Product', busy=false, productRows=[], productNames=new Map(), cloudResources=[], unlinkedResult=null, b2Client=null;
const B2_STAGING_URL='https://qcxgsomqxfoueootxzpv.supabase.co';
const B2_STAGING_KEY='sb_publishable_EmGoVBFk35Mc7om3eULcgw_tmEXAAA5';
function getB2Client(){if(!window.supabase||typeof window.supabase.createClient!=='function')throw new Error('Supabase JS SDK is unavailable. Reload the admin page.');if(!b2Client)b2Client=window.supabase.createClient(B2_STAGING_URL,B2_STAGING_KEY,{auth:{persistSession:true,autoRefreshToken:true,storageKey:'iqa-b2-staging-auth-v1'}});return b2Client;}
const tabs=['Product','Homepage','Category','Editorial','Unassigned','Failed Uploads','B2 STAGING TEST'];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function cloudUrl(id,ext='jpg',width=900){return CLOUD+(ext==='svg'?'':('c_limit,w_'+width+'/f_auto/q_auto/'))+id+'.'+ext}
function optimized(url,width=900){if(typeof url!=='string'||!url.startsWith('https://res.cloudinary.com/'))return '';return url.replace('/image/upload/','/image/upload/c_limit,w_'+width+'/f_auto/q_auto/')}
function assetUrl(publicId,width=900,vector=false){const asset=cloudResources.find(x=>x.public_id===publicId);if(!asset||!asset.secure_url)return '';return vector?asset.secure_url:optimized(asset.secure_url,width)}
function card(label,alt,url,meta,actions=''){const preview=url?'<img src="'+esc(url)+'" alt="'+esc(alt)+'" loading="lazy" style="max-width:100%;max-height:150px;object-fit:contain">':'<span class="muted" style="font-size:11px">Preview pending / unavailable</span>';return '<article class="panel" style="padding:12px;min-width:0"><div style="height:150px;display:grid;place-items:center;background:#111210;border:1px solid var(--line);border-radius:4px;overflow:hidden">'+preview+'</div><h3 style="margin:10px 0 4px">'+esc(label)+'</h3><p class="muted" style="font-size:11px;overflow-wrap:anywhere;margin:0 0 8px">'+esc(meta)+'</p>'+actions+'</article>'}
function grid(items){return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px">'+items.join('')+'</div>'}
function failedRows(){try{return window.IQA_ADMIN_BACKEND?.listFailedImageUploads?.()||[]}catch(_){return []}}
function setStatus(host,message,isError=false){const el=host.querySelector('[data-media-status]');if(el){el.textContent=message;el.style.color=isError?'var(--red)':'var(--green)'}}
function tabBody(){
 if(active==='Product'){
  if(!productRows.length)return '<div class="panel"><p class="muted">No Cloudinary product images found yet. Uploads added through Product Management will appear here.</p></div>';
  return grid(productRows.map(row=>{const url=optimized(row.image_url);const name=productNames.get(row.product_id)||row.product_id;return card(name,row.alt_text||name,url,'Product ID '+row.product_id+' · '+(row.cloudinary_public_id||'Cloudinary ID missing')+(row.is_primary?' · Primary':''));}));
 }
 if(active==='Homepage'){
  const brandCards=BRAND.map(x=>{const url=assetUrl('iqa-watches/brand/'+x.id,900,true);return card(x.label,x.label,url,url?'Brand SVG · live Cloudinary asset':'SVG source ready · migration not yet verified')});
  return '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px"><button class="btn primary" data-migrate-brand>Migrate 3 brand SVGs to Cloudinary</button></div>'+grid([...STATIC.map(x=>card(x.label,x.alt,assetUrl('iqa-watches/static/'+x.id)||cloudUrl('iqa-watches/static/'+x.id),'Homepage static asset · live Cloudinary library')), ...brandCards]);
 }
 if(active==='Category')return grid(CATEGORIES.map(x=>card(x.label,x.alt,assetUrl('iqa-watches/static/'+x.id)||cloudUrl('iqa-watches/static/'+x.id),'Category image · shared Cloudinary asset')));
 if(active==='Editorial')return grid(EDITORIAL.map(x=>card(x.label,x.alt,assetUrl('iqa-watches/static/'+x.id)||cloudUrl('iqa-watches/static/'+x.id),'Editorial story image · shared Cloudinary asset')));
 if(active==='Unassigned'){
  const rows=cloudResources.filter(x=>x.public_id.startsWith('iqa-watches/unassigned-review/'));
  if(rows.length)return grid(rows.map(x=>card(x.public_id.split('/').pop(),x.public_id,optimized(x.secure_url),'Unassigned · '+x.bytes+' bytes · '+x.public_id)));
  return '<div class="panel"><h3>No unassigned Cloudinary assets yet</h3><p class="muted">One legacy image is waiting for a safe review copy. It will not be linked to a product and its Supabase original will remain untouched.</p><button class="btn primary" data-copy-unlinked>Copy to Cloudinary review folder</button></div>';
 }
 if(active==='B2 STAGING TEST')return '<div class="panel"><h3>Backblaze B2 · STAGING upload test</h3><p class="muted">Isolated test only. This uses the STAGING Supabase project and private Backblaze bucket. It does not create or change a product record and does not replace Cloudinary. First enter the existing admin panel using your normal admin login; then sign in separately to STAGING below. STAGING currently has no Auth users or Owner profile, so upload cannot pass Owner verification until an already-authorized STAGING Owner account exists. Do not create a user to bypass the monthly quota.</p><form data-b2-login-form><div class="form-grid"><div class="field"><label for="b2StageEmail">STAGING staff email</label><input id="b2StageEmail" name="email" type="email" autocomplete="username" required></div><div class="field"><label for="b2StagePassword">STAGING password</label><input id="b2StagePassword" name="password" type="password" autocomplete="current-password" required></div></div><div class="toolbar"><button class="btn primary" type="submit">Sign in to STAGING</button><button class="btn secondary" type="button" data-b2-logout>Sign out of STAGING</button></div></form><form data-b2-upload-form><div class="field"><label for="b2StageImage">Test image · JPG, PNG, WebP or AVIF · up to 5 MB</label><input id="b2StageImage" name="image" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required></div><div class="toolbar"><button class="btn primary" type="submit">Upload test image to B2</button></div></form><div data-b2-preview class="tool-result" aria-live="polite"></div></div>';
 if(active==='Failed Uploads'){
  const rows=failedRows();
  if(!rows.length)return '<div class="panel"><h3>No failed uploads recorded</h3><p class="muted">If an upload fails, its product and file details will appear here so you can retry with the original file selected again.</p></div>';
  return grid(rows.map(row=>card(row.fileName||'Failed image upload','Failed upload', '', 'Product '+row.productId+' · '+row.error+' · '+new Date(row.createdAt).toLocaleString(),'<button class="btn secondary" data-retry-upload="'+esc(row.id)+'">Retry with file</button>')));
 }
 return '';
}
async function loadProducts(){
 const api=window.IQA_ADMIN_BACKEND;
 if(!api||!api.currentProfile())throw new Error('Owner session is not ready. Sign in again, then refresh the library.');
 api.requireRole(['owner']);
 const [media,products,library]=await Promise.all([
  api.readTable('product_media','id,product_id,image_url,cloudinary_public_id,alt_text,sort_order,is_primary',{limit:100,orderBy:'sort_order'}),
  api.readTable('products','id,name,sku',{limit:100}),
  api.getClient().functions.invoke('iqa-cloudinary-media-library',{body:{}})
 ]);
 if(library.error)throw library.error;
 if(!library.data||library.data.ok!==true||!Array.isArray(library.data.resources))throw new Error(library.data?.error||'Cloudinary media library response was not confirmed.');
 cloudResources=library.data.resources;
 productNames=new Map(products.map(p=>[p.id,p.name||p.sku||p.id]));
 productRows=media.filter(x=>typeof x.image_url==='string'&&x.image_url.includes('res.cloudinary.com')).sort((a,b)=>(a.product_id||'').localeCompare(b.product_id||'')||(a.sort_order||0)-(b.sort_order||0));
}
function mount(){
 const host=document.getElementById('content'),api=window.IQA_ADMIN_BACKEND;
 if(!host||!api||!api.currentProfile()||host.querySelector('[data-cloudinary-media-manager]'))return;
 const route=(location.hash.replace(/^#/,'')||'overview');
 if(route!=='overview'&&route!=='health')return;
 const box=document.createElement('section');box.className='panel';box.setAttribute('data-cloudinary-media-manager','');
 const head=document.createElement('div');head.className='panel-head';
 const title=document.createElement('h3');title.textContent='Cloudinary Media Manager';
 const refresh=document.createElement('button');refresh.className='btn secondary';refresh.type='button';refresh.textContent='Refresh library';
 head.append(title,refresh);
 const description=document.createElement('p');description.className='muted';description.textContent='Owner-only live Cloudinary library. Product records are matched with product_media; homepage, category, editorial, brand and unassigned assets are listed from Cloudinary Admin API.';
 const tabbar=document.createElement('div');tabbar.style.cssText='display:flex;flex-wrap:wrap;gap:7px;margin:14px 0';
 const body=document.createElement('div');body.setAttribute('data-media-body','');
 const status=document.createElement('p');status.className='muted';status.setAttribute('data-media-status','');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 function render(){
  tabbar.innerHTML=tabs.map(t=>'<button type="button" class="btn '+(active===t?'primary':'secondary')+'" data-media-tab="'+esc(t)+'">'+esc(t)+'</button>').join('');
  body.innerHTML=tabBody();
 }
 async function refreshData(){
  if(refresh.disabled)return;
  refresh.disabled=true;
  const originalLabel='Refresh library';
  refresh.textContent='Refreshing…';
  setStatus(box,'Refreshing Cloudinary assets and product media records…');
  try{
   await loadProducts();
   render();
   setStatus(box,'Library refreshed. '+cloudResources.length+' Cloudinary assets and '+productRows.length+' product media records loaded.');
  }catch(e){
   setStatus(box,'Could not refresh library: '+(e?.message||String(e)),true);
  }finally{
   refresh.disabled=false;
   refresh.textContent=originalLabel;
  }
 }
 tabbar.addEventListener('click',e=>{const b=e.target.closest('[data-media-tab]');if(!b)return;active=b.getAttribute('data-media-tab');render()});
 body.addEventListener('submit',async e=>{
  const login=e.target.closest('[data-b2-login-form]');
  if(login){
   e.preventDefault();
   const submit=login.querySelector('button[type="submit"]');
   if(submit)submit.disabled=true;
   setStatus(box,'Signing in to the separate STAGING Supabase project…');
   try{
    const form=new FormData(login);
    const {data,error}=await getB2Client().auth.signInWithPassword({email:String(form.get('email')||'').trim(),password:String(form.get('password')||'')});
    if(error)throw error;
    if(!data?.session?.access_token)throw new Error('STAGING did not return an authenticated session.');
    setStatus(box,'STAGING sign-in succeeded. The upload function will now independently verify active Owner permission.');
   }catch(err){setStatus(box,'STAGING sign-in failed: '+(err?.message||String(err)),true)}
   finally{if(submit)submit.disabled=false}
   return;
  }
  const upload=e.target.closest('[data-b2-upload-form]');
  if(upload){
   e.preventDefault();
   const submit=upload.querySelector('button[type="submit"]');
   const file=upload.querySelector('input[type="file"]')?.files?.[0];
   if(!file){setStatus(box,'Choose a test image first.',true);return}
   if(submit){submit.disabled=true;submit.textContent='Uploading to STAGING…'}
   setStatus(box,'Checking STAGING Owner session and uploading a private B2 test object…');
   try{
    const {data:sessionData,error:sessionError}=await getB2Client().auth.getSession();
    if(sessionError)throw sessionError;
    if(!sessionData?.session?.access_token)throw new Error('Sign in to the STAGING project first.');
    const payload=new FormData();payload.append('image',file,file.name||'b2-staging-test-image');
    const {data,error}=await getB2Client().functions.invoke('iqa-b2-media-upload',{body:payload});
    if(error)throw error;
    if(!data||data.ok!==true||typeof data.download_url!=='string')throw new Error(data?.error||'B2 upload was not confirmed.');
    const preview=box.querySelector('[data-b2-preview]');
    if(preview){preview.replaceChildren();const image=document.createElement('img');image.src=data.download_url;image.alt='Private Backblaze B2 STAGING test upload';image.loading='lazy';image.style.cssText='display:block;max-width:100%;max-height:260px;object-fit:contain;margin:12px 0';const details=document.createElement('p');details.className='muted';details.textContent='Private object: '+String(data.object_key||'')+' · Signed preview expires in '+String(data.download_url_expires_in_seconds||600)+' seconds.';preview.append(image,details)}
    setStatus(box,'SUCCESS: image uploaded to private Backblaze B2 STAGING. No product record changed.');
   }catch(err){setStatus(box,'B2 STAGING upload failed: '+(err?.message||String(err)),true)}
   finally{if(submit){submit.disabled=false;submit.textContent='Upload test image to B2'}}
   return;
  }
 });
 body.addEventListener('click',async e=>{
  const logout=e.target.closest('[data-b2-logout]');
  if(logout){try{if(b2Client)await b2Client.auth.signOut({scope:'local'});setStatus(box,'Signed out of the separate STAGING session.')}catch(err){setStatus(box,'STAGING sign-out failed: '+(err?.message||String(err)),true)}return}
 });
 body.addEventListener('click',async e=>{
  const migrate=e.target.closest('[data-migrate-brand]');
  if(migrate){
   if(busy)return;
   if(!window.confirm('Copy the three reviewed IQA brand SVGs into Cloudinary? Existing website logo/favicon references will not change until the upload is verified.'))return;
   busy=true;migrate.disabled=true;migrate.textContent='Migrating SVGs…';setStatus(box,'Checking owner session and copying three SVG assets…');
   try{api.requireRole(['owner']);const {data,error}=await api.getClient().functions.invoke('iqa-migrate-brand-assets',{body:{}});if(error)throw error;if(!data||!Array.isArray(data.results))throw new Error(data?.error||'Migration response was not confirmed.');try{localStorage.setItem('iqaCloudinaryBrandAssets',JSON.stringify(data))}catch(_){}const ok=data.results.filter(x=>x.status==='migrated').length;active='Homepage';await refreshData();setStatus(box,ok+' of 3 brand SVGs copied and verified. '+(ok===3?'Ready to switch website references.':'Review failed assets before switching website references.'),ok!==3)}catch(err){setStatus(box,'Brand SVG migration failed: '+(err?.message||String(err)),true);migrate.disabled=false;migrate.textContent='Retry brand SVG migration'}finally{busy=false}
   return;
  }
  const copy=e.target.closest('[data-copy-unlinked]');
  if(copy){
   if(busy)return;
   if(!window.confirm('Copy the one unlinked legacy image to Cloudinary review folder? No product will be changed and no Supabase file will be deleted.'))return;
   busy=true;copy.disabled=true;copy.textContent='Copying…';setStatus(box,'Copying the fixed legacy image securely…');
   try{api.requireRole(['owner']);const {data,error}=await api.getClient().functions.invoke('iqa-migrate-unlinked-review',{body:{}});if(error)throw error;if(!data||data.ok!==true||data.status!=='copied_for_review'||!data.secure_url)throw new Error(data?.error||'Copy could not be verified.');unlinkedResult=data;try{localStorage.setItem('iqaCloudinaryUnlinkedReview',JSON.stringify(data))}catch(_){}await refreshData();setStatus(box,'Copied for review. Original Supabase file and product records remain unchanged.')}catch(err){setStatus(box,'Copy failed: '+(err?.message||String(err)),true);copy.disabled=false;copy.textContent='Retry copy'}finally{busy=false}
  }
  const retry=e.target.closest('[data-retry-upload]');
  if(retry){
   const id=retry.getAttribute('data-retry-upload'),row=failedRows().find(x=>x.id===id);if(!row)return;
   const picker=document.createElement('input');picker.type='file';picker.accept='image/jpeg,image/png,image/webp,image/avif';picker.hidden=true;box.append(picker);
   picker.addEventListener('change',async()=>{const file=picker.files?.[0];picker.remove();if(!file)return;retry.disabled=true;retry.textContent='Retrying…';try{api.requireRole(['owner']);await api.uploadProductImage(row.productId,file,row.altText||row.fileName,false);api.clearFailedImageUpload?.(id);await refreshData();setStatus(box,'Retry successful. Product image saved to Cloudinary.')}catch(err){setStatus(box,'Retry failed: '+(err?.message||String(err)),true);render()}});
   picker.click();
  }
 });
 refresh.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();void refreshData();});
 box.append(head,description,tabbar,body,status);host.prepend(box);
 refreshData();
}
let queued=false;
function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;mount()})}
function start(){const root=document.getElementById('content');if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true});window.addEventListener('hashchange',schedule);const api=window.IQA_ADMIN_BACKEND;if(api?.onAuthStateChange)try{api.onAuthStateChange(schedule)}catch(_){}schedule()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();