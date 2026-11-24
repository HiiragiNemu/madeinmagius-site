import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {selectMagirecoRelease,RELEASE166_PUBLIC} from '../lib/magireco-release.js';
import {createMagirecoSnapshot} from './update-magireco-snapshot.mjs';
import {renderContent} from '../assets/content.js';
import snapshot from '../assets/magireco-release166.js';
const client=JSON.parse(await readFile(new URL('../data/magireco-release.signed.json',import.meta.url),'utf8'));
const release={draft:false,prerelease:false,assets:[
 {id:1,name:RELEASE166_PUBLIC.apkAsset,state:'uploaded',size:client.size,digest:'sha256:'+client.sha256},
 {id:2,name:RELEASE166_PUBLIC.sourceAsset,state:'uploaded',size:client.corresponding_source.size,digest:'sha256:'+client.corresponding_source.sha256}
]};
let checks=0,networkRequests=0;globalThis.fetch=()=>{networkRequests++;throw new Error('No network in local site verification');};
assert.equal((await selectMagirecoRelease(client,release)).version,'1.6.6');checks++;
assert.deepEqual(await createMagirecoSnapshot(client,release),snapshot);checks++;
for(const [label,mutate] of [
 ['outer-apk-hash',d=>d.sha256='0'.repeat(64)],
 ['outer-source-hash',d=>d.corresponding_source.sha256='0'.repeat(64)],
 ['outer-source-commit',d=>d.source_commit='0'.repeat(40)],
 ['outer-source-archive-commit',d=>d.corresponding_source.source_commit='0'.repeat(40)],
 ['outer-version-code',d=>d.version_code=1713001031],
 ['outer-publication-status',d=>d.publication_status='SIGNED_CANDIDATE_NOT_PUBLISHED'],
 ['signed-metadata',d=>{const p=JSON.parse(d.signed_update.payload);p.sha256='0'.repeat(64);d.signed_update.payload=JSON.stringify(p);d.sha256=p.sha256;}],
 ['signed-source-hash',d=>{const p=JSON.parse(d.signed_update.payload);p.corresponding_source.sha256='0'.repeat(64);d.signed_update.payload=JSON.stringify(p);d.corresponding_source=p.corresponding_source;}],
 ['signed-source-commit',d=>{const p=JSON.parse(d.signed_update.payload);p.source_commit='0'.repeat(40);d.signed_update.payload=JSON.stringify(p);d.source_commit=p.source_commit;}],
 ['signature',d=>d.signed_update.signature=(d.signed_update.signature[0]==='0'?'1':'0')+d.signed_update.signature.slice(1)]
]){const d=structuredClone(client);mutate(d);await assert.rejects(()=>selectMagirecoRelease(d,release),undefined,label);checks++;}
for(const [label,mutate] of [
 ['wrong-apk-provider-digest',r=>r.assets[0].digest='sha256:'+'0'.repeat(64)],
 ['wrong-source-provider-digest',r=>r.assets[1].digest='sha256:'+'0'.repeat(64)],
 ['missing-source',r=>r.assets.pop()],
 ['duplicate-source',r=>r.assets.push({...r.assets[1],id:3})],
 ['wrong-source-size',r=>r.assets[1].size++],
 ['draft-release',r=>r.draft=true]
]){const r=structuredClone(release);mutate(r);await assert.rejects(()=>selectMagirecoRelease(client,r),undefined,label);checks++;}
for(const version_code of [1713001033,1713001041,1713001042,1713001043,1713001044,1713001046]){await assert.rejects(()=>createMagirecoSnapshot({...client,version_code}),/MAGIRECO_WITHDRAWN/);checks++;}
const html=renderContent('home','magireco-private-server',{});
for(const field of [snapshot.download,snapshot.sha256,snapshot.corresponding_source.url,snapshot.corresponding_source.sha256,snapshot.corresponding_source.source_commit]){assert(html.includes(field));checks++;}
assert.equal(snapshot.download,'https://github.com/HiiragiNemu/ProgettoMagius-1/releases/download/v1.6.6/'+RELEASE166_PUBLIC.apkAsset);checks++;
assert.equal((html.match(/<a\b/g)||[]).length,2);checks++;assert.equal(networkRequests,0);
console.log(JSON.stringify({status:'EXACT_PUBLIC166_SIGNATURE_AND_CARD_PASS',checks,networkRequests,signature:'original real RSA verifier',scope:'exact 1.6.6 only',providerAssets:'offline descriptors; actual public body/readback parent-owned'}));
