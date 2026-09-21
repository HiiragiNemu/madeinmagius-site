import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { setupCrtEffects } from '../assets/effects.js';
import { paintScrollRequested, startIOSPaintScroll } from '../assets/ios-paint-scroll.js';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const html = read('index.html');
const bootstrap = html.match(/<script id="crt-platform-bootstrap">([\s\S]*?)<\/script>/)[1];
assert.ok(html.indexOf('id="crt-platform-bootstrap"') < html.indexOf('rel="stylesheet"'));
const identities = [
  ['iPhone Safari', 'iPhone AppleWebKit Safari', 'iPhone', 5, true],
  ['iPhone Chrome', 'iPhone AppleWebKit CriOS Safari', 'iPhone', 5, true],
  ['iPad', 'iPad AppleWebKit Safari', 'iPad', 5, true],
  ['iPod', 'iPod AppleWebKit Safari', 'iPod', 5, true],
  ['desktop-mode iPad', 'Macintosh AppleWebKit Version/26 Safari', 'MacIntel', 5, true],
  ['macOS Safari', 'Macintosh AppleWebKit Version/26 Safari', 'MacIntel', 0, false],
  ['Android Chrome', 'Android AppleWebKit Chrome Mobile Safari', 'Linux aarch64', 5, false],
  ['Windows touch PC', 'Windows NT AppleWebKit Chrome Safari', 'Win32', 10, false],
  ['future non-WebKit iPhone', 'iPhone Gecko', 'iPhone', 5, false],
];
for (const [name,userAgent,platform,maxTouchPoints,ios] of identities) {
  const root = {dataset:{}};
  runInNewContext(bootstrap,{navigator:{userAgent,platform,maxTouchPoints},document:{documentElement:root}});
  assert.equal(root.dataset.crtPlatform,ios?'ios-webkit':'standard',name);
  if (ios) assert.equal(root.dataset.crtEngine,'ios-static-css');
  console.log(`PASS platform ${name}: ${root.dataset.crtPlatform}`);
}
// The iOS early return must allocate no canvas/lens and register no resize loop.
let scale;
globalThis.document = {documentElement:{dataset:{crtPlatform:'ios-webkit'}},
  getElementById:()=>({setAttribute:(key,value)=>{assert.equal(key,'scale');scale=value}}),
  createElement:()=>{throw new Error('iOS allocated a lens')}};
globalThis.window = {addEventListener:()=>{throw new Error('iOS listener')}};
globalThis.ResizeObserver = class {constructor(){throw new Error('iOS observer')}};
const fx=setupCrtEffects({});assert.equal(scale,'0');fx.destroy();fx.pulse();
assert.equal(document.documentElement.dataset.crtEngine,'ios-static-css');
for (const query of ['', '?iosPaintScroll=0', '?iosPaintScroll=1']) {
  assert.equal(paintScrollRequested(true, query), false);
  startIOSPaintScroll(null)();
}
const app=read('assets/app.js'),css=read('assets/styles.css');
assert.doesNotMatch(app,/ios-paint-scroll|usePaintScroll|stopPaintScroll|startIOSPaintScroll/);
assert.doesNotMatch(css,/data-ios-paint-scroll/);
assert.doesNotMatch(bootstrap,/localStorage|sessionStorage|location/);
assert.match(css,/html\[data-crt-platform="ios-webkit"\] \.signal\s*\{\s*filter:none!important/);
assert.ok(html.indexOf('id="boot"') > html.indexOf('id="signal"'));
assert.match(app,/scrollWithinTerminal\(selected\)/);
assert.match(app,/function animateRedraw\(\) \{[\s\S]*?if \(iosStatic\) return/);
assert.match(app,/if \(!iosStatic\) body.dataset.wake = 'true'/);
assert.match(css,/html\[data-crt-platform="ios-webkit"\] \.signal\{[\s\S]*?animation:none!important/);
console.log('PASS iOS prepaint + no lens allocation; retired query inert; native scroll; existing soft boot materials; no preference writes');
