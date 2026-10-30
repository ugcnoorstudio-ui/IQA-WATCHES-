/* Authenticated admin creative workflow preview. No provider calls or persistence. */
(function(global){
 'use strict';
 var labels=[
  ['01','Motion Dashboard','Readiness, asset status and workflow queue.'],
  ['02','3D Asset Library','Product GLB/GLTF assets and licensing records.'],
  ['03','Product 3D Models','Model assignment, variants and technical review.'],
  ['04','Video Library','Original, licensed and approved motion footage.'],
  ['05','Scroll Story Editor','Scene order, copy, media and fallback review.'],
  ['06','Campaign Studio','Campaign brief and aspect-ratio planning.'],
  ['07','AI Storyboard','Human-reviewed storyboard brief preparation.'],
  ['08','AI Video Generator','Provider connection required; generation disabled.'],
  ['09','Motion Presets','Reusable motion timing and intensity tokens.'],
  ['10','Asset Approval','Human approval and version review.'],
  ['11','Performance Reports','Measured media and Core Web Vitals evidence.'],
  ['12','Publishing History','No publish operation is enabled in this preview.'],
  ['13','Integration Settings','Runway/provider credentials must remain server-side.']
 ];
 function esc(value){return String(value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
 function render(){
  return '<section class="motion-studio">'+
   '<div class="motion-studio-hero"><div><p class="eyebrow">CREATIVE ENGINEERING · ADMIN ONLY</p><h2>Motion &amp; Experience Studio</h2><p>Plan, review and govern cinematic assets without bypassing IQA WATCHES security, accessibility or publishing controls.</p></div><span class="motion-status">PREVIEW · NO PROVIDER CONNECTED</span></div>'+
   '<div class="motion-readiness-grid"><article><span>3D product models</span><strong>Not configured</strong><small>No verified GLB/GLTF files in this repository.</small></article><article><span>Watchmaking footage</span><strong>Asset required</strong><small>No licensed manufacturing footage is available.</small></article><article><span>AI video provider</span><strong>Not connected</strong><small>No API call or paid generation has been attempted.</small></article><article><span>Publishing</span><strong>Approval required</strong><small>No automatic publishing or live deployment action.</small></article></div>'+
   '<div class="motion-studio-grid"><section class="motion-studio-panel"><div class="motion-panel-heading"><div><p class="eyebrow">WORKFLOW DIRECTORY</p><h3>Production workspaces</h3></div><span class="motion-mini-tag">13 modules</span></div><div class="motion-module-list">'+labels.map(function(item){return '<article class="motion-module"><span class="motion-module-number">'+item[0]+'</span><div><strong>'+esc(item[1])+'</strong><p>'+esc(item[2])+'</p></div><span class="motion-module-state">Preview</span></article>';}).join('')+'</div></section>'+
   '<section class="motion-studio-panel motion-asset-panel"><p class="eyebrow">LOCAL ASSET REVIEW</p><h3>3D model &amp; video intake</h3><p class="motion-muted">Files stay in this browser session. Basic format checks are not full model, malware, licensing or quality approval.</p><label>3D model (.glb / .gltf)<input id="motionModelFile" type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json"></label><p id="motionModelStatus" class="motion-muted" role="status" aria-live="polite">No model inspected.</p><label>Watchmaking footage (.mp4 / .webm)<input id="motionVideoFile" type="file" accept="video/mp4,video/webm"></label><video id="motionVideoPreview" controls muted playsinline preload="metadata" hidden></video><div class="motion-asset-actions"><button class="btn secondary" id="motionVideoClear" type="button">Clear video preview</button></div><p id="motionVideoStatus" class="motion-muted" role="status" aria-live="polite">No local video selected.</p></section>'+
   '<section class="motion-studio-panel motion-3d-viewer"><p class="eyebrow">INTERACTIVE 3D PREVIEW</p><h3>Local watch model viewer</h3><p class="motion-muted">Loads an embedded GLB in this browser only. Drag to rotate, scroll or use zoom, and reset the camera. Mesh separation is a visual inspection aid, not a mechanically accurate exploded view.</p><label class="motion-viewer-file">Choose GLB model<input id="iqaViewerFile" type="file" accept=".glb,model/gltf-binary"></label><canvas id="iqaViewerCanvas" aria-label="Interactive three-dimensional model preview" tabindex="0"></canvas><div class="motion-viewer-controls"><label><input id="iqaViewerExplode" type="checkbox"> Separate mesh parts (visual preview)</label><label>Zoom <input id="iqaViewerZoom" type="range" min="1.2" max="7" step="0.1" value="2.8"></label><button class="btn secondary" id="iqaViewerReset" type="button">Reset view</button></div><p id="iqaViewerStatus" class="motion-muted" role="status" aria-live="polite">No model loaded. Select an approved local GLB file to preview.</p></section>'+
   '<section class="motion-studio-panel motion-review-panel"><p class="eyebrow">HUMAN REVIEW GATE</p><h3>Asset readiness checklist</h3><p class="motion-muted">A local preparation gate only. It does not approve, publish, upload or save this asset. A real owner review must still verify the original files and rights.</p><div class="motion-review-checks"><label><input type="checkbox" data-review-check> I own this asset or have documented commercial-use rights.</label><label><input type="checkbox" data-review-check> This is the correct IQA WATCHES product/model and not a placeholder.</label><label><input type="checkbox" data-review-check> Geometry, materials, textures and product details have been visually inspected.</label><label><input type="checkbox" data-review-check> No personal data, hidden files or unapproved third-party content is included.</label><label><input type="checkbox" data-review-check> Mobile, accessibility, performance and fallback behaviour have been reviewed.</label></div><button class="btn secondary" id="motionReviewReady" type="button" disabled>Prepare for owner review</button><p id="motionReviewStatus" class="motion-muted" role="status" aria-live="polite">Select and pass a basic model check, then complete every review item.</p></section>'+
   '<section class="motion-studio-panel"><p class="eyebrow">STORYBOARD BRIEF</p><h3>Prepare a creative brief</h3><p class="motion-muted">This local form prepares a review brief only. It does not send data to an AI provider or save a campaign.</p><form id="motionBriefForm" class="motion-brief-form"><label>Product / SKU<input name="product" maxlength="100" placeholder="Select an approved product"></label><label>Campaign purpose<select name="purpose"><option>Product reveal</option><option>Collection launch</option><option>Festive campaign</option><option>Brand storytelling</option><option>Social advertisement</option></select></label><label>Duration<select name="duration"><option>15 seconds</option><option>30 seconds</option><option>45 seconds</option><option>60 seconds</option></select></label><label>Aspect ratio<select name="ratio"><option>9:16 · Reels / Shorts</option><option>16:9 · Website / YouTube</option><option>1:1 · Square</option><option>4:5 · Social feed</option></select></label><label>Creative direction<textarea name="direction" rows="3" maxlength="600" placeholder="Describe the intended mood, product details and motion."></textarea></label><button class="btn secondary" type="submit">Prepare local brief</button><p id="motionBriefStatus" class="motion-muted" role="status" aria-live="polite">No brief prepared.</p></form></section></div>'+
   '<div class="motion-studio-foot"><strong>Security boundary</strong><p>AI generation, asset upload, database persistence, approval transitions and publishing are not connected. Do not add provider secrets to this browser application. Enable these workflows only through reviewed server-side functions, role checks, audit events and explicit human approval.</p></div>'+
  '</section>';
 }
 function bind(root){
  if(global.IQA_GLB_VIEWER)global.IQA_GLB_VIEWER.mount(root);
  var modelInput=root.querySelector('#motionModelFile');
  var modelStatus=root.querySelector('#motionModelStatus');
  var videoInput=root.querySelector('#motionVideoFile');
  var videoElement=root.querySelector('#motionVideoPreview');
  var videoStatus=root.querySelector('#motionVideoStatus');
  var modelPassed=false;
  var reviewChecks=Array.prototype.slice.call(root.querySelectorAll('[data-review-check]'));
  var reviewButton=root.querySelector('#motionReviewReady');
  var reviewStatus=root.querySelector('#motionReviewStatus');
  function updateReviewGate(){
   var complete=reviewChecks.length===5&&reviewChecks.every(function(check){return check.checked;});
   if(reviewButton)reviewButton.disabled=!(modelPassed&&complete);
   if(reviewStatus&&reviewStatus.textContent!=='Prepared for owner review in this browser session only. No approval or save occurred.')reviewStatus.textContent=modelPassed?(complete?'Checklist complete. You can prepare the owner-review handoff.':'Complete all five review items to continue.'):'Select and pass a basic model check, then complete every review item.';
  }
  reviewChecks.forEach(function(check){check.addEventListener('change',updateReviewGate);});
  if(reviewButton)reviewButton.addEventListener('click',function(){if(!reviewButton.disabled)reviewStatus.textContent='Prepared for owner review in this browser session only. No approval or save occurred.';});
  if(modelInput)modelInput.addEventListener('change',function(){
   modelPassed=false;updateReviewGate();var file=modelInput.files&&modelInput.files[0];if(!file||!global.IQA_ASSET_INTAKE)return;
   modelStatus.textContent='Inspecting selected file locally…';
   global.IQA_ASSET_INTAKE.inspectModel(file).then(function(result){modelPassed=!!result.ok;modelStatus.textContent=(result.ok?'Basic check passed: ':'Basic check failed: ')+result.message;updateReviewGate();}).catch(function(){modelPassed=false;modelStatus.textContent='Could not inspect this file. Try another local GLB/GLTF asset.';updateReviewGate();});
  });
  if(videoInput)videoInput.addEventListener('change',function(){var file=videoInput.files&&videoInput.files[0];if(!file||!global.IQA_ASSET_INTAKE)return;var result=global.IQA_ASSET_INTAKE.previewVideo(file,videoElement);videoElement.hidden=!result.ok;videoStatus.textContent=result.message;});
  var clearVideo=root.querySelector('#motionVideoClear');
  if(clearVideo)clearVideo.addEventListener('click',function(){if(global.IQA_ASSET_INTAKE)global.IQA_ASSET_INTAKE.clearVideoPreview(videoElement);videoElement.hidden=true;if(videoInput)videoInput.value='';videoStatus.textContent='Local video preview cleared.';});
  var form=root.querySelector('#motionBriefForm');if(!form)return;
  form.addEventListener('submit',function(event){
   event.preventDefault();var data=new FormData(form);
   var brief=['IQA WATCHES — CREATIVE BRIEF','Product: '+(data.get('product')||'Not selected'),'Purpose: '+data.get('purpose'),'Duration: '+data.get('duration'),'Aspect ratio: '+data.get('ratio'),'Direction: '+(data.get('direction')||'Not specified'),'Status: Draft only — human review required; no provider request made.'].join('\n');
   var status=root.querySelector('#motionBriefStatus');status.textContent='Local brief prepared. It has not been saved or sent to a provider.';
   var output=root.querySelector('#motionBriefOutput');
   if(!output){output=document.createElement('pre');output.id='motionBriefOutput';output.className='motion-brief-output';form.appendChild(output);}
   output.textContent=brief;
  });
 }
 global.IQA_MOTION_STUDIO=Object.freeze({render:render,bind:bind});
})(window);
