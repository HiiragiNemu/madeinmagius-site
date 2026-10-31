import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {createMagirecoSnapshot} from './update-magireco-snapshot.mjs';
const original=JSON.parse(await readFile(new URL('../data/magireco-release.signed.json',import.meta.url)));
const historical141=JSON.parse(await readFile(new URL('./fixtures/magireco-source-materials141.json',import.meta.url)));
const historical140=JSON.parse(await readFile(new URL('./fixtures/magireco-source-materials140.json',import.meta.url)));
test('140 exact material scope is signed and never called complete source',async()=>{
 assert.equal(historical140.corresponding_source,undefined);
 assert.equal(historical140.source_materials.complete_apk_corresponding_source,false);
 const x=await createMagirecoSnapshot(historical140);assert.equal(x.version,'1.4.0');assert.equal(x.sha256,historical140.sha256);
});

test('141 exact material scope is signed and pins the RC9 artifact',async()=>{
 assert.equal(historical141.corresponding_source,undefined);
 assert.equal(historical141.source_materials.complete_apk_corresponding_source,false);
 assert.equal(historical141.source_materials.selected_source_leaf_count,199);
 assert.equal(historical141.source_materials.sha256,'ca96ec554bc21bee1615990e4324fea11588a1009eed835233b823e2a6538d1b');
 assert.equal(historical141.source_materials.size,34743127);
 const x=await createMagirecoSnapshot(historical141);
 assert.equal(x.version,'1.4.1');assert.equal(x.version_code,1713000902);assert.equal(x.size,136913819);
 assert.equal(x.sha256,'ae081b57976961504b0aca9cca1a41764b48a444c66441572babd330b550a76b');
});
test('142 exact material scope is signed and pins the RC2 artifact',async()=>{
 assert.equal(original.corresponding_source,undefined);
 assert.equal(original.source_materials.complete_apk_corresponding_source,false);
 assert.equal(original.source_materials.selected_source_leaf_count,199);
 assert.equal(original.source_materials.sha256,'107a75beddedc9e92005d24aaf2a9203b7062f41c01de43f498d2492adf5ce44');
 assert.equal(original.source_materials.size,34744292);
 const x=await createMagirecoSnapshot(original);
 assert.equal(x.version,'1.4.2');assert.equal(x.version_code,1713000903);assert.equal(x.size,136950683);
 assert.equal(x.sha256,'b0bfb557d561100567a2db3245d31cde26ce8625391770385918cf1779c7c0d6');
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
