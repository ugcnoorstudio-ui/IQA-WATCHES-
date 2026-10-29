/* Progressive enhancement only: no pinning, no autoplay and no dependency. */
(function(){
 'use strict';
 function init(){
  var root=document.querySelector('[data-cinematic-story]');
  if(!root||root.dataset.ready==='true')return;
  root.dataset.ready='true';
  var scenes=[].slice.call(root.querySelectorAll('[data-story-scene]'));
  var steps=[].slice.call(root.querySelectorAll('[data-story-step]'));
  if(!scenes.length)return;
  function activate(index){
   scenes.forEach(function(scene,i){scene.classList.toggle('is-active',i===index);});
   steps.forEach(function(step,i){step.classList.toggle('is-active',i===index);step.classList.toggle('is-seen',i<index);});
  }
  if(!('IntersectionObserver' in window)){activate(0);return;}
  try{
   var observer=new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
     if(entry.isIntersecting){var index=scenes.indexOf(entry.target);if(index>=0)activate(index);}
    });
   },{rootMargin:'-28% 0px -42% 0px',threshold:0});
   scenes.forEach(function(scene){observer.observe(scene);});
   document.addEventListener('visibilitychange',function(){if(document.hidden)observer.disconnect();else scenes.forEach(function(scene){observer.observe(scene);});});
  }catch(_error){activate(0);}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
