// Emergency owner-requested withdrawal, 2026-11-03. Resource ZIPs are separate.
export function isMagirecoWithdrawnPath(path) {
  try { path=decodeURIComponent(path); } catch { return false; }
  return /^\/api\/magireco\/?$/.test(path) || /^\/downloads\/(?:pinned\/|legacy\/)?magireco(?:\/|$)/.test(path);
}
export function magirecoGone(request) {
  return new Response(request?.method === 'HEAD' ? null : JSON.stringify({status:'withdrawn',error:'魔法纪录中文化私服 APK 与公开源码下载已暂停。'}), {
    status:410,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}
  });
}
