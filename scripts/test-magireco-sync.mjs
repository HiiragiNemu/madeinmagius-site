import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { readPublishedBundle, prepareSnapshotUpdate } from './sync-magireco-release.mjs';

const client = JSON.parse(await readFile(new URL('./fixtures/magireco-discovery138.json',import.meta.url)));
const root='https://github.com/HiiragiNemu/ProgettoMagius-1/releases/download/latest/';
const name='magireco-current-legacy-client.version.json';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function bundle() {
  const raw=Buffer.from(JSON.stringify(client));
  const release={draft:false,prerelease:false,assets:[
    {id:1,name,state:'uploaded',size:raw.length,digest:'sha256:'+sha(raw)},
    {id:2,name:'magireco-legacy-client-1.3.8.apk',state:'uploaded',size:client.size,digest:'sha256:'+client.sha256},
    {id:3,name:client.corresponding_source.asset,state:'uploaded',size:client.corresponding_source.size,digest:'sha256:'+client.corresponding_source.sha256},
  ]};
  const receipt={schema:1,status:'assets_verified',assets:[{name,size:raw.length,sha256:sha(raw),unchanged:true}]};
  const calls=[];
  const fetcher=async (url,init)=>{
    calls.push(url);
    if(url==='https://api.github.com/repos/HiiragiNemu/ProgettoMagius-1/releases/tags/latest') return Response.json(release);
    assert.equal(url,root+name); assert.equal(init.headers.Authorization,undefined);
    return new Response(raw);
  };
  return {raw,release,receipt,calls,fetcher};
}
test('verified current metadata synchronizes idempotently using only two bounded reads',async()=>{
  const f=bundle(); const live=await readPublishedBundle(f);
  const one=await prepareSnapshotUpdate(live,client),two=await prepareSnapshotUpdate(live,client);
  assert.deepEqual(one,two); assert.equal(JSON.parse(one.snapshot).version,'1.3.8');
  assert.equal(JSON.parse(one.snapshot).version_code,1713000895);
  assert.equal(f.calls.length,2); assert.ok(f.calls.every(x=>!x.endsWith('.apk')&&!x.endsWith('.zip')));
});
for(const [label,mutate] of Object.entries({
  failed:f=>f.receipt.status='failed',
  incomplete:f=>f.release.assets[0].state='new',
  missing:f=>f.receipt.assets=[],
  stale:f=>f.receipt.assets[0].sha256='0'.repeat(64),
  draft:f=>f.release.draft=true,
  mismatch:f=>f.release.assets[0].digest='sha256:'+'0'.repeat(64),
})) test('no snapshot update for invalid mirror or metadata: '+label,async()=>{
  const f=bundle();mutate(f);await assert.rejects(()=>readPublishedBundle(f));
});
test('invalid signature or missing published APK never produces a snapshot',async()=>{
  const f=bundle();const changed=structuredClone(client);changed.signed_update.signature='0'.repeat(768);
  await assert.rejects(()=>prepareSnapshotUpdate({client:changed,release:f.release},client));
  f.release.assets.splice(1,1);
  await assert.rejects(()=>prepareSnapshotUpdate({client,release:f.release},client));
});
