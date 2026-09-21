import assets from '../../../data/legacy-assets.js';
import { servePinnedAsset } from '../[project]/[kind].js';
function get(context,headOnly) {
  const parts=context.params.path;
  const key=Array.isArray(parts)?parts.join('/'):String(parts||'');
  return servePinnedAsset(context, Object.hasOwn(assets,key)?assets[key]:null,headOnly);
}
export function onRequestGet(context){return get(context,false);}
export function onRequestHead(context){return get(context,true);}
