(()=>{'use strict';
const gate=document.getElementById('loginGate'),shell=document.getElementById('adminShell'),form=document.getElementById('loginForm'),message=document.getElementById('loginMessage');
function say(s){message.textContent=s}
function ready(profile){
  gate.hidden=true;shell.hidden=false;
  const top=document.querySelector('.top-actions');
  if(top&&!document.getElementById('adminIdentity')){
    const who=document.createElement('span');who.id='adminIdentity';who.className='profile-button';who.textContent=(profile.displayName||profile.role)+' · '+profile.role;
    const out=document.createElement('button');out.id='adminSignOut';out.className='profile-button';out.type='button';out.textContent='Sign out';
    top.prepend(who);top.append(out);
    out.addEventListener('click',async()=>{try{await window.NOOR_ADMIN_BACKEND.signOut();location.reload()}catch(e){say('Sign-out failed. Please reload and try again.')}});
  }
}
async function checkSession(){
 try{
  const backend=window.NOOR_ADMIN_BACKEND;
  if(!backend||!backend.configured()){say('Admin backend configuration is incomplete. Add the Supabase publishable key in admin/backend-config.js after reviewing database policies.');return}
  const profile=await backend.getActiveProfile();
  if(profile)ready(profile);
 }catch(e){say(e.message||'Please sign in with an active staff account.')}
}
form.addEventListener('submit',async e=>{
 e.preventDefault();const button=form.querySelector('button[type=submit]');button.disabled=true;say('Checking credentials and staff permissions…');
 try{
  const backend=window.NOOR_ADMIN_BACKEND;
  if(!backend||!backend.configured())throw new Error('Supabase publishable key is not configured yet.');
  const profile=await backend.signIn(document.getElementById('adminEmail').value.trim(),document.getElementById('adminPassword').value);
  if(!profile)throw new Error('No active staff profile is assigned to this account.');
  ready(profile);
 }catch(err){say(err.message||'Sign-in failed. Check credentials and staff access.')}
 finally{button.disabled=false}
});
checkSession();
})();