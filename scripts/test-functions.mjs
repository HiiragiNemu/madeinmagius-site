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
      {id:13,name:'Bilibili-Follower-Snapshot-v9.9.9-source.zip',size:7,digest:'sha256:src',content_type:'application/zip',url:'https://api.github.test/assets/13'},
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

const exedraReleases = [
  {
    tag_name:'tw-jp-tools-v9.0.0', published_at:'2026-09-19T00:00:00Z',
    assets:[
      {id:31,name:'MagiaExedraTWJPTools-v9.0.0.zip',size:7,digest:'sha256:eee',content_type:'application/zip',url:'https://api.github.test/assets/31'},
    ],
  },
  {
    tag_name:'jp-v9.0.0', published_at:'2026-09-18T00:00:00Z',
    assets:[
      {id:32,name:'com.aniplex.magia.exedra.jp-9.0.0.xapk',size:8,digest:'sha256:fff',content_type:'application/octet-stream',url:'https://api.github.test/assets/32'},
    ],
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
  assert.equal(data.projects.bilibili.assets.sourceZip.download,'./downloads/bilibili/source');
  assert.equal(data.projects.bilibili.assets.consoleScript.download,'./downloads/bilibili-follower-snapshot-console.js');
  assert.equal(data.projects.bilibili.assets.consoleText.download,'./downloads/bilibili-follower-snapshot-console.txt');
  assert.equal(data.projects.exedra.assets.twXapk.name,'tw.sonet.magiaexedra-9.0.0-99999999.xapk');
  assert.equal(data.projects.exedra.assets.jpXapk.name,'com.aniplex.magia.exedra.jp-9.0.0.xapk');
  assert.equal(data.projects.exedra.assets.tools.name,'MagiaExedraTWJPTools-v9.0.0.zip');
  assert.equal(data.projects.exedra.assets.tools.download,'./downloads/exedra/tools');
  assert.ok(!JSON.stringify(data).includes('fake-token'));

  const binary = await download({
    env:{GITHUB_RELEASES_TOKEN:'fake-token'},
    params:{project:'bilibili',kind:'android'},
    request:new Request('https://site.test/downloads/bilibili/android'),
  });
  assert.equal(binary.status,200);
  assert.match(binary.headers.get('content-disposition') || '',/Bilibili-Follower-Snapshot-Companion/);
  assert.equal(binary.headers.get('x-release-digest'),'sha256:aaa');
  assert.equal(binary.headers.get('content-length'),'3');
  assert.equal(binary.headers.get('accept-ranges'),'bytes');

  const partial = await download({
    env:{GITHUB_RELEASES_TOKEN:'fake-token'},
    params:{project:'bilibili',kind:'android'},
    request:new Request('https://site.test/downloads/bilibili/android',{headers:{Range:'bytes=0-1'}}),
  });
  assert.equal(partial.status,206);
  assert.equal(partial.headers.get('content-range'),'bytes 0-1/3');
  assert.equal(partial.headers.get('content-length'),'2');

  const head = await headDownload({
    env:{GITHUB_RELEASES_TOKEN:'fake-token'},
    params:{project:'netease',kind:'windows'},
    request:new Request('https://site.test/downloads/netease/windows',{method:'HEAD'}),
  });
  assert.equal(head.status,200);
  assert.equal(head.headers.get('content-length'),'5');
  assert.equal(await head.text(),'');

  const exedra = await download({
    env:{GITHUB_RELEASES_TOKEN:'fake-token'},
    params:{project:'exedra',kind:'tw-xapk'},
    request:new Request('https://site.test/downloads/exedra/tw-xapk'),
  });
  assert.equal(exedra.status,200);
  assert.match(exedra.headers.get('content-disposition') || '',/tw\.sonet\.magiaexedra/);
  assert.equal(exedra.headers.get('x-release-digest'),'sha256:ggg');

  const sourceZip = await download({
    env:{GITHUB_RELEASES_TOKEN:'fake-token'},
    params:{project:'bilibili',kind:'source'},
    request:new Request('https://site.test/downloads/bilibili/source'),
  });
  assert.equal(sourceZip.status,200);
  assert.match(sourceZip.headers.get('content-disposition') || '',/source\.zip/);
  assert.equal(sourceZip.headers.get('x-release-digest'),'sha256:src');

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
