export function onRequestGet(context) {
  const url = new URL(context.request.url);
  url.pathname = '/downloads/bilibili/userscript';
  url.search = '';
  return Response.redirect(url.toString(), 302);
}
