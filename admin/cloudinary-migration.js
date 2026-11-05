(()=>{'use strict';
let busy=false;
let scheduled=false;
function scheduleMount(){if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;mount()})}
function mount(){
 const host=document.getElementById('content');
 const api=window.IQA_ADMIN_BACKEND;
 if(!host||!api||!api.currentProfile()||host.querySelector('[data-cloudinary-migration]'))return;
 const route=(location.hash.replace(/^#/,'')||'overview');
 if(route!=='health'&&route!=='overview')return;
 const box=document.createElement('section');
 box.className='panel';
 box.setAttribute('data-cloudinary-migration','');
 box.style.marginBottom='18px';
 const title=document.createElement('h3');title.textContent='Cloudinary media storage';
 const copy=document.createElement('p');copy.className='muted';
 copy.textContent='New product image uploads already use signed Cloudinary uploads. Run this one-time migration to copy existing product-images from Supabase Storage into Cloudinary and update product image references. Original Supabase files are not deleted.';
 const button=document.createElement('button');button.type='button';button.className='btn primary';button.textContent='Migrate existing images to Cloudinary';
 const status=document.createElement('p');status.className='muted';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 button.addEventListener('click',async()=>{
  if(busy)return;
  if(!window.confirm('Start copying existing product images to Cloudinary? Original Supabase files will remain untouched.'))return;
  busy=true;button.disabled=true;button.textContent='Migrating images…';status.textContent='Connecting to the secure migration function…';
  try{
   api.requireRole(['owner']);
   const client=api.getClient();
   const {data:{session},error:sessionError}=await client.auth.getSession();
   if(sessionError||!session?.access_token)throw sessionError||new Error('Your owner session has expired. Sign in again.');
   const {data,error}=await client.functions.invoke('iqa-migrate-storage-to-cloudinary',{body:{}});
   if(error)throw error;
   if(!data||data.ok!==true)throw new Error(data?.error||'Migration was not confirmed.');
   const rows=Array.isArray(data.results)?data.results:[];
   const migrated=rows.filter(x=>x.status==='migrated').length;
   const unlinked=rows.filter(x=>x.status==='uploaded_unlinked_asset').length;
   const failed=rows.filter(x=>!['migrated','uploaded_unlinked_asset'].includes(x.status));
   status.textContent='Migration response: '+migrated+' linked images migrated; '+unlinked+' unlinked files copied; '+failed.length+' errors. '+(failed.length?failed.map(x=>x.path+': '+x.status).join(' | '):'Original Supabase files remain intact.');
   status.style.color=failed.length?'#9b3b2f':'#385947';
   button.textContent=failed.length?'Migration needs review':'Migration completed';
  }catch(e){let detail=e?.message||String(e);try{const response=e?.context;if(response&&typeof response.clone==='function'){const payload=await response.clone().json();if(payload?.missing?.length)detail+=' — Missing secrets: '+payload.missing.join(', ');else if(payload?.error)detail+=' — '+payload.error;}}catch(_){}status.textContent='Migration failed: '+detail;status.style.color='#9b3b2f';button.textContent='Retry migration';}
  finally{busy=false;button.disabled=false;}
 });
 box.append(title,copy,button,status);
 host.prepend(box);

 if(!host.querySelector('[data-cloudinary-static-migration]')){
  const staticBox=document.createElement('section');
  staticBox.className='panel';
  staticBox.setAttribute('data-cloudinary-static-migration','');
  staticBox.style.marginBottom='18px';
  const staticTitle=document.createElement('h3');
  staticTitle.textContent='Homepage & static image migration';
  const staticCopy=document.createElement('p');
  staticCopy.className='muted';
  staticCopy.textContent='Copy the six approved Unsplash watch/editorial images used by the homepage into the IQA WATCHES Cloudinary account. This does not change the live homepage yet; the returned URLs are reviewed before publishing the storefront update.';
  const staticButton=document.createElement('button');
  staticButton.type='button';staticButton.className='btn primary';
  staticButton.textContent='Migrate 6 static images to Cloudinary';
  const staticStatus=document.createElement('p');
  staticStatus.className='muted';staticStatus.setAttribute('role','status');staticStatus.setAttribute('aria-live','polite');
  const staticOutput=document.createElement('pre');
  staticOutput.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;max-height:320px;overflow:auto';
  staticButton.addEventListener('click',async()=>{
   if(busy)return;
   if(!window.confirm('Copy the six homepage/static images from Unsplash into Cloudinary? The live website will not be changed by this step.'))return;
   busy=true;staticButton.disabled=true;staticButton.textContent='Copying static images…';
   staticStatus.textContent='Verifying owner session and copying images securely…';staticOutput.textContent='';
   try{
    api.requireRole(['owner']);
    const {data,error}=await api.getClient().functions.invoke('iqa-migrate-static-cloudinary',{body:{}});
    if(error)throw error;
    if(!data||!Array.isArray(data.results))throw new Error(data?.error||'Migration response was not confirmed.');
    const passed=data.results.filter(x=>x.status==='migrated');
    const failed=data.results.filter(x=>x.status!=='migrated');
    staticStatus.textContent=passed.length+' of '+data.total+' static images copied to Cloudinary; '+failed.length+' need review. Live homepage has not been changed yet.';
    staticStatus.style.color=failed.length?'#9b3b2f':'#385947';
    staticOutput.textContent=JSON.stringify(data.results,null,2);
    staticButton.textContent=failed.length?'Review static image migration':'Static images copied — ready for URL verification';
   }catch(error){
    staticStatus.textContent='Static image migration failed: '+(error?.message||String(error));
    staticStatus.style.color='#9b3b2f';staticButton.textContent='Retry static image migration';
   }finally{busy=false;staticButton.disabled=false;}
  });
  staticBox.append(staticTitle,staticCopy,staticButton,staticStatus,staticOutput);
  host.prepend(staticBox);
 }
}
const observer=new MutationObserver(scheduleMount);
function start(){
 const root=document.getElementById('content');
 if(root)observer.observe(root,{childList:true,subtree:true});
 window.addEventListener('hashchange',scheduleMount);
 const originalRefresh=window.IQA_ADMIN_REFRESH;
 if(typeof originalRefresh==='function')window.IQA_ADMIN_REFRESH=function(){originalRefresh();scheduleMount()};
 const api=window.IQA_ADMIN_BACKEND;
 if(api&&typeof api.onAuthStateChange==='function')try{api.onAuthStateChange(()=>scheduleMount())}catch(_){}
 scheduleMount();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();