/* Authenticated admin creative workflow preview. Local-only; no provider calls or persistence. */
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
   '<div class="motion-studio-grid"><section class="motion-studio-panel"><div class="motion-panel-heading"><div><p class="eyebrow">WORKFLOW DIRECTORY</p><h3>Production workspaces</h3></div><span class="motion-mini-tag">13 modules</span></div><label class="motion-module-search">Find a workspace<input id="motionModuleSearch" type="search" placeholder="Search 3D, video, approval…" autocomplete="off"></label><p id="motionModuleCount" class="motion-muted" aria-live="polite">Showing all 13 workspaces.</p><div class="motion-module-list" id="motionModuleList">'+labels.map(function(item){return '<article class="motion-module" data-motion-module><span class="motion-module-number">'+item[0]+'</span><div><strong>'+esc(item[1])+'</strong><p>'+esc(item[2])+'</p></div><span class="motion-module-state">Preview</span></article>';}).join('')+'</div></section>'+
   '<section class="motion-studio-panel"><p class="eyebrow">STORYBOARD BRIEF</p><h3>Prepare a creative brief</h3><p class="motion-muted">This local form prepares a review brief only. It does not send data to an AI provider or save a campaign.</p><form id="motionBriefForm" class="motion-brief-form"><label>Product / SKU<input name="product" maxlength="100" placeholder="Enter an approved product or SKU"></label><label>Campaign purpose<select name="purpose"><option>Product reveal</option><option>Collection launch</option><option>Festive campaign</option><option>Brand storytelling</option><option>Social advertisement</option></select></label><label>Duration<select name="duration"><option>15 seconds</option><option>30 seconds</option><option>45 seconds</option><option>60 seconds</option></select></label><label>Aspect ratio<select name="ratio"><option>9:16 · Reels / Shorts</option><option>16:9 · Website / YouTube</option><option>1:1 · Square</option><option>4:5 · Social feed</option></select></label><label>Creative direction<textarea name="direction" rows="3" maxlength="600" placeholder="Describe the intended mood, product details and motion."></textarea></label><button class="btn secondary" type="submit">Prepare local brief</button><p id="motionBriefStatus" class="motion-muted" role="status" aria-live="polite">No brief prepared.</p><div id="motionBriefResult" hidden><pre id="motionBriefOutput" class="motion-brief-output"></pre><div class="motion-brief-actions"><button class="btn secondary" id="motionBriefCopy" type="button">Copy brief</button><button class="btn secondary" id="motionBriefDownload" type="button">Download .txt</button></div></div></form></section></div>'+
   '<div class="motion-studio-foot"><strong>Security boundary</strong><p>AI generation, asset upload, database persistence, approval transitions and publishing are not connected. Do not add provider secrets to this browser application. Enable these workflows only through reviewed server-side functions, role checks, audit events and explicit human approval.</p></div>'+
  '</section>';
 }
 function bind(root){
  var form=root.querySelector('#motionBriefForm');if(!form)return;
  var briefText='';
  var status=root.querySelector('#motionBriefStatus');
  var result=root.querySelector('#motionBriefResult');
  var output=root.querySelector('#motionBriefOutput');
  var search=root.querySelector('#motionModuleSearch');
  var count=root.querySelector('#motionModuleCount');
  if(search)search.addEventListener('input',function(){
   var query=search.value.trim().toLowerCase(),visible=0;
   root.querySelectorAll('[data-motion-module]').forEach(function(item){
    var match=!query||item.textContent.toLowerCase().indexOf(query)!==-1;
    item.hidden=!match;if(match)visible++;
   });
   count.textContent='Showing '+visible+' of '+labels.length+' workspaces.';
  });
  form.addEventListener('submit',function(event){
   event.preventDefault();var data=new FormData(form);
   briefText=['IQA WATCHES — CREATIVE BRIEF','Product: '+(data.get('product')||'Not selected'),'Purpose: '+data.get('purpose'),'Duration: '+data.get('duration'),'Aspect ratio: '+data.get('ratio'),'Direction: '+(data.get('direction')||'Not specified'),'Status: Draft only — human review required; no provider request made.'].join('\n');
   output.textContent=briefText;result.hidden=false;
   status.textContent='Local brief prepared. Copy it or download a text file; nothing has been saved or sent.';
  });
  root.querySelector('#motionBriefCopy').addEventListener('click',function(){
   if(!briefText)return;
   if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(briefText).then(function(){status.textContent='Brief copied to clipboard.';}).catch(function(){status.textContent='Clipboard access was blocked. Select the brief text and copy it manually.';});
   }else status.textContent='Clipboard access is unavailable. Select the brief text and copy it manually.';
  });
  root.querySelector('#motionBriefDownload').addEventListener('click',function(){
   if(!briefText)return;
   var blob=new Blob([briefText],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');
   anchor.href=url;anchor.download='iqa-watches-creative-brief.txt';anchor.hidden=true;root.appendChild(anchor);anchor.click();anchor.remove();
   window.setTimeout(function(){URL.revokeObjectURL(url);},1000);
   status.textContent='Text file prepared locally. No server upload occurred.';
  });
 }
 global.IQA_MOTION_STUDIO=Object.freeze({render:render,bind:bind});
})(window);
