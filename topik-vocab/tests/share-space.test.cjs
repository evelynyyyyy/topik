const assert=require('node:assert/strict');
const API=require('../share-space.js');

class MemoryStorage{
 constructor(){this.map=new Map()}
 getItem(k){return this.map.has(String(k))?this.map.get(String(k)):null}
 setItem(k,v){this.map.set(String(k),String(v))}
 removeItem(k){this.map.delete(String(k))}
}
const base='https://evelynyyyyy.github.io/topik/topik-vocab/';
const token='0123456789abcdef0123456789abcdef';
const next='fedcba9876543210fedcba9876543210';

const ownerStorage=new MemoryStorage();
ownerStorage.setItem('topik_lab_v2',JSON.stringify({owner:true,progress:{사람:{read:{step:3}}}}));
ownerStorage.setItem('topik_extra',JSON.stringify([[1,'테스트','测试']]));
ownerStorage.setItem('topik_theme_preference','dark');

const owner=API.resolve(base,null,null,()=>token);
assert.equal(owner.activeScope,'default');
assert.equal(new URL(owner.url).searchParams.get('share'),token);
assert.equal(API.createStorage(ownerStorage,owner.activeScope).getItem('topik_lab_v2'),ownerStorage.getItem('topik_lab_v2'));

const reload=API.resolve(owner.url,owner.historyState,null,()=>next);
assert.equal(reload.activeScope,'default','same history entry reload must keep the owner profile');

const updateUrl=new URL(owner.url);updateUrl.searchParams.set('release','build-sha');
const continuation=API.makeContinuation(owner.activeScope,owner.shareToken,updateUrl.href);
assert.ok(continuation);
const afterUpdate=API.resolve(updateUrl.href,null,continuation,()=>next);
assert.equal(afterUpdate.activeScope,'default','one-time update continuation must keep the active owner profile');
const sharedReleaseLink=API.resolve(updateUrl.href,null,null,()=>next);
assert.equal(sharedReleaseLink.activeScope,token,'a normal shared URL with release= must not inherit the sender profile');

const recipient=API.resolve(owner.url,null,null,()=>next);
assert.equal(recipient.activeScope,token,'opening the shared URL in a new navigation must create/select an isolated space');
const recipientStorage=API.createStorage(ownerStorage,recipient.activeScope);
assert.equal(recipientStorage.getItem('topik_lab_v2'),null,'recipient must not inherit owner learning state');
assert.equal(recipientStorage.getItem('topik_extra'),null,'recipient must not inherit owner custom vocabulary');
assert.equal(recipientStorage.getItem('topik_theme_preference'),null,'recipient must not inherit owner preferences');

recipientStorage.setItem('topik_lab_v2',JSON.stringify({recipient:true,progress:{학교:{read:{step:1}}}}));
recipientStorage.setItem('topik_extra',JSON.stringify([[1,'공유','分享']]));
assert.equal(JSON.parse(ownerStorage.getItem('topik_lab_v2')).owner,true,'recipient writes must not overwrite owner state');
assert.equal(JSON.parse(API.createStorage(ownerStorage,'default').getItem('topik_extra'))[0][1],'테스트');

const reopen=API.resolve(owner.url,null,null,()=>next);
assert.equal(reopen.activeScope,token);
assert.equal(JSON.parse(API.createStorage(ownerStorage,reopen.activeScope).getItem('topik_lab_v2')).recipient,true,'same shared URL on the same browser should resume its isolated local space');

const otherBrowser=new MemoryStorage();
assert.equal(API.createStorage(otherBrowser,recipient.activeScope).getItem('topik_lab_v2'),null,'the same shared URL on another browser must not contain sender data');

const withParams=API.resolve(base+'?chineseIme=legacy&release=abc',null,null,()=>token);
const parsed=new URL(withParams.url);
assert.equal(parsed.searchParams.get('chineseIme'),'legacy');
assert.equal(parsed.searchParams.get('release'),'abc');
assert.equal(parsed.searchParams.get('share'),token);

const sessionStorage=new MemoryStorage();
sessionStorage.setItem(API.CONTINUE_KEY,JSON.stringify(continuation));
let replaced=null;
const booted=API.boot({
 location:{href:updateUrl.href},
 history:{state:null,replaceState(state,_title,url){this.state=state;replaced=url}},
 storage:ownerStorage,
 sessionStorage,
 crypto:null
});
assert.equal(booted.activeScope,'default');
assert.equal(replaced,updateUrl.href);
assert.equal(sessionStorage.getItem(API.CONTINUE_KEY),null,'update continuation must be consumed exactly once');

assert.ok(API.scopedKey(token,'topik_lab_v2').startsWith(API.PREFIX+token+':'));
assert.equal(API.scopedKey(token,'unrelated_key'),'unrelated_key');

console.log('share-space.test.cjs passed');
