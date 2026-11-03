import { magirecoGone } from '../../../lib/magireco-withdrawal.js';
import assets from '../../../data/legacy-assets.js';
import { servePinnedAsset } from '../[project]/[kind].js';
function get(context,headOnly) {
  const parts=context.params.path;
  let key=Array.isArray(parts)?parts.join('/'):String(parts||'');
  try { key=decodeURIComponent(key); } catch { return new Response('Invalid asset path.',{status:400}); }
  if(key==='magireco'||key.startsWith('magireco/'))return magirecoGone(headOnly?new Request(context.request.url,{method:'HEAD'}):context.request);
  return servePinnedAsset(context, Object.hasOwn(assets,key)?assets[key]:null,headOnly);
}
export function onRequestGet(context){return get(context,false);}
export function onRequestHead(context){return get(context,true);}
