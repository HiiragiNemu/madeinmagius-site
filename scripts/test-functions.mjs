import assert from 'node:assert/strict';
import { onRequestGet as releases } from '../functions/api/releases.js';
import { onRequestGet as download, onRequestHead as headDownload } from '../functions/downloads/[project]/[kind].js';

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
    tag_name:'v2.1.0', name:'NetEase old private release', published_at:'2026-08-23T00:00:00Z',
    html_url:'https://example.test/netease',
    assets:[
      {id:21,name:'NeteasePlaylistExporter-v2.1.0-windows-x64.zip',size:5,digest:'sha256:old-win',content_type:'application/zip',url:'https://api.github.test/assets/21'},
      {id:22,name:'NeteasePlaylistExporter-v2.1.0-python.zip',size:6,digest:'sha256:old-python',content_type:'application/zip',url:'https://api.github.test/assets/22'},
    ],
  },
};

const exedraReleases = [
  {
    tag_name:'tw-jp-tools-v9.0.0', published_at:'2026-09-19T00:00:00Z',
    assets:[
      {id:31,name:'MagiaExedraTWJPTools-v9.0.0.zip',size:7,digest:'sha256:eee',content_type:'application/zip',url:'https://api.github.test/assets/31'},
    ],
  },
  {
    tag_name:'jp-v3.18.0', published_at:'2026-09-18T00:00:00Z',
    assets:[],
  },
  {
    tag_name:'v9.0.0', published_at:'2026-09-17T00:00:00Z',
    assets:[
      {id:33,name:'tw.sonet.magiaexedra-9.0.0-99999999.xapk',size:9,digest:'sha256:ggg',content_type:'application/octet-stream',url:'https://api.github.test/assets/33'},
    ],
  },
];

globalThis.fetch = async (input, init = {}) => {
  const url = String(input);

  if (url.includes('HiiragiNemu/MagiaExedraTWTools/releases?per_page=30')) {
    return new Response(JSON.stringify(exedraReleases),{status:200,headers:{'content-type':'application/json'}});
  }

  const latest = url.match(/repos\/(.+)\/releases\/latest$/);
  if (latest) {
    const key = decodeURIComponent(latest[1]);
    const body = fixtures[key];
    return body
      ? new Response(JSON.stringify(body),{status:200,headers:{'content-type':'application/json'}})
      : new Response('missing',{status:404});
  }

  if (url.startsWith('https://bilibili-follower-snapshot.pages.dev/downloads/netease/v2.5.1/')) {
    const range = new Headers(init.headers || {}).get('range');
    if (range === 'bytes=0-1') {
      return new Response(new Uint8Array([1,2]),{
        status:206,
        headers:{'content-range':'bytes 0-1/18331073','content-length':'2','accept-ranges':'bytes'},
      });
    }
    return new Response(new Uint8Array([1,2,3]),{status:200,headers:{'accept-ranges':'bytes'}});
  }

  if (url.startsWith('https://d.apkpure.net/b/XAPK/com.aniplex.magia.exedra.jp')) {
    return new Response(new Uint8Array([1,2,3]),{
      status:200,
      headers:{'content-type':'application/xapk-package-archive','accept-ranges':'bytes'},
    });
  }

  const asset = url.match(/api\.github\.test\/assets\/(\d+)$/);
  if (asset) {
    return new Response(null,{status:302,headers:{location:`https://objects.test/${asset[1]}`}});
  }

  const object = url.match(/objects\.test\/(\d+)$/);
  if (object) {
    const range = new Headers(init.headers || {}).get('range');
    if (range === 'bytes=0-1') {
      return new Response(new Uint8Array([1,2]),{
        status:206,
        headers:{
          'content-type':'application/octet-stream',
          'content-range':'bytes 0-1/3',
          'content-length':'2',
          'accept-ranges':'bytes',
        },
      });
    }
    return new Response(new Uint8Array([1,2,3]),{
      status:200,
      headers:{'content-type':'application/octet-stream','accept-ranges':'bytes'},
    });
  }

  return new Response('unexpected ' + url,{status:500});
};

