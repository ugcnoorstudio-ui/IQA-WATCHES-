/* Accessible, touch-friendly autoplay carousel for the homepage editorial ads. */
(function(){
 'use strict';
 function init(){
  var root=document.querySelector('[data-ad-carousel]');
  if(!root||root.dataset.ready==='true')return;
  root.dataset.ready='true';
  var slides=Array.prototype.slice.call(root.querySelectorAll('[data-ad-slide]'));
  var dots=Array.prototype.slice.call(root.querySelectorAll('[data-ad-go]'));
  var count=root.querySelector('[data-ad-count]');
  var previous=root.querySelector('[data-ad-prev]');
  var next=root.querySelector('[data-ad-next]');
  var pauseButton=root.querySelector('[data-ad-pause]');
  var track=root.querySelector('[data-ad-track]');
  if(slides.length<2)return;
  var index=0,interval=5200,timer=null,paused=false,hovered=false,focused=false;
  var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function render(){
   slides.forEach(function(slide,i){
    var active=i===index;
    slide.classList.toggle('is-active',active);
    slide.setAttribute('aria-hidden',active?'false':'true');
    if(active)slide.removeAttribute('inert');else slide.setAttribute('inert','');
   });
   dots.forEach(function(dot,i){
    var active=i===index;
    dot.classList.toggle('is-active',active);
    dot.setAttribute('aria-pressed',active?'true':'false');
   });
   if(count)count.textContent=String(index+1).padStart(2,'0')+' / '+String(slides.length).padStart(2,'0');
  }
  function stop(){if(timer!==null){window.clearInterval(timer);timer=null;}}
  function canPlay(){return !paused&&!hovered&&!focused&&!document.hidden&&!reduced;}
  function start(){stop();if(canPlay())timer=window.setInterval(function(){go(index+1);},interval);}
  function go(nextIndex){index=(nextIndex+slides.length)%slides.length;render();start();}
  function pause(value){
   paused=!!value;
   if(pauseButton){pauseButton.setAttribute('aria-pressed',paused?'true':'false');pauseButton.setAttribute('aria-label',paused?'Play automatic stories':'Pause automatic stories');pauseButton.textContent=paused?'▶':'Ⅱ';}
   start();
  }
  if(previous)previous.addEventListener('click',function(){go(index-1);});
  if(next)next.addEventListener('click',function(){go(index+1);});
  dots.forEach(function(dot){dot.addEventListener('click',function(){go(Number(dot.getAttribute('data-ad-go'))||0);});});
  if(pauseButton)pauseButton.addEventListener('click',function(){pause(!paused);});
  root.addEventListener('mouseenter',function(){hovered=true;stop();});
  root.addEventListener('mouseleave',function(){hovered=false;start();});
  root.addEventListener('focusin',function(){focused=true;stop();});
  root.addEventListener('focusout',function(event){if(!root.contains(event.relatedTarget)){focused=false;start();}});
  document.addEventListener('visibilitychange',start);
  if(window.matchMedia){
   var motion=window.matchMedia('(prefers-reduced-motion: reduce)');
   if(motion.addEventListener)motion.addEventListener('change',function(event){reduced=event.matches;start();});
  }
  var touch=null;
  if(track){
   track.addEventListener('touchstart',function(event){
    if(!event.touches||event.touches.length!==1)return;
    var t=event.touches[0];touch={x:t.clientX,y:t.clientY,id:t.identifier};
   },{passive:true});
   document.addEventListener('touchend',function(event){
    if(!touch)return;
    var t=Array.prototype.find.call(event.changedTouches||[],function(item){return item.identifier===touch.id;});
    if(!t){touch=null;return;}
    var dx=t.clientX-touch.x,dy=t.clientY-touch.y;touch=null;
    if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.2)go(index+(dx<0?1:-1));
   },{passive:true});
   document.addEventListener('touchcancel',function(){touch=null;},{passive:true});
  }
  render();
  start();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
