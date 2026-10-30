const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=(file)=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('asset intake validates GLB header and declared file size',()=>{
 const sandbox={window:{},ArrayBuffer,DataView,JSON,URL};
 vm.runInNewContext(read('admin/asset-intake.js'),sandbox);
 const api=sandbox.window.IQA_ASSET_INTAKE;
 const buffer=new ArrayBuffer(12),view=new DataView(buffer);
 view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,12,true);
 assert.equal(api.validateGlb(buffer).ok,true);
 view.setUint32(8,16,true);
 assert.equal(api.validateGlb(buffer).ok,false);
});

test('asset intake validates glTF 2.x metadata and rejects invalid input',()=>{
 const sandbox={window:{},ArrayBuffer,DataView,JSON,URL};
 vm.runInNewContext(read('admin/asset-intake.js'),sandbox);
 const api=sandbox.window.IQA_ASSET_INTAKE;
 assert.equal(api.validateGltf('{"asset":{"version":"2.0"}}').ok,true);
 assert.equal(api.validateGltf('{"asset":{"version":"1.0"}}').ok,false);
 assert.equal(api.validateGltf('{broken').ok,false);
});

test('asset intake remains local-only and is wired into the authenticated admin shell',()=>{
 const source=read('admin/asset-intake.js'),html=read('admin/index.html'),studio=read('admin/motion-studio.js');
 assert.doesNotMatch(source,/\bfetch\s*\(|XMLHttpRequest|localStorage|indexedDB/i);
 assert.match(source,/URL\.createObjectURL/);assert.match(source,/URL\.revokeObjectURL/);
 assert.match(html,/asset-intake\.js/);assert.match(html,/auth\.js/);
 assert.match(studio,/motionModelFile/);assert.match(studio,/motionVideoPreview/);
 assert.match(studio,/Basic format checks are not full model/);
});


test('asset readiness gate requires five explicit review checks and a passed local model inspection',()=>{
 const studio=read('admin/motion-studio.js');
 assert.match(studio,/data-review-check/);
 assert.match(studio,/reviewChecks.length===5/);
 assert.match(studio,/reviewChecks.every/);
 assert.match(studio,/modelPassed&&complete/);
 assert.match(studio,/Prepared for owner review in this browser session only/);
 assert.match(studio,/No approval or save occurred/);
 assert.match(studio,/motionReviewReady/);
});
