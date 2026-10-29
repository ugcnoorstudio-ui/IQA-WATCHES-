(()=>{'use strict';
const gate=document.getElementById('loginGate'),shell=document.getElementById('adminShell'),form=document.getElementById('loginForm'),message=document.getElementById('loginMessage');
let checking=false;
function say(s){message.textContent=s}
function lock(s){
 gate.hidden=false;shell.hidden=true;
 const identity=document.getElementById('adminIdentity');if(identity)identity.remove();
 const signOut=document.getElementById('adminSignOut');if(signOut)signOut.remove();
 if(s)say(s);
}
function ready(profile){
 gate.hidden=true;shell.hidden=false;
 const top=document.querySelector('.top-actions');
 if(top&&!document.getElementById('adminIdentity')){
  const who=document.createElement('span');who.id='adminIdentity';who.className='profile-button';who.textContent=(profile.displayName||profile.role)+' · '+profile.role;
  const out=document.createElement('button');out.id='adminSignOut';out.className='profile-button';out.type='button';out.textContent='Sign out';
  top.prepend(who);top.append(out);
  out.addEventListener('click',async()=>{
   out.disabled=true;
   try{await window.NOOR_ADMIN_BACKEND.signOut();lock('You have been signed out.')}
   catch(e){out.disabled=false;say('Sign-out failed. Please retry.')}
  });
 }
}
async function checkSession(){
 if(checking)return;checking=true;
 try{
  const backend=window.NOOR_ADMIN_BACKEND;
  if(!backend||!backend.configured()){lock('Admin backend configuration is incomplete. Add the Supabase publishable key only after reviewing database policies.');return}
  const profile=await backend.getActiveProfile();
  if(profile)ready(profile);else lock('Please sign in with an active staff account.');
 }catch(e){lock(e.message||'Please sign in with an active staff account.')}
 finally{checking=false}
}
form.addEventListener('submit',async e=>{
 e.preventDefault();const button=form.querySelector('button[type=submit]');button.disabled=true;say('Checking credentials and staff permissions…');
 try{
  const backend=window.NOOR_ADMIN_BACKEND;
  if(!backend||!backend.configured())throw new Error('Supabase publishable key is not configured yet.');
  const profile=await backend.signIn(document.getElementById('adminEmail').value.trim(),document.getElementById('adminPassword').value);
  if(!profile)throw new Error('No active staff profile is assigned to this account.');
  form.reset();ready(profile);
 }catch(err){say(err.message||'Sign-in failed. Check credentials and staff access.')}
 finally{button.disabled=false}
});
if(window.NOOR_ADMIN_BACKEND&&window.supabase&&window.NOOR_ADMIN_BACKEND.configured()){
 try{
  const client=window.supabase.createClient(window.NOOR_SUPABASE_CONFIG.url,window.NOOR_SUPABASE_CONFIG.anonKey);
  client.auth.onAuthStateChange((event)=>{
   if(event==='SIGNED_OUT')lock('Your session has ended. Please sign in again.');
  });
 }catch(_){/* The primary session check below remains fail-closed. */}
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!shell.hidden)checkSession()});
window.addEventListener('focus',()=>{if(!shell.hidden)checkSession()});
checkSession();
})();