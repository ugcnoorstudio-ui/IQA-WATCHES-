/* IQA WATCHES — local-only asset intake helpers.
 * Basic structure checks and local preview only; never upload or publish.
 */
(function (global) {
  'use strict';
  function validateGlb(buffer) {
    if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 12) return { ok:false, message:'GLB file is too small to contain a valid header.' };
    var view = new DataView(buffer);
    if (view.getUint32(0,true)!==0x46546c67) return { ok:false, message:'Invalid GLB magic header.' };
    if (view.getUint32(4,true)!==2) return { ok:false, message:'Only GLB version 2 is supported.' };
    if (view.getUint32(8,true)!==buffer.byteLength) return { ok:false, message:'GLB declared length does not match the selected file size.' };
    return { ok:true, message:'GLB v2 header and file length are consistent. Full model validation is still required.' };
  }
  function validateGltf(text) {
    var data;
    try { data=JSON.parse(text); } catch (_) { return { ok:false, message:'The selected .gltf file is not valid JSON.' }; }
    if (!data || !data.asset || typeof data.asset.version!=='string') return { ok:false, message:'The .gltf file is missing asset.version metadata.' };
    var version=data.asset.version;
    if (version!=='2' && version.indexOf('2.')!==0) return { ok:false, message:'Only glTF 2.x assets are supported.' };
    return { ok:true, message:'glTF 2.x JSON metadata is valid. Referenced files and model content still need review.' };
  }
  async function inspectModel(file) {
    if (!file) return { ok:false, message:'Choose a model file first.' };
    var name=String(file.name||'').toLowerCase();
    if (name.endsWith('.glb')) return validateGlb(await file.arrayBuffer());
    if (name.endsWith('.gltf')) return validateGltf(await file.text());
    return { ok:false, message:'Choose a .glb or .gltf file.' };
  }
  function previewVideo(file,videoElement) {
    if (!file || !videoElement) return { ok:false, message:'Choose a local video file.' };
    var type=String(file.type||'');
    if (type!=='video/mp4' && type!=='video/webm') return { ok:false, message:'Choose a local MP4 or WebM video.' };
    var previous=videoElement.dataset.objectUrl;
    if (previous) URL.revokeObjectURL(previous);
    var url=URL.createObjectURL(file);
    videoElement.dataset.objectUrl=url; videoElement.src=url; videoElement.controls=true;
    videoElement.muted=true; videoElement.autoplay=false; videoElement.playsInline=true;
    return { ok:true, message:'Local preview ready. No upload or server transfer occurred.' };
  }
  function clearVideoPreview(videoElement) {
    if (!videoElement) return;
    var url=videoElement.dataset.objectUrl;
    videoElement.pause(); videoElement.removeAttribute('src'); videoElement.load();
    if (url) URL.revokeObjectURL(url);
    delete videoElement.dataset.objectUrl;
  }
  global.IQA_ASSET_INTAKE=Object.freeze({inspectModel:inspectModel,previewVideo:previewVideo,clearVideoPreview:clearVideoPreview,validateGlb:validateGlb,validateGltf:validateGltf});
})(window);
