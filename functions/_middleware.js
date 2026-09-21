// Only public metadata and the existing public console script need fetch CORS.
// Downloads navigate normally. No cookie/credential access is granted.
const MIRROR_READ_PATHS = new Set([
  '/api/releases',
  '/api/magireco',
  '/downloads/bilibili-follower-snapshot-console.js',
  '/downloads/bilibili-follower-snapshot-console.txt',
]);

export async function onRequest(context) {
  const response = await context.next();
  const { pathname } = new URL(context.request.url);
  if (!MIRROR_READ_PATHS.has(pathname) || !['GET', 'HEAD'].includes(context.request.method)) return response;
  const publicResponse = new Response(response.body, response);
  publicResponse.headers.set('access-control-allow-origin', 'https://hiiraginemu.github.io');
  return publicResponse;
}
