import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
    tag_name:'jp-v3.21.0', published_at:'2026-09-18T00:00:00Z',
    assets:[],
  },
  {
    tag_name:'v9.0.0', published_at:'2026-09-17T00:00:00Z',
    assets:[
      {id:33,name:'tw.sonet.magiaexedra-9.0.0-99999999.xapk',size:9,digest:'sha256:ggg',content_type:'application/octet-stream',url:'https://api.github.test/assets/33'},
    ],
  },
];

// Authenticated release lists can contain unpublished entries before stable ones.
const unpublishedReleases = ['draft', 'prerelease'].map((flag, index) => ({
  tag_name: `${flag}-v99.0.0`, [flag]: true, published_at: '2099-01-01T00:00:00Z',
  assets: [
    {id: 900 + index, name: 'com.aniplex.magia.exedra.jp-99.0.0.xapk', size: 99, digest: 'sha256:unpublished-jp', url: 'https://unexpected.test/unpublished-jp'},
    {id: 910 + index, name: 'tw.sonet.magiaexedra-99.0.0.xapk', size: 99, digest: 'sha256:unpublished-tw', url: 'https://unexpected.test/unpublished-tw'},
    {id: 920 + index, name: 'MagiaExedraTWJPTools-v99.0.0.zip', size: 99, digest: 'sha256:unpublished-tools', url: 'https://unexpected.test/unpublished-tools'},
  ],
}));
exedraReleases.unshift(...unpublishedReleases);

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

  if (url.startsWith('https://madeinmagius-site.pages.dev/downloads/legacy/netease/v2.5.1/')) {
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
  assert.equal(data.projects.bilibili.assets.userscript.name,'bilibili-follower-snapshot-v0.2.12.user.js');
  assert.equal(data.projects.bilibili.assets.userscript.size,160012);
  assert.equal(data.projects.bilibili.assets.userscript.digest,'sha256:3d196d8a60d5b131d65c6898506ef1fa7dac50cdbb9890a290b9825c7ce8ec21');
  assert.equal(data.projects.bilibili.assets.userscript.source_commit,'828283f42001780dcf9621e3ee904a455f4e1b75');
  assert.equal(data.projects.bilibili.assets.userscript.download,'./downloads/bilibili/userscript');
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
  assert.equal(data.projects.exedra.assets.twXapk.download,'./downloads/exedra/tw-xapk');
  assert.equal(data.projects.exedra.assets.jpXapk.name,'com.aniplex.magia.exedra.jp-3.22.0-26102219.xapk');
  assert.equal(data.projects.exedra.assets.jpXapk.download,'./downloads/exedra/jp-xapk');
  assert.equal(data.projects.exedra.assets.tools.name,'MagiaExedraTWJPTools-v9.0.0.zip');
  assert.equal(data.projects.exedra.published_at,'2026-09-19T00:00:00Z');
  assert.equal(data.projects.exedra.source_tags.twXapk,'v9.0.0');
  assert.ok(!JSON.stringify(data.projects.exedra).includes('unpublished'));
  for (const [kind, digest] of [['tw-xapk','sha256:ggg'],['tools','sha256:eee']]) {
    const stableHead = await headDownload({env:{GITHUB_RELEASES_TOKEN:'fake-token'},params:{project:'exedra',kind},request:new Request(`https://site.test/downloads/exedra/${kind}`,{method:'HEAD'})});
    assert.equal(stableHead.status,200);
    assert.equal(stableHead.headers.get('x-release-digest'),digest);
  }
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
  assert.equal(jp.status,302);
  assert.equal(jp.headers.get('location'),'https://github.com/HiiragiNemu/MagiaExedraTWTools/releases/download/jp-v3.22.0/com.aniplex.magia.exedra.jp-3.22.0-26102219.xapk');
  assert.equal(jp.headers.get('x-release-digest'),null);
  assert.equal(jp.headers.get('content-length'),null);
  assert.ok(!JSON.stringify([...jp.headers]).includes('fake-token'));

  const jpHead = await headDownload({
    env:{GITHUB_RELEASES_TOKEN:'fake-token'},
    params:{project:'exedra',kind:'jp-xapk'},
    request:new Request('https://site.test/downloads/exedra/jp-xapk',{method:'HEAD'}),
  });
  assert.equal(jpHead.status,302);
  assert.equal(jpHead.headers.get('location'),jp.headers.get('location'));

  // Once the source repository has a JP asset, keep the canonical route and stream it.
  exedraReleases.find(item => item.tag_name === 'jp-v3.21.0').assets.push({
    id:44,name:'com.aniplex.magia.exedra.jp-3.21.0.xapk',size:3,
    digest:'sha256:jp-test',content_type:'application/octet-stream',
    url:'https://api.github.test/assets/44',
  });
  const githubMetadata = await (await releases({env:{GITHUB_RELEASES_TOKEN:'fake-token'}})).json();
  assert.equal(githubMetadata.projects.exedra.assets.jpXapk.download,'./downloads/exedra/jp-xapk');
  const githubJp = await download({
    env:{GITHUB_RELEASES_TOKEN:'fake-token'},
    params:{project:'exedra',kind:'jp-xapk'},
    request:new Request('https://site.test/downloads/exedra/jp-xapk'),
  });
  assert.equal(githubJp.status,200);
  assert.equal(githubJp.headers.get('x-release-digest'),'sha256:jp-test');
  assert.equal(githubJp.headers.get('location'),null);

  const missing = await download({
    env:{GITHUB_RELEASES_TOKEN:'fake-token'},
    params:{project:'bad',kind:'bad'},
    request:new Request('https://site.test/downloads/bad/bad'),
  });
  assert.equal(missing.status,404);

  // Unpublished-only or empty lists use the fixed public fallback, not previews.
  const stableList = exedraReleases.slice();
  for (const list of [unpublishedReleases, []]) {
    exedraReleases.splice(0,exedraReleases.length,...list);
    const fallback = await (await releases({env:{GITHUB_RELEASES_TOKEN:'fake-token'}})).json();
    assert.equal(fallback.projects.exedra.assets.jpXapk.name,'com.aniplex.magia.exedra.jp-3.22.0-26102219.xapk');
    assert.equal(fallback.projects.exedra.assets.jpXapk.size,950073201);
    assert.equal(fallback.projects.exedra.assets.jpXapk.digest,'sha256:6d5e82ae0ea11860b972dab8bdd91bff258694e2447c355e0b8dc9a372407f91');
    assert.equal(fallback.projects.exedra.published_at,null);
    assert.deepEqual(fallback.projects.exedra.source_tags,{});
    for (const handler of [download,headDownload]) {
      const reply = await handler({env:{GITHUB_RELEASES_TOKEN:'fake-token'},params:{project:'exedra',kind:'jp-xapk'},request:new Request('https://site.test/downloads/exedra/jp-xapk')});
      assert.equal(reply.status,302);
      assert.equal(reply.headers.get('location'),'https://github.com/HiiragiNemu/MagiaExedraTWTools/releases/download/jp-v3.22.0/com.aniplex.magia.exedra.jp-3.22.0-26102219.xapk');
    }
  }
  exedraReleases.splice(0,exedraReleases.length,...stableList);

  console.log('cloudflare function tests: ok; Exedra draft/prerelease, current fallback and stable GET/HEAD preserved');
} finally {
  globalThis.fetch = originalFetch;
}


const buildScript = await readFile(new URL('./build.mjs', import.meta.url), 'utf8');
assert.match(
  buildScript,
  /include:\['\/api\/\*','\/downloads\/\*','\/updates\/\*'\]/,
  'Cloudflare routes must include dynamic update endpoints'
);
