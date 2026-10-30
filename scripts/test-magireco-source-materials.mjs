import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {createMagirecoSnapshot} from './update-magireco-snapshot.mjs';
const original=JSON.parse(await readFile(new URL('../data/magireco-release.signed.json',import.meta.url)));
test('140 exact material scope is signed and never called complete source',async()=>{
 assert.equal(original.corresponding_source,undefined);
 assert.equal(original.source_materials.complete_apk_corresponding_source,false);
 const x=await createMagirecoSnapshot(original);assert.equal(x.version,'1.4.0');assert.equal(x.sha256,original.sha256);
});
for(const field of ['sha256','size','url','kind','complete_apk_corresponding_source','selected_source_leaf_count','apk_sha256','build_source_freeze_sha256'])test('reject unsigned material mutation '+field,async()=>{
 const x=structuredClone(original);x.source_materials[field]=typeof x.source_materials[field]==='number'?x.source_materials[field]+1:'tampered';
 await assert.rejects(()=>createMagirecoSnapshot(x));
});
test('reject relabeled complete source instead of approved materials',async()=>{
 const x=structuredClone(original);x.corresponding_source=x.source_materials;delete x.source_materials;await assert.rejects(()=>createMagirecoSnapshot(x));
});
test('reject signed payload material mutation without resigning',async()=>{
 const x=structuredClone(original);const p=JSON.parse(x.signed_update.payload);p.source_materials.complete_apk_corresponding_source=true;x.signed_update.payload=JSON.stringify(p);x.source_materials=p.source_materials;
 await assert.rejects(()=>createMagirecoSnapshot(x));
});
