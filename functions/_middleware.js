import { isMagirecoWithdrawnPath, magirecoGone } from '../lib/magireco-withdrawal.js';
// Only public metadata and the existing public console/userscript endpoints need fetch CORS.
// Downloads navigate normally. No cookie/credential access is granted.
const MIRROR_READ_PATHS = new Set([
  '/api/releases',
  '/api/magireco',
  '/downloads/bilibili-follower-snapshot-console.js',
  '/downloads/bilibili-follower-snapshot-console.txt',
  '/downloads/pixtag-companion.user.js',
  '/downloads/pixiv/userscript',
]);

export async function onRequest(context) {
  const { pathname } = new URL(context.request.url);
  const response = isMagirecoWithdrawnPath(pathname) ? magirecoGone(context.request) : await context.next();
  if ((!MIRROR_READ_PATHS.has(pathname) && !pathname.startsWith('/api/pixiv/')) || !['GET', 'HEAD'].includes(context.request.method)) return response;
  const publicResponse = new Response(response.body, response);
  publicResponse.headers.set('access-control-allow-origin', 'https://hiiraginemu.github.io');
  return publicResponse;
}
