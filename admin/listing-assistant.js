(()=>{'use strict';
const KEY='data-iqa-listing-assistant';
function mount(){
 const content=document.getElementById('content');
 if(!content||location.hash.slice(1).split('/')[0]!=='products'||content.querySelector('['+KEY+']'))return;
 const form=content.querySelector('form[data-product-create]');
 if(!form)return;
 const box=document.createElement('section');box.setAttribute(KEY,'');box.className='panel';
 const heading=document.createElement('h2');heading.textContent='ChatGPT listing draft intake';
 const note=document.createElement('p');note.className='muted';note.textContent='Paste product JSON prepared in ChatGPT. This fills the draft form only; it does not save, approve, upload images or publish.';
 const area=document.createElement('textarea');area.rows=8;area.maxLength=12000;area.placeholder='Paste listing JSON here…';area.setAttribute('aria-label','Listing JSON');
 const apply=document.createElement('button');apply.type='button';apply.className='btn secondary';apply.textContent='Validate and fill draft form';
 const status=document.createElement('p');status.className='muted';status.setAttribute('role','status');
 box.append(heading,note,area,apply,status);form.parentElement.insertBefore(box,form);
 apply.addEventListener('click',()=>{
  let data;try{data=JSON.parse(area.value)}catch(e){status.textContent='JSON format is invalid. Paste the complete JSON.';return}
  if(!data||typeof data!=='object'||Array.isArray(data)){status.textContent='Expected one product object.';return}
  const allowed=['name','sku','variant_sku','audience','selling_price','mrp','initial_stock','low_stock_threshold','reason','description'];
  let count=0;const unmatched=[];
  allowed.forEach(key=>{if(data[key]===undefined||data[key]===null)return;const input=form.elements.namedItem(key);if(input){input.value=String(data[key]);count++}});
  ['brand','category'].forEach(key=>{
   if(!data[key])return;
   const input=form.elements.namedItem(key);if(!input)return;
   const wanted=String(data[key]).trim().toLowerCase();
   const option=Array.from(input.options).find(o=>o.value.toLowerCase()===wanted||o.textContent.trim().toLowerCase()===wanted);
   if(option){input.value=option.value;count++}else unmatched.push(key+' "'+data[key]+'"');
  });
  status.textContent='Filled '+count+' fields.'+(unmatched.length?' Select the matching published '+unmatched.join(' and ')+' manually from the dropdown.':'')+' Verify all facts and prices, add genuine product photos separately, then use the existing Owner-approved Create draft button.';
 });
}
const observer=new MutationObserver(mount);
function start(){mount();const root=document.getElementById('content');if(root)observer.observe(root,{childList:true,subtree:true});window.addEventListener('hashchange',mount)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();