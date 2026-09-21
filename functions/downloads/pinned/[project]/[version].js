import assets from '../../../../data/pinned-assets.js';
import { servePinnedAsset } from '../../[project]/[kind].js';
function get(context,headOnly) {
 const key=context.params.project+'/'+context.params.version;
 return servePinnedAsset(context,Object.hasOwn(assets,key)?assets[key]:null,headOnly);
}
export function onRequestGet(context){return get(context,false);}
export function onRequestHead(context){return get(context,true);}
