const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

function loadCollectionApi(){
 const root={classList:{add(){},remove(){}},innerHTML:''};
 const home={children:[]};
 const sandbox={
  window:{addEventListener(){},scrollTo(){},IQA_ROUTE_COLLECTIONS:null},
  document:{getElementById(id){return id==='routeView'?root:id==='home'?home:null},addEventListener(){}},
  location:{hash:'#home'},
  products:[],
  escapeHtml:value=>String(value??''),
  safeImageUrl:value=>String(value||''),
  money:value=>'₹'+value,
  console
 };
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','routes.js'),'utf8'),sandbox);
 return sandbox.window.IQA_ROUTE_COLLECTIONS;
}

test('audience collection routes include only products assigned to that audience',()=>{
 const api=loadCollectionApi();
 const men=api.collectionForRoute('men'),women=api.collectionForRoute('women'),unisex=api.collectionForRoute('unisex');
 assert.equal(men.matches({audience:'Men'}),true);
 assert.equal(men.matches({audience:'Women'}),false);
 assert.equal(women.matches({audience:'Women'}),true);
 assert.equal(women.matches({audience:'Unisex'}),false);
 assert.equal(unisex.matches({audience:'Unisex'}),true);
 assert.equal(unisex.matches({audience:''}),false);
});

test('new arrivals and bestsellers require explicit approved catalogue tags',()=>{
 const api=loadCollectionApi();
 const arrivals=api.collectionForRoute('new-arrivals'),best=api.collectionForRoute('bestsellers');
 assert.equal(arrivals.matches({tags:['New Arrivals']}),true);
 assert.equal(arrivals.matches({tags:['new-arrival']}),true);
 assert.equal(arrivals.matches({tags:['bestseller']}),false);
 assert.equal(arrivals.matches({tags:[]}),false);
 assert.equal(best.matches({tags:['Best Seller']}),true);
 assert.equal(best.matches({tags:['Bestsellers']}),true);
 assert.equal(best.matches({tags:[]}),false);
});

test('shop-all remains inclusive and tag normalization is case and punctuation tolerant',()=>{
 const api=loadCollectionApi();
 assert.equal(api.collectionForRoute('shop').matches({}),true);
 assert.equal(api.normalizeTag(' New Arrivals '),'new-arrivals');
 assert.equal(api.normalizeTag('BEST Seller'),'best-seller');
});
