import {
  onRequestGet as download,
  onRequestHead as headDownload,
} from './[project]/[kind].js';

async function installResponse(context, headOnly) {
  let response = await (headOnly ? headDownload : download)({
    ...context,
    params: { project: 'pixiv', kind: 'userscript' },
  });
  if (!response.ok && context.env?.ASSETS?.fetch) {
    const origin = new URL(context.request.url).origin;
    const staticRes = await context.env.ASSETS.fetch(new Request(origin + '/pixez/downloads/pixtag-companion.user.js'));
    if (staticRes.ok) {
      response = new Response(headOnly ? null : staticRes.body, {
        status: 200,
        headers: staticRes.headers,
      });
    }
  }
  if (!response.ok) return response;

  const headers = new Headers(response.headers);
  headers.set('content-type', 'text/javascript; charset=utf-8');
  headers.set('content-disposition', 'inline; filename="pixtag-companion.user.js"');
  headers.set('cache-control', 'public, max-age=0, must-revalidate');
  headers.set('x-content-type-options', 'nosniff');
  return new Response(headOnly ? null : response.body, { status: response.status, headers });
}

export function onRequestGet(context) {
  return installResponse(context, false);
}

export function onRequestHead(context) {
  return installResponse(context, true);
}
