import { magirecoGone } from '../../../../lib/magireco-withdrawal.js';
import assets from '../../../../data/pinned-assets.js';
import { servePinnedAsset } from '../../[project]/[kind].js';
function get(context,headOnly) {
 if(context.params.project==='magireco')return magirecoGone(headOnly?new Request(context.request.url,{method:'HEAD'}):context.request);
 const key=context.params.project+'/'+context.params.version;
 return servePinnedAsset(context,Object.hasOwn(assets,key)?assets[key]:null,headOnly);
}
export function onRequestGet(context){return get(context,false);}
export function onRequestHead(context){return get(context,true);}
