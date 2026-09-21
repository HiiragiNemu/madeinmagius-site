import assert from 'node:assert/strict';
import { onRequestGet as pinned, onRequestHead as pinnedHead } from '../functions/downloads/pinned/[project]/[version].js';
import { onRequestGet as legacy } from '../functions/downloads/legacy/[[path]].js';
import pinnedData from '../data/pinned-assets.js';
import legacyData from '../data/legacy-assets.js';
const original=globalThis.fetch;
let calls=[];
globalThis.fetch=async(url,init={})=>{
 calls.push({url,headers:new Headers(init.headers)});
 if(String(url).startsWith('https://api.github.com/'))return new Response(null,{status:302,headers:{location:'https://release-assets.githubusercontent.com/fixture'}});
 assert.equal(new Headers(init.headers).has('authorization'),false,'GitHub token must not cross redirect');
 return new Response('apk',{status:200,headers:{'content-type':'application/octet-stream'}});
};
try {
 const env={GITHUB_RELEASES_TOKEN:'fixture-token'};
 for(const [key,asset] of Object.entries(pinnedData)){
  const [project,version]=key.split('/');const context={env,params:{project,version},request:new Request('https://site.test')};
  const h=await pinnedHead(context);assert.equal(h.status,200);assert.equal(h.headers.get('content-length'),String(asset.size));
  const r=await pinned(context);assert.equal(r.status,200);assert.equal(r.headers.get('x-release-digest'),asset.digest);assert.equal(await r.text(),'apk');
 }
 for(const key of Object.keys(legacyData)){
  const r=await legacy({env,params:{path:key.split('/')},request:new Request('https://site.test')});assert.equal(r.status,200);assert.equal(r.headers.get('x-release-digest'),legacyData[key].digest);
 }
 assert.equal((await pinned({env,params:{project:'bilibili',version:'999.0.0'}})).status,404);
 assert.equal((await legacy({env,params:{path:['__proto__']}})).status,404);
 console.log('UPDATE_ROUTES_PASS: 2 pinned identities, '+Object.keys(legacyData).length+' legacy paths, unknown routes rejected, credentials isolated');
}finally{globalThis.fetch=original;}
