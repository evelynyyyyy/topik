/* Share-safe local learning spaces for native browser URL sharing. */
(function(root){
'use strict';
const PARAM='share';
const HISTORY_KEY='__topikShareSpaceV1';
const SESSION_KEY='topik:share-space-tab-v1';
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
function resolve(href,historyState,sessionMarker,tokenFactory){
 const url=new URL(href);
 const raw=url.searchParams.get(PARAM);
 const incoming=validToken(raw)?raw:'';
 const history=safeMarker(historyState&&historyState[HISTORY_KEY]);
 const session=safeMarker(sessionMarker);
 let active='default';
 if(incoming){
  if(history&&history.urlToken===incoming)active=history.active;
  else if(url.searchParams.has('release')&&session&&session.urlToken===incoming)active=session.active;
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
  historyState:{...baseState,[HISTORY_KEY]:marker},
  sessionMarker:marker
 };
}
function boot(options){
 let sessionMarker=null;
 try{sessionMarker=JSON.parse(options.sessionStorage.getItem(SESSION_KEY)||'null')}catch(_){}
 const result=resolve(options.location.href,options.history.state,sessionMarker,()=>randomToken(options.crypto));
 options.history.replaceState(result.historyState,'',result.url);
 try{options.sessionStorage.setItem(SESSION_KEY,JSON.stringify(result.sessionMarker))}catch(_){}
 return {...result,storage:createStorage(options.storage,result.activeScope)};
}

const API={PARAM,HISTORY_KEY,SESSION_KEY,PREFIX,validToken,randomToken,scopedKey,createStorage,resolve,boot};
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
  root.TOPIK_SHARE_SPACE={activeScope:'default',shareToken:null,isSharedSpace:false,error:String(err&&err.message||err)};
  root.TOPIK_STORAGE=root.localStorage;
  try{console.warn('TOPIK share-space fallback:',err)}catch(_){}
 }
}
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
