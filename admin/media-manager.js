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
let active='Product', busy=false, productRows=[], productNames=new Map(), cloudResources=[], unlinkedResult=null;
const tabs=['Product','Homepage','Category','Editorial','Unassigned','Failed Uploads'];
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
 if(active==='Failed Uploads'){
  const rows=failedRows();
  if(!rows.length)return '<div class="panel"><h3>No failed uploads recorded</h3><p class="muted">If an upload fails, its product and file details will appear here so you can retry with the original file selected again.</p></div>';
  return grid(rows.map(row=>card(row.fileName||'Failed image upload','Failed upload', '', 'Product '+row.productId+' · '+row.error+' · '+new Date(row.createdAt).toLocaleString(),'<button class="btn secondary" data-retry-upload="'+esc(row.id)+'">Retry with file</button>')));
 }
 return '';
}
async function loadProducts(){
 const api=window.IQA_ADMIN_BACKEND;
 if(!api||!api.currentProfile())return;
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
 async function refreshData(){try{await loadProducts();render();setStatus(box,'Library refreshed. '+cloudResources.length+' Cloudinary assets and '+productRows.length+' product media records loaded.')}catch(e){setStatus(box,'Could not load media records: '+(e?.message||String(e)),true)}}
 tabbar.addEventListener('click',e=>{const b=e.target.closest('[data-media-tab]');if(!b)return;active=b.getAttribute('data-media-tab');render()});
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
 refresh.addEventListener('click',refreshData);
 box.append(head,description,tabbar,body,status);host.prepend(box);
 refreshData();
}
let queued=false;
function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;mount()})}
function start(){const root=document.getElementById('content');if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true});window.addEventListener('hashchange',schedule);const api=window.IQA_ADMIN_BACKEND;if(api?.onAuthStateChange)try{api.onAuthStateChange(schedule)}catch(_){}schedule()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();