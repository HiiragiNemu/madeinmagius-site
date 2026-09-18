import assert from 'node:assert/strict';
import { onRequestGet as releases } from '../functions/api/releases.js';
import { onRequestGet as download } from '../functions/downloads/[project]/[kind].js';

const originalFetch = globalThis.fetch;
const fixtures = {
  'HiiragiNemu/Bilibili-Follower-Snapshot': {
    tag_name:'v9.9.9', name:'Bilibili test', published_at:'2026-09-19T00:00:00Z',
    html_url:'https://example.test/bilibili',
    assets:[
      {id:11,name:'Bilibili-Follower-Snapshot-Companion-v9.9.9.apk',size:3,digest:'sha256:aaa',content_type:'application/vnd.android.package-archive',url:'https://api.github.test/assets/11'},
      {id:12,name:'bilibili-follower-snapshot-v9.9.9.user.js',size:4,digest:'sha256:bbb',content_type:'application/javascript',url:'https://api.github.test/assets/12'},
    ],
  },
  'HiiragiNemu/netease-cloudmusic-delisted-exporter': {
    tag_name:'v8.8.8', name:'NetEase test', published_at:'2026-09-19T00:00:00Z',
    html_url:'https://example.test/netease',
    assets:[
      {id:21,name:'NeteasePlaylistExporter-v8.8.8-windows-x64.zip',size:5,digest:'sha256:ccc',content_type:'application/zip',url:'https://api.github.test/assets/21'},
      {id:22,name:'NeteasePlaylistExporter-v8.8.8-python.zip',size:6,digest:'sha256:ddd',content_type:'application/zip',url:'https://api.github.test/assets/22'},
    ],
  },
};

globalThis.fetch = async (input) => {
  const url = String(input);
  const latest = url.match(/repos\/(.+)\/releases\/latest$/);
  if (latest) {
    const key = decodeURIComponent(latest[1]);
    const body = fixtures[key];
    return body
      ? new Response(JSON.stringify(body),{status:200,headers:{'content-type':'application/json'}})
      : new Response('missing',{status:404});
  }
  const asset = url.match(/api\.github\.test\/assets\/(\d+)$/);
  if (asset) return new Response(null,{status:302,headers:{location:`https://objects.test/${asset[1]}`}});
  const object = url.match(/objects\.test\/(\d+)$/);
  if (object) return new Response(new Uint8Array([1,2,3]),{status:200,headers:{'content-type':'application/octet-stream'}});
  return new Response('unexpected',{status:500});
};

try {
  const metadata = await releases({env:{GITHUB_RELEASES_TOKEN:'fake-token'}});
  assert.equal(metadata.status,200);
  const data = await metadata.json();
  assert.equal(data.source,'cloudflare-live');
  assert.equal(data.projects.bilibili.tag,'v9.9.9');
  assert.equal(data.projects.netease.assets.windows.name,'NeteasePlaylistExporter-v8.8.8-windows-x64.zip');
  assert.equal(data.projects.bilibili.assets.android.download,'./downloads/bilibili/android');
  assert.ok(!JSON.stringify(data).includes('fake-token'));

  const binary = await download({
    env:{GITHUB_RELEASES_TOKEN:'fake-token'},
    params:{project:'bilibili',kind:'android'},
  });
  assert.equal(binary.status,200);
  assert.match(binary.headers.get('content-disposition') || '',/Bilibili-Follower-Snapshot-Companion/);
  assert.equal(binary.headers.get('x-release-digest'),'sha256:aaa');

  const missing = await download({
    env:{GITHUB_RELEASES_TOKEN:'fake-token'},
    params:{project:'bad',kind:'bad'},
  });
  assert.equal(missing.status,404);

  console.log('cloudflare function tests: ok');
} finally {
  globalThis.fetch = originalFetch;
}
