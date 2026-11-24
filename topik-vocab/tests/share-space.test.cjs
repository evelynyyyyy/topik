const assert=require('node:assert/strict'),API=require('../share-space.js');
class Storage{constructor(){this.m=new Map()}getItem(k){return this.m.get(k)??null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
const base='https://evelynyyyyy.github.io/topik/topik-vocab/',a='a'.repeat(32),b='b'.repeat(32),storage=new Storage(),sessionStorage=new Storage();
const original=JSON.stringify({progress:{word:3},daily:{today:2},fsrs:{word:4}});
storage.setItem('topik_lab_v2',original);
function boot(href,state=null){return API.boot({location:{href},history:{state,replaceState(){}},storage,sessionStorage,crypto:{getRandomValues(x){x.fill(7)}}})}
for(let i=0;i<3;i++){const d=boot(base);assert.equal(d.url,base);assert.equal(d.activeScope,'default');assert.equal(d.storage.getItem('topik_lab_v2'),original);assert.ok(d.prepareUpdate(base+'?release=abc'))}
const A=boot(base+'?space='+a),B=boot(base+'?space='+b);
assert.equal(A.storage.getItem('topik_lab_v2'),null);A.storage.setItem('topik_lab_v2','A');assert.equal(B.storage.getItem('topik_lab_v2'),null);B.storage.setItem('topik_lab_v2','B');
assert.equal(boot(A.url).storage.getItem('topik_lab_v2'),'A');assert.equal(boot(base).storage.getItem('topik_lab_v2'),original);
assert.ok(A.prepareUpdate(A.url+'&release=abc'));assert.equal(A.prepareUpdate(base+'?release=abc'),false);
A.session.setItem('topik:resume-after-update','review');assert.equal(B.session.getItem('topik:resume-after-update'),null);
assert.equal(boot(base+'?share='+a).storage.getItem('topik_lab_v2'),'A');
const old='c'.repeat(32),marker={[API.HISTORY_KEY]:{urlToken:old,active:'default'}};
assert.equal(boot(base+'?share='+old,marker).url,base);assert.equal(boot(base+'?share='+old).activeScope,'default');
assert.equal(new URL(A.freshShareUrl()).searchParams.has('space'),true);
assert.throws(()=>boot(base+'?space=invalid'));assert.throws(()=>API.boot({location:{href:A.url},history:{replaceState(){throw Error('blocked')}},storage,sessionStorage}));
assert.equal(storage.getItem('topik_lab_v2'),original);
console.log('share-space.test.cjs passed');