try {
  const metadata = await releases({env:{GITHUB_RELEASES_TOKEN:'fake-token'}});
  assert.equal(metadata.status,200);
  const data = await metadata.json();

  assert.equal(data.source,'cloudflare-live');
  assert.equal(data.projects.bilibili.tag,'v9.9.9');
  assert.equal(data.projects.bilibili.assets.android.download,'./downloads/bilibili/android');
  assert.equal(data.projects.bilibili.assets.sourceZip, undefined);
  assert.equal(data.projects.bilibili.assets.consoleScript.download,'./downloads/bilibili-follower-snapshot-console.js');
  assert.equal(data.projects.bilibili.assets.consoleText.download,'./downloads/bilibili-follower-snapshot-console.txt');

  // The private NetEase repository currently exposes an older release. The live
  // Cloudflare layer must never downgrade the public v2.5.1 assets.
  assert.equal(data.projects.netease.tag,'v2.5.1');
  assert.equal(data.projects.netease.source,'legacy-public-fallback');
  assert.equal(data.projects.netease.assets.windows.name,'NeteasePlaylistExporter-v2.5.1-windows-x64.zip');
  assert.equal(data.projects.netease.assets.androidFull.download,'./downloads/netease/android-full');
  assert.equal(data.projects.netease.assets.androidStore, undefined);
  assert.equal(data.projects.netease.assets.androidAab, undefined);
  assert.equal(data.projects.netease.assets.source, undefined);

  assert.equal(data.projects.exedra.assets.twXapk.name,'tw.sonet.magiaexedra-9.0.0-99999999.xapk');
  assert.equal(data.projects.exedra.assets.jpXapk.name,'com.aniplex.magia.exedra.jp-3.18.0.xapk');
  assert.equal(data.projects.exedra.assets.jpXapk.download,'./downloads/exedra/jp-xapk');
  assert.equal(data.projects.exedra.assets.tools.name,'MagiaExedraTWJPTools-v9.0.0.zip');
  assert.ok(!JSON.stringify(data).includes('fake-token'));

  const binary = await download({
    env:{GITHUB_RELEASES_TOKEN:'fake-token'},
    params:{project:'bilibili',kind:'android'},
    request:new Request('https://site.test/downloads/bilibili/android'),
  });
  assert.equal(binary.status,200);
  assert.match(binary.headers.get('content-disposition') || '',/Bilibili-Follower-Snapshot-Companion/);
  assert.equal(binary.headers.get('x-release-digest'),'sha256:aaa');

  const partial = await download({
    env:{GITHUB_RELEASES_TOKEN:'fake-token'},
    params:{project:'bilibili',kind:'android'},
    request:new Request('https://site.test/downloads/bilibili/android',{headers:{Range:'bytes=0-1'}}),
  });
  assert.equal(partial.status,206);
  assert.equal(partial.headers.get('content-range'),'bytes 0-1/3');
  assert.equal(partial.headers.get('content-length'),'2');

  const removedSource = await download({
    env:{GITHUB_RELEASES_TOKEN:'fake-token'},
    params:{project:'bilibili',kind:'source'},
    request:new Request('https://site.test/downloads/bilibili/source'),
  });
  assert.equal(removedSource.status,404);

  const removedStore = await download({
    env:{GITHUB_RELEASES_TOKEN:'fake-token'},
    params:{project:'netease',kind:'android-store'},
    request:new Request('https://site.test/downloads/netease/android-store'),
  });
  assert.equal(removedStore.status,404);

  const removedAab = await download({
    env:{GITHUB_RELEASES_TOKEN:'fake-token'},
    params:{project:'netease',kind:'android-aab'},
    request:new Request('https://site.test/downloads/netease/android-aab'),
  });
  assert.equal(removedAab.status,404);

  const removedNeteaseSource = await download({
    env:{GITHUB_RELEASES_TOKEN:'fake-token'},
    params:{project:'netease',kind:'source'},
    request:new Request('https://site.test/downloads/netease/source'),
  });
  assert.equal(removedNeteaseSource.status,404);

  const neteaseHead = await headDownload({
    env:{GITHUB_RELEASES_TOKEN:'fake-token'},
    params:{project:'netease',kind:'windows'},
    request:new Request('https://site.test/downloads/netease/windows',{method:'HEAD'}),
  });
  assert.equal(neteaseHead.status,200);
  assert.equal(neteaseHead.headers.get('content-length'),'18331073');
  assert.equal(neteaseHead.headers.get('x-release-digest'),'sha256:2cca372d639cb0a1d3fb0d53ef7188246d44e3ce2eeaa2e06e86fc7e366daa73');

  const jp = await download({
    env:{GITHUB_RELEASES_TOKEN:'fake-token'},
    params:{project:'exedra',kind:'jp-xapk'},
    request:new Request('https://site.test/downloads/exedra/jp-xapk'),
  });
  assert.equal(jp.status,200);
  assert.match(jp.headers.get('content-disposition') || '',/3\.18\.0\.xapk/);
  assert.equal(jp.headers.get('x-release-digest'),'sha256:43cd6eca5a8af7e8bf017fd922e4b0a9260e63933051f5eff3ae21c89a89a514');

  const missing = await download({
    env:{GITHUB_RELEASES_TOKEN:'fake-token'},
    params:{project:'bad',kind:'bad'},
    request:new Request('https://site.test/downloads/bad/bad'),
  });
  assert.equal(missing.status,404);

  console.log('cloudflare function tests: ok');
} finally {
  globalThis.fetch = originalFetch;
}
