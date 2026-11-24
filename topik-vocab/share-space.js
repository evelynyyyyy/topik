/* Share-safe local learning spaces for native browser URL sharing. */
(function(root){
'use strict';
const PARAM='share';
const HISTORY_KEY='__topikShareSpaceV1';
const CONTINUE_KEY='topik:share-space-update-v1';
const PREFIX='topik_space_v1:';

function validToken(value){
 return typeof value==='string'&&/^[A-Za-z0-9_-]{16,64}$/.test(value);
}
function randomToken(cryptoObj){
 const bytes=new Uint8Array(16);
 if(cryptoObj&&typeof cryptoObj.getRandomValues==='function')cryptoObj.getRandomValues(bytes);
 else for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);
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
function resolve(href,historyState,continuation,tokenFactory){
 const url=new URL(href);
 const raw=url.searchParams.get(PARAM);
 const incoming=validToken(raw)?raw:'';
 const history=safeMarker(historyState&&historyState[HISTORY_KEY]);
 const resume=safeContinuation(continuation);
 const release=url.searchParams.get('release')||'';
 let active='default';
 if(incoming){
  if(history&&history.urlToken===incoming)active=history.active;
  else if(resume&&resume.urlToken===incoming&&resume.release===release)active=resume.active;
  else active=incoming;
 }
 let shareToken=incoming;
 if(!shareToken){
  shareToken=tokenFactory();
  if(!validToken(shareToken))throw Error('Invalid generated share token');
  url.searchParams.set(PARAM,shareToken);
 }
 const baseState=historyState&&typeof historyState==='object'?historyState:{};
 const marker={urlToken:shareToken,active};
 return {
  activeScope:active,
  shareToken,
  isSharedSpace:active!=='default',
  url:url.href,
  historyState:{...baseState,[HISTORY_KEY]:marker}
 };
}
function boot(options){
 let continuation=null;
 try{continuation=JSON.parse(options.sessionStorage.getItem(CONTINUE_KEY)||'null')}catch(_){}
 try{options.sessionStorage.removeItem(CONTINUE_KEY)}catch(_){}
 const result=resolve(options.location.href,options.history.state,continuation,()=>randomToken(options.crypto));
 options.history.replaceState(result.historyState,'',result.url);
 const prepareUpdate=targetHref=>{
  const marker=makeContinuation(result.activeScope,result.shareToken,targetHref);
  if(!marker)return false;
  try{options.sessionStorage.setItem(CONTINUE_KEY,JSON.stringify(marker));return true}catch(_){return false}
 };
 return {...result,storage:createStorage(options.storage,result.activeScope),prepareUpdate};
}

const API={PARAM,HISTORY_KEY,CONTINUE_KEY,PREFIX,validToken,randomToken,scopedKey,createStorage,safeContinuation,makeContinuation,resolve,boot};
root.TOPIK_SHARE_SPACE_API=API;

if(root.document&&root.location&&root.history&&root.localStorage&&root.sessionStorage){
 try{
  const context=boot({
   location:root.location,history:root.history,storage:root.localStorage,
   sessionStorage:root.sessionStorage,crypto:root.crypto
  });
  root.TOPIK_SHARE_SPACE=context;
  root.TOPIK_STORAGE=context.storage;
 }catch(err){
  root.TOPIK_SHARE_SPACE={activeScope:'default',shareToken:null,isSharedSpace:false,error:String(err&&err.message||err),prepareUpdate:()=>false};
  root.TOPIK_STORAGE=root.localStorage;
  try{console.warn('TOPIK share-space fallback:',err)}catch(_){}
 }
}
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
