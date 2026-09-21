import { readMagirecoRelease } from '../../../lib/magireco-release.js';
import { servePinnedAsset } from '../[project]/[kind].js';

function error(message, status) {
  return new Response(message, { status, headers: {
    'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  } });
}

async function download(context, headOnly) {
  try {
    const current = await readMagirecoRelease(context.env);
    const expected = new URL(context.request.url).searchParams.get('sha256');
    if (expected !== null && expected !== current.sha256) {
      return error('安装包已有更新，请返回下载页面，点击“重新检查版本”后再下载。', 409);
    }
    const response = await servePinnedAsset({ ...context, params: {} }, current.asset, headOnly);
    const headers = new Headers(response.headers);
    headers.set('cache-control', 'no-store');
    if (response.ok) headers.set('x-client-version', current.version);
    return new Response(response.body, { status: response.status, headers });
  } catch {
    return error('安装包正在发布同步，请稍后从下载页面重新检查版本。', 503);
  }
}

export function onRequestGet(context) { return download(context, false); }
export function onRequestHead(context) { return download(context, true); }
