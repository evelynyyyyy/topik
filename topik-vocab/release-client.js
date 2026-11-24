/* Release metadata comes from the deployed artifact, never GitHub branch HEAD. */
(function(){
 'use strict';
 const release=window.TOPIK_RELEASE||{version:document.querySelector('meta[name="topik-version"]')?.content||'unknown',buildSha:'unverified',buildTime:'',assetVersion:'unverified'};
 window.TOPIK_APP_VERSION=release.version;
 window.TOPIK_BUILD=release.buildSha;
 window.TOPIK_ASSET_VERSION=release.assetVersion;
 let checking=false,lastCheck=-Infinity,pending=null,updating=false;
 const bannerId='topik-release-notice';
 function showUpdate(next){
  pending=next;
  let banner=document.getElementById(bannerId);
  if(!banner){
   banner=document.createElement('div');banner.id=bannerId;banner.setAttribute('role','status');
   banner.className='topik-release-notice';
   Object.assign(banner.style,{position:'fixed',top:'calc(env(safe-area-inset-top, 0px) + 8px)',right:'12px',maxWidth:'calc(100% - 24px)',zIndex:'10000',background:'Canvas',color:'CanvasText',border:'1px solid GrayText',borderRadius:'12px',padding:'10px',display:'flex',gap:'10px',flexWrap:'wrap'});
   const label=document.createElement('span');label.id='topik-release-label';
   const button=document.createElement('button');button.type='button';button.textContent='立即更新';
   button.onclick=()=>{
    if(!pending||updating)return;
    updating=true;button.disabled=true;
    try{
     if(window.TOPIK_SAVE_SESSION?.()!==true)throw Error('save failed');
     const pool=window.TOPIK_ACTIVE_SMART_POOL?.();
     const storage=window.TOPIK_SESSION_STORAGE||sessionStorage;
     if(pool)storage.setItem('topik:resume-after-update',pool);
     else storage.removeItem('topik:resume-after-update');
     const url=new URL(location.href);url.searchParams.set('release',pending.buildSha);
     url.searchParams.set('refresh',String(Date.now()));
     if(window.TOPIK_SHARE_SPACE?.prepareUpdate?.(url.href)!==true)throw Error('space continuation failed');
     location.replace(url.href);
    }catch(err){updating=false;button.disabled=false;label.textContent='更新前保存失败，请重试（当前学习未中断）';}
   };
   banner.append(label,button);document.body.append(banner);
  }
  banner.querySelector('#topik-release-label').textContent='发现新版本 v'+next.version+'（当前 v'+release.version+'）';
 }
 async function check(force=false){
  if(checking||document.visibilityState==='hidden')return false;
  if(!force&&Date.now()-lastCheck<15000)return false;
  checking=true;lastCheck=Date.now();
  try{
   const url=new URL('./release.json',location.href);
   url.searchParams.set('t',String(Date.now()));
   const response=await fetch(url.href,{cache:'no-store',headers:{'Cache-Control':'no-cache'}});
   if(!response.ok)throw Error('HTTP '+response.status);
   const remote=await response.json();
   if(!remote||typeof remote.version!=='string'||!/^[a-f0-9]{40}$/.test(remote.buildSha||''))throw Error('invalid release manifest');
   if(remote.buildSha!==release.buildSha){if(release.buildTime&&remote.buildTime&&Date.parse(remote.buildTime)<Date.parse(release.buildTime))return false;showUpdate(remote);return true}
   return false;
  }catch(err){if(force)console.warn('[TOPIK] 更新检查未验证',err);return false}
  finally{checking=false}
 }
 window.TOPIK_CHECK_UPDATE=()=>check(true);
 window.addEventListener('pageshow',()=>{void check()});
 window.addEventListener('focus',()=>{void check()});
 window.addEventListener('online',()=>{void check()});
 window.setInterval(()=>{if(!document.hidden)void check()},600000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void check()});
 document.addEventListener('DOMContentLoaded',()=>{
  if('serviceWorker' in navigator)navigator.serviceWorker.getRegistrations().then(regs=>{
   regs.filter(reg=>new URL(reg.scope).pathname===new URL('.',location.href).pathname).forEach(reg=>reg.unregister());
  }).catch(()=>{});
  // No deletion of Cache Storage, localStorage, IndexedDB, or learning data.
  void check();
 });
})();
