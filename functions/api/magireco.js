import { readMagirecoRelease } from '../../lib/magireco-release.js';

export async function onRequestGet(context) {
  const headers = { 'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
  try {
    const { asset, ...current } = await readMagirecoRelease(context.env);
    return new Response(JSON.stringify(current), { headers });
  } catch {
    return new Response(JSON.stringify({ error: '发布信息正在同步或暂时不可用，请稍后重新检查。' }), { status: 503, headers });
  }
}
