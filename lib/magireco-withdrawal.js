// Owner-requested withdrawal of all MAGIA public distribution, 2026-11-03.
export function isMagirecoWithdrawnPath(path) {
  try { path=decodeURIComponent(path); } catch { return false; }
  return /^\/api\/magireco\/?$/.test(path) || /^\/downloads\/(?:pinned\/|legacy\/)?magireco(?:\/|$)/.test(path);
}
export function magirecoGone(request) {
  return new Response(request?.method === 'HEAD' ? null : JSON.stringify({status:'withdrawn',error:'本项目停止公开分发；现有客户端继续维护'}), {
    status:410,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}
  });
}
