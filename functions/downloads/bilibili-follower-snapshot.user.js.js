import {
  onRequestGet as download,
  onRequestHead as headDownload,
} from './[project]/[kind].js';

async function installResponse(context, headOnly) {
  // Keep the .user.js URL and script body together so userscript managers can
  // recognize installation and update requests without following a download URL.
  const response = await (headOnly ? headDownload : download)({
    ...context,
    params: { project: 'bilibili', kind: 'userscript' },
  });
  if (!response.ok) return response;

  const headers = new Headers(response.headers);
  headers.set('content-type', 'text/javascript; charset=utf-8');
  headers.set('content-disposition', 'inline; filename="bilibili-follower-snapshot.user.js"');
  headers.set('cache-control', 'public, max-age=0, must-revalidate');
  return new Response(response.body, { status: response.status, headers });
}

export function onRequestGet(context) {
  return installResponse(context, false);
}

export function onRequestHead(context) {
  return installResponse(context, true);
}
