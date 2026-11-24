import {
  onRequestGet as download,
  onRequestHead as headDownload,
} from './[project]/[kind].js';

async function installResponse(context, headOnly) {
  const response = await (headOnly ? headDownload : download)({
    ...context,
    params: { project: 'pixiv', kind: 'userscript' },
  });
  if (!response.ok) return response;

  const headers = new Headers(response.headers);
  headers.set('content-type', 'text/javascript; charset=utf-8');
  headers.set('content-disposition', 'inline; filename="pixtag-companion.user.js"');
  headers.set('cache-control', 'public, max-age=0, must-revalidate');
  return new Response(response.body, { status: response.status, headers });
}

export function onRequestGet(context) {
  return installResponse(context, false);
}

export function onRequestHead(context) {
  return installResponse(context, true);
}
