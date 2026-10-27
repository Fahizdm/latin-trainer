/* VCE Latin Trainer cloud sync. App remains unchanged and backup/restore stay compatible. */
(() => {
'use strict';
const KEYS = ['vceLatinDaily','vceLatinMastery','latinAccidenceStats','vceLatinCardEdits','vceLatinRunProgress'];
const $ = id => document.getElementById(id);
let resolveReady;
window.latinCloudReady = new Promise(resolve => { resolveReady=resolve; });
let client, user, lastUpload='', saving=false, started=false, lastRemoteUpdate=null;
const status = (t, error=false) => { const n=$('cloudSyncStatus'); if(n){n.textContent=t;n.style.color=error?'#963030':'#17633a'} };
const notice = t => {$('cloudNotice').textContent=t};
const collect = () => {
 const storage={}; for(const key of KEYS){const v=localStorage.getItem(key);if(v!==null)storage[key]=v}
 return storage;
};
const store = data => {for(const k of KEYS){if(typeof data?.[k]==='string'){JSON.parse(data[k]);localStorage.setItem(k,data[k]);}}};
const json = obj => JSON.stringify(obj);
const configured = () => /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(window.LATIN_SUPABASE_URL||'') && /^(sb_publishable_|eyJ)/.test(window.LATIN_SUPABASE_PUBLISHABLE_KEY||'');
async function upload(force=false){
 if(!user || saving) return;
 const snapshot=collect(), serialized=json(snapshot);
 if(!force && serialized===lastUpload)return;
 saving=true;status('Saving…');
 try {
  const {data:existing,error:readErr}=await client.from('latin_progress').select('updated_at').eq('user_id',user.id).maybeSingle();
  if(readErr)throw readErr;
  if(existing && lastRemoteUpdate && existing.updated_at!==lastRemoteUpdate){
    status('Newer cloud progress exists — reload before continuing',true);
    return;
  }
  const {data,error}=await client.from('latin_progress').upsert({user_id:user.id,progress:snapshot,updated_at:new Date().toISOString()},{onConflict:'user_id'}).select('updated_at').single();
  if(error)throw error;
  lastRemoteUpdate=data.updated_at;lastUpload=serialized;status('Saved to cloud');
 }catch(e){status('Sync failed: '+e.message,true)}finally{saving=false}
}
async function beginSession(session){
 user=session.user;
 notice('Loading your progress…');
 try {
  const {data,error}=await client.from('latin_progress').select('progress,updated_at').eq('user_id',user.id).maybeSingle();
  if(error)throw error;
  const local=collect();
  if(data?.progress && Object.keys(data.progress).length){
   const hasLocal=Object.keys(local).length>0;
   if(hasLocal && json(local)!==json(data.progress)){
    const useLocal=confirm('Cloud progress already exists.\n\nPress OK to REPLACE cloud progress with this browser’s local progress.\nPress Cancel to load cloud progress instead (recommended when switching devices).\n\nUse Backup Progress first if unsure.');
    if(useLocal){lastRemoteUpdate=data.updated_at;lastUpload='';await upload(true)}
    else {store(data.progress);lastRemoteUpdate=data.updated_at;}
   }else {store(data.progress);lastRemoteUpdate=data.updated_at;}
  } else if(Object.keys(local).length){
   const importLocal=confirm('Found saved Latin progress in this browser.\n\nPress OK to upload it to your Supabase account.\nPress Cancel to start with cloud storage empty.');
   if(importLocal){lastRemoteUpdate=null;await upload(true)}
  }
  lastUpload=json(collect());
  $('cloudGate').style.display='none';
  $('cloudToolbar').hidden=false;
  $('cloudIdentity').textContent=user.email || 'Signed in';
  status('Cloud connected');
  if(!started){started=true;resolveReady();setInterval(()=>upload(),3000);}
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')upload()},{passive:true});
 }catch(e){notice('Could not load progress: '+e.message+'. Check the SQL table and RLS policies.');status('Connection error',true)}
}
async function login(signUp){
 if(!client){notice('Supabase setup is incomplete.');return}
 const email=$('cloudEmail').value.trim(),password=$('cloudPass').value;
 if(!email||!password){notice('Enter your email and password.');return}
 notice(signUp?'Creating account…':'Signing in…');
 try{
  const {data,error}=signUp?await client.auth.signUp({email,password}):await client.auth.signInWithPassword({email,password});
  if(error)throw error;
  if(!data.session){notice('Check your email for the confirmation link, then return here to sign in.');return}
  await beginSession(data.session);
 }catch(e){notice(e.message)}
}
window.addEventListener('DOMContentLoaded',async()=>{
 $('cloudLogin').onclick=()=>login(false);
 $('cloudSignup').onclick=()=>login(true);
 $('cloudSyncNow').onclick=()=>upload(true);
 $('cloudLogout').onclick=async()=>{await upload(true);await client.auth.signOut();location.reload()};
 $('cloudPass').addEventListener('keydown',e=>{if(e.key==='Enter')login(false)});
 if(!configured() || !window.supabase?.createClient){$('cloudConfigHelp').hidden=false;notice('Add your Project URL and publishable key to supabase-config.js.');return}
 try{
  client=window.supabase.createClient(window.LATIN_SUPABASE_URL,window.LATIN_SUPABASE_PUBLISHABLE_KEY);
  const {data,error}=await client.auth.getSession();if(error)throw error;
  if(data.session)await beginSession(data.session);else notice('Sign in to open your trainer. If you already have saved progress, you can upload it after signing in.');
 }catch(e){notice('Could not connect: '+e.message)}
});
})();
