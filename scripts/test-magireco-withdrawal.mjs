import assert from 'node:assert/strict';
import {readFile,access,readdir} from 'node:fs/promises';
import {renderContent} from '../assets/content.js';
import {loadMagirecoReleaseData} from '../assets/magireco-loader.js';
import {onRequest as middleware} from '../functions/_middleware.js';
import * as api from '../functions/api/magireco.js';
import * as android from '../functions/downloads/magireco/android.js';
import * as pinned from '../functions/downloads/pinned/[project]/[version].js';
import * as legacy from '../functions/downloads/legacy/[[path]].js';
import pinnedAssets from '../data/pinned-assets.js';
import {createMagirecoSnapshot} from './update-magireco-snapshot.mjs';
import {readPublishedBundle,prepareSnapshotUpdate} from './sync-magireco-release.mjs';
let checks=0,networkRequests=0;
const eq=(a,b,label)=>{assert.deepEqual(a,b,label);checks++};
const ok=(x,label)=>{assert.ok(x,label);checks++};
globalThis.fetch=async()=>{networkRequests++;throw Error('External network prohibited');};
const context=(path,method='GET',params={})=>({request:new Request('https://local.invalid'+path,{method,headers:{range:'bytes=0-10'}}),params,env:{}});
for(const method of ['GET','HEAD','POST'])for(const path of ['/api/magireco','/api/magireco/','/downloads/magireco/android','/downloads/magireco/android?sha256=old','/downloads/pinned/magireco/1.1.1-evidence','/downloads/pinned/magireco/1.1.1-evidence-source','/downloads/legacy/magireco/old.apk','/downloads/pinned/%6dagireco/old.apk']){
 let next=0;const c=context(path,method);const r=await middleware({...c,next:async()=>{next++;return new Response('unreachable')}});
 eq(r.status,410,path+' '+method);eq(next,0);eq(r.headers.get('cache-control'),'no-store');eq(r.headers.get('location'),null);
 if(method==='HEAD')eq(await r.text(),'');else eq((await r.json()).status,'withdrawn');
}
for(const module of [api,android])for(const method of ['GET','HEAD','POST']){
 const r=await module.onRequest(context('/api/magireco',method));eq(r.status,410);if(method==='HEAD')eq(await r.text(),'');
}
for(const method of ['GET','HEAD'])for(const [m,path,params] of [[pinned,'/downloads/pinned/magireco/1.1.1-evidence',{project:'magireco',version:'1.1.1-evidence'}],[legacy,'/downloads/legacy/magireco/old.apk',{path:['magireco','old.apk']}]]){
 const r=await m[method==='HEAD'?'onRequestHead':'onRequestGet'](context(path,method,params));eq(r.status,410);if(method==='HEAD')eq(await r.text(),'');
}
for(const path of ['/api/releases','/downloads/exedra/jp-xapk','/downloads/exedra/tw-xapk','/downloads/bilibili/android','/downloads/netease/python','/downloads/pinned/bilibili/0.1.12','/downloads/legacy/netease/old.zip']){
 let called=0;const r=await middleware({...context(path),next:async()=>{called++;return new Response('preserved',{status:206})}});eq(called,1,path);eq(r.status,206);eq(await r.text(),'preserved');
}
for(const [key,asset] of Object.entries(pinnedAssets)){
 ok(!key.startsWith('magireco/'));const [project,version]=key.split('/');
 const r=await pinned.onRequestHead({...context('/downloads/pinned/'+key,'HEAD',{project,version}),env:{GITHUB_RELEASES_TOKEN:'host-fixture-no-network'}});
 eq(r.status,200,key);eq(r.headers.get('content-length'),String(asset.size));eq(r.headers.get('x-release-digest'),asset.digest);
}
for(const value of [null,{state:'loading'},{state:'error'},{state:'ready',version:'1.4.4',version_code:1713001003,size:137135680,sha256:'af78bad30b572cbcdf41b019faf62a36196751349b5eb71d9dec3931d6c7919e',download:'https://old.invalid/current.apk'}]){
 const html=renderContent('home','magireco-private-server',{magireco:value});ok(html.includes('已暂停下载'));ok(!html.includes('data-magireco-refresh'));ok(!/href="[^"]*(?:\.apk|source|\/downloads\/magireco)/.test(html));ok(html.includes('magireco-direct-downloads-20261029.html'));
}
let offers=[];eq(await loadMagirecoReleaseData({fetcher:globalThis.fetch,onUpdate:v=>offers.push(v)}),{state:'withdrawn'});eq(offers,[{state:'withdrawn'}]);
for(const name of ['magireco-release.json','magireco-release.signed.json']){await assert.rejects(access(new URL('../data/'+name,import.meta.url)));checks++;}
eq((await readdir(new URL('../assets/',import.meta.url))).filter(x=>x.startsWith('magireco-source')&&x.endsWith('.html')),[]);
const direct=await readFile(new URL('../assets/magireco-direct-downloads-20261029.html',import.meta.url),'utf8');
eq((direct.match(/<article>/g)||[]).length,4);ok(!/href="[^"]*(?:\.apk|source|releases\/tag\/latest)/.test(direct));
for(const name of ['cn_offline_update.zip','cn_js_delta_v2.zip','cn_base_00_db.zip','cn_base_01_json.zip'])ok(direct.includes('<h2>'+name+'</h2>'));
const evidence=renderContent('home','programs',{});ok(!evidence.includes('/downloads/pinned/magireco/'));ok(evidence.includes('资源与客户端比对报告'));
for(const fn of [()=>createMagirecoSnapshot({}),()=>readPublishedBundle({fetcher:globalThis.fetch}),()=>prepareSnapshotUpdate({}, {})]){await assert.rejects(fn,/MAGIRECO_WITHDRAWN/);checks++;}
eq(networkRequests,0);
console.log(JSON.stringify({status:'MAGIRECO_WITHDRAWAL_PASS',checks,networkRequests,withdrawnHTTPStatus:410,resourceZipArticles:4,otherProjectRoutesPreserved:true,regenerationBlocked:true}));
