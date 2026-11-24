/* Share-safe local learning spaces for native browser URL sharing. */
(function(root){
'use strict';
const PARAM='space';
const LEGACY='share';
const BINDING='topik:legacy-default-space:';
const HISTORY_KEY='__topikShareSpaceV1';
const CONTINUE_KEY='topik:share-space-update-v1';
const PREFIX='topik_space_v1:';

function validToken(value){
 return typeof value==='string'&&/^[A-Za-z0-9_-]{16,64}$/.test(value);
}
function randomToken(cryptoObj){
 const bytes=new Uint8Array(16);
 if(cryptoObj&&typeof cryptoObj.getRandomValues==='function')cryptoObj.getRandomValues(bytes);
 else throw Error('Secure randomness unavailable');
 return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}
function scopedKey(scope,key){
 key=String(key);
 if(scope==='default'||!/^topik(?:_|:)/.test(key))return key;
 return PREFIX+scope+':'+key;
}
function createStorage(base,scope){
 return {
  getItem(key){return base.getItem(scopedKey(scope,key))},
  setItem(key,value){base.setItem(scopedKey(scope,key),String(value))},
  removeItem(key){base.removeItem(scopedKey(scope,key))}
 };
}
function freshShareUrl(href,tokenFactory){
 const url=new URL(href);
 const token=tokenFactory();
 if(!validToken(token))throw Error('Invalid generated share token');
 url.searchParams.delete(LEGACY);
 url.searchParams.set(PARAM,token);
 url.searchParams.delete('release');url.searchParams.delete('refresh');
 return url.href;
}
function safeMarker(value){
 return value&&typeof value==='object'&&validToken(value.urlToken)&&
  (value.active==='default'||validToken(value.active))?value:null;
}
function safeContinuation(value){
 const marker=safeMarker(value);
 return marker&&typeof value.release==='string'&&value.release.length>0?value:null;
}
function makeContinuation(activeScope,shareToken,targetHref){
 const url=new URL(targetHref);
 const release=url.searchParams.get('release')||'';
 if(!release||!validToken(shareToken)||(activeScope!=='default'&&!validToken(activeScope)))return null;
 return {urlToken:shareToken,active:activeScope,release};
}
function resolve(href,historyState,continuation,storage){
 const url=new URL(href),explicit=url.searchParams.has(PARAM),legacy=url.searchParams.has(LEGACY);
 let active='default';
 if(explicit||legacy){
  const token=url.searchParams.get(explicit?PARAM:LEGACY);
  if(!validToken(token))throw Error('Invalid learning space');
  if(explicit)active=token;
  else{
   const history=safeMarker(historyState&&historyState[HISTORY_KEY]);
   const resume=safeContinuation(continuation);
   const confirmed=(history?.urlToken===token&&history.active==='default')||(resume?.urlToken===token&&resume.active==='default'&&resume.release===url.searchParams.get('release'));
   if(confirmed)storage.setItem(BINDING+token,'1');
   if(confirmed||storage.getItem(BINDING+token)==='1')active='default';
   else active=token;
  }
 }
 url.searchParams.delete(LEGACY);
 if(active==='default')url.searchParams.delete(PARAM);else url.searchParams.set(PARAM,active);
 const baseState={...(historyState||{})};delete baseState[HISTORY_KEY];
 return {activeScope:active,shareToken:active==='default'?null:active,isSharedSpace:active!=='default',url:url.href,historyState:baseState};
}
function boot(options){
 let continuation=null;
 try{continuation=JSON.parse(options.sessionStorage.getItem(CONTINUE_KEY)||'null')}catch(_){}
 const result=resolve(options.location.href,options.history.state,continuation,options.storage);
 const storage=createStorage(options.storage,result.activeScope),session=createStorage(options.sessionStorage,result.activeScope);
 storage.getItem('topik_lab_v2');session.getItem('topik:resume-after-update');
 options.history.replaceState(result.historyState,'',result.url);
 try{options.sessionStorage.removeItem(CONTINUE_KEY)}catch(_){}
 const prepareUpdate=targetHref=>{
  try{const target=new URL(targetHref);return target.origin===new URL(result.url).origin&&target.pathname===new URL(result.url).pathname&&target.searchParams.get(PARAM)===result.shareToken&&!target.searchParams.has(LEGACY)}catch(_){return false}
 };
 return {...result,storage,session,freshShareUrl:()=>freshShareUrl(result.url,()=>randomToken(options.crypto)),prepareUpdate};
}
function blockedStorage(){return {getItem(){return null},setItem(){throw Error('Learning space unavailable')},removeItem(){throw Error('Learning space unavailable')}}}

const API={PARAM,HISTORY_KEY,CONTINUE_KEY,PREFIX,validToken,randomToken,scopedKey,createStorage,freshShareUrl,safeContinuation,makeContinuation,resolve,boot};
root.TOPIK_SHARE_SPACE_API=API;

if(root.document&&root.location&&root.history){
 try{
  const context=boot({
   location:root.location,history:root.history,storage:root.localStorage,
   sessionStorage:root.sessionStorage,crypto:root.crypto
  });
  root.TOPIK_SHARE_SPACE=context;
  root.TOPIK_STORAGE=context.storage;
  root.TOPIK_SESSION_STORAGE=context.session;
 }catch(err){
  root.TOPIK_SHARE_SPACE={activeScope:'unavailable',shareToken:null,isSharedSpace:true,error:String(err&&err.message||err),prepareUpdate:()=>false};
  root.TOPIK_STORAGE=blockedStorage();root.TOPIK_SESSION_STORAGE=blockedStorage();
  root.document.addEventListener('DOMContentLoaded',()=>{const app=root.document.getElementById('app');if(app)app.textContent='无法打开此学习空间，请重新打开链接。'});
  try{console.warn('TOPIK share-space fallback:',err)}catch(_){}
 }
}
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
