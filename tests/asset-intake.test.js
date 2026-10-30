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


test('local GLB viewer parses an embedded triangle mesh without network dependencies',()=>{
 const sandbox={window:{},ArrayBuffer,DataView,Uint8Array,Float32Array,Uint16Array,Uint32Array,Int8Array,Int16Array,TextDecoder,TextEncoder,Math,JSON,String,Array,Error};
 vm.runInNewContext(read('admin/model-viewer.js'),sandbox);
 const json={asset:{version:'2.0'},buffers:[{byteLength:36}],bufferViews:[{buffer:0,byteOffset:0,byteLength:36}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3'}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],nodes:[{mesh:0}],scenes:[{nodes:[0]}],scene:0};
 let j=JSON.stringify(json);while(j.length%4)j+=' ';
 const bin=new Float32Array([0,0,0,1,0,0,0,1,0]);
 const total=12+8+j.length+8+bin.byteLength,buffer=new ArrayBuffer(total),view=new DataView(buffer);view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,total,true);
 view.setUint32(12,j.length,true);view.setUint32(16,0x4e4f534a,true);new Uint8Array(buffer,20,j.length).set(new TextEncoder().encode(j));
 const binStart=20+j.length;view.setUint32(binStart,bin.byteLength,true);view.setUint32(binStart+4,0x004e4942,true);new Uint8Array(buffer,binStart+8,bin.byteLength).set(new Uint8Array(bin.buffer));
 const parsed=sandbox.window.IQA_GLB_VIEWER.parseGlb(buffer);
 assert.equal(parsed.parts.length,1);assert.equal(parsed.triangles,1);assert.equal(parsed.parts[0].raw.length,27);
 assert.throws(()=>sandbox.window.IQA_GLB_VIEWER.parseGlb(new ArrayBuffer(12)));
});

test('3D viewer is loaded only in authenticated admin and exposes accessible local controls',()=>{
 const html=read('admin/index.html'),studio=read('admin/motion-studio.js'),viewer=read('admin/model-viewer.js');
 assert.ok(html.includes('model-viewer.js'));assert.ok(html.includes('auth.js'));
 assert.ok(studio.includes('iqaViewerCanvas'));assert.ok(studio.includes('Separate mesh parts'));
 assert.ok(studio.includes('IQA_GLB_VIEWER.mount'));
 assert.doesNotMatch(viewer,/fetch|XMLHttpRequest|localStorage|indexedDB/i);
 assert.ok(viewer.includes('pointermove'));assert.ok(viewer.includes('wheel'));assert.ok(viewer.includes('gl.drawArrays'));
});
