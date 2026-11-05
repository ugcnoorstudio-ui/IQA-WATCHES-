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
  }catch(e){status.textContent='Migration failed: '+(e?.message||String(e));status.style.color='#9b3b2f';button.textContent='Retry migration';}
  finally{busy=false;button.disabled=false;}
 });
 box.append(title,copy,button,status);
 host.prepend(box);
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