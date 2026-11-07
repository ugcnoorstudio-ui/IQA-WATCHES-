(()=>{'use strict';
const $=id=>document.getElementById(id);
const backend=window.IQA_ADMIN_BACKEND;
const gate=$('authGate'),banner=document.querySelector('.preview-banner'),shell=document.querySelector('.shell');
function message(text,isError){const el=$('authMessage');el.textContent=text||'';el.classList.toggle('error',!!isError)}
function lock(text){
 gate.hidden=false;banner.hidden=true;shell.hidden=true;
 document.body.classList.add('auth-locked');
 $('authEmail').focus({preventScroll:true});
 if(text)message(text,true);
}
function unlock(profile){
 gate.hidden=true;banner.hidden=false;shell.hidden=false;
 document.body.classList.remove('auth-locked');
 $('staffIdentity').textContent=(profile.displayName||'IQA WATCHES Staff')+' · '+profile.role.replaceAll('_',' ');
 $('sidebarStatus').textContent='Authenticated · '+profile.role.replaceAll('_',' ');
 banner.querySelector('strong').textContent='AUTHENTICATED ADMIN SHELL · LIVE OWNER ACCESS';
 banner.querySelector('span').textContent='Owner identity verified. Live catalogue and owner-only operational records are connected. Only server-approved write actions are enabled; other changes remain safely disabled.';
 message('',false);
 if(window.IQA_ADMIN_REFRESH)window.IQA_ADMIN_REFRESH();
}
async function init(){
 if(!backend||!backend.configured()){lock('Admin backend configuration is missing.');return}
 try{
  const profile=await backend.getActiveProfile();
  if(profile)unlock(profile);else lock('Sign in with an authorized IQA WATCHES staff account.');
 }catch(error){lock(error.message||'Could not verify staff access.')}
}
$('googleSignIn').addEventListener('click',async()=>{
 const button=$('googleSignIn');
 if(!backend||!backend.configured()){message('Admin backend configuration is missing.',true);return}
 button.disabled=true;button.textContent='Connecting to Google…';
 message('Redirecting to secure Google sign-in. Only active staff accounts can enter the admin panel.',false);
 try{
  const {error}=await backend.getClient().auth.signInWithOAuth({
   provider:'google',
   options:{redirectTo:window.location.origin+window.location.pathname}
  });
  if(error)throw error;
 }catch(error){
  message(error.message||'Google sign-in could not be started. Try email sign-in instead.',true);
  button.disabled=false;button.textContent='Continue with Google';
 }
});
$('loginForm').addEventListener('submit',async event=>{
 event.preventDefault();
 const email=$('authEmail').value.trim(),password=$('authPassword').value;
 const button=$('authSubmit');button.disabled=true;button.textContent='Verifying…';message('Checking your staff access…',false);
 try{
  const profile=await backend.signIn(email,password);
  if(!profile)throw new Error('This account could not be verified as active staff.');
  $('authPassword').value='';unlock(profile);
 }catch(error){message(error.message||'Sign-in failed. Check your credentials and try again.',true)}
 finally{button.disabled=false;button.textContent='Sign in with email'}
});
$('signOut').addEventListener('click',async()=>{
 const button=$('signOut');button.disabled=true;
 try{await backend.signOut();lock('You have been signed out.')}
 catch(error){if(error.message)message(error.message,true)}
 finally{button.disabled=false}
});
if(backend&&backend.configured()){
 try{
  backend.onAuthStateChange(event=>{
   if(event==='SIGNED_OUT')lock('Your session has ended. Sign in again to continue.');
  });
 }catch(_){}
}
let rechecking=false;
async function recheckAccess(){
 if(rechecking || document.hidden || gate.hidden===false) return;
 rechecking=true;
 try{
  const verified=await backend.getActiveProfile();
  if(!verified) lock('Your staff session could not be verified. Sign in again.');
  else {
   $('staffIdentity').textContent=(verified.displayName||'IQA WATCHES Staff')+' · '+verified.role.replaceAll('_',' ');
   $('sidebarStatus').textContent='Authenticated · '+verified.role.replaceAll('_',' ');
  }
 }catch(error){lock(error.message||'Session verification failed. Sign in again.')}
 finally{rechecking=false}
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)recheckAccess()});
window.addEventListener('focus',recheckAccess);
init();
})();
