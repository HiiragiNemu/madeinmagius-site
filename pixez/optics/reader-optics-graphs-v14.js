/* PixEz Pulse v4.1 — Static Reader v14 Optical Filter Graphs
 * - Every tube filter includes a neutral #808080 feFlood safety floor under feImage
 *   so feDisplacementMap can NEVER shift the viewport by -25px during any frame.
 * - Distinct graphs for dark:green:true/false and dark:amber:true/false.
 * - Tuned dark:green & flat:green for crisp, bright, high-legibility CJK/Latin text
 *   with subtle CRT phosphor glow and zero heavy ghosting/smearing. */
(() => {
  'use strict';

  const LENS_BLOCK =
    '<feFlood flood-color="#808080" flood-opacity="1" result="neutralLens"></feFlood>' +
    '<feImage data-lens-map="true" href="./textures/magi-tube-lens-512.png" x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="lensImg"></feImage>' +
    '<feMerge result="lens"><feMergeNode in="neutralLens"></feMergeNode><feMergeNode in="lensImg"></feMergeNode></feMerge>';

  const DAY_REG_CHAIN =
    '<feColorMatrix in="SourceGraphic" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0 1" result="reg-red"></feColorMatrix>' +
    '<feOffset in="reg-red" dx="-0.42" dy="-0.12" result="reg-red-shift"></feOffset>' +
    '<feColorMatrix in="SourceGraphic" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 0 1" result="reg-green"></feColorMatrix>' +
    '<feColorMatrix in="SourceGraphic" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 0 1" result="reg-blue"></feColorMatrix>' +
    '<feOffset in="reg-blue" dx="0.56" dy="0.12" result="reg-blue-shift"></feOffset>' +
    '<feComposite in="reg-red-shift" in2="reg-green" operator="arithmetic" k2="1" k3="1" result="reg-rg"></feComposite>' +
    '<feComposite in="reg-rg" in2="reg-blue-shift" operator="arithmetic" k2="1" k3="1" result="reg-rgb"></feComposite>' +
    '<feComposite in="reg-rgb" in2="SourceGraphic" operator="in" result="reg-rgb-alpha"></feComposite>' +
    '<feComposite in="reg-rgb-alpha" in2="SourceGraphic" operator="arithmetic" k2="0.62" k3="0.38" result="reg-registered"></feComposite>' +
    '<feColorMatrix in="SourceGraphic" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  .5 .5 -1 0 0" result="reg-warm-key"></feColorMatrix>' +
    '<feOffset in="reg-warm-key" dx="-0.65" result="reg-warm-shift"></feOffset>' +
    '<feComposite in="reg-warm-key" in2="reg-warm-shift" operator="arithmetic" k2="1" k3="-1" result="reg-pale-edge"></feComposite>' +
    '<feOffset in="reg-pale-edge" dx="0.65" result="reg-pale-echo"></feOffset>' +
    '<feComponentTransfer in="reg-pale-echo" result="reg-pale-mask"><feFuncA type="linear" slope="1.8"></feFuncA></feComponentTransfer>' +
    '<feComposite in="reg-warm-shift" in2="reg-warm-key" operator="arithmetic" k2="1" k3="-1" result="reg-inverse-edge"></feComposite>' +
    '<feFlood flood-color="#fffcec" flood-opacity="0.20" result="reg-pale"></feFlood>' +
    '<feComposite in="reg-pale" in2="reg-pale-mask" operator="in" result="reg-pale-rim"></feComposite>' +
    '<feFlood flood-color="#355c9a" flood-opacity="0.12" result="reg-inverse"></feFlood>' +
    '<feComposite in="reg-inverse" in2="reg-inverse-edge" operator="in" result="reg-inverse-rim"></feComposite>' +
    '<feMerge result="reg-fringed"><feMergeNode in="reg-registered"></feMergeNode><feMergeNode in="reg-pale-rim"></feMergeNode><feMergeNode in="reg-inverse-rim"></feMergeNode></feMerge>' +
    '<feColorMatrix in="SourceGraphic" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  .2126 .7152 .0722 0 0" result="reg-luma"></feColorMatrix>' +
    '<feGaussianBlur in="reg-luma" stdDeviation="5" result="reg-surround"></feGaussianBlur>' +
    '<feComponentTransfer in="reg-surround" result="reg-plate"><feFuncA type="linear" slope="5" intercept="-2"></feFuncA></feComponentTransfer>' +
    '<feComponentTransfer in="reg-luma" result="reg-dark-ink"><feFuncA type="linear" slope="-5" intercept="1.5"></feFuncA></feComponentTransfer>' +
    '<feComposite in="reg-dark-ink" in2="reg-plate" operator="in" result="reg-core-mask"></feComposite>' +
    '<feComposite in="SourceGraphic" in2="reg-core-mask" operator="in" result="reg-core-signal"></feComposite>' +
    '<feComponentTransfer in="reg-core-signal" result="reg-original-core"><feFuncA type="linear" slope=".88"></feFuncA></feComponentTransfer>' +
    '<feMerge result="registeredScene" data-scene-registration="day"><feMergeNode in="reg-fringed"></feMergeNode><feMergeNode in="reg-original-core"></feMergeNode></feMerge>';

  // Crisp green CRT phosphor registration: retains sharp stroke core with subtle phosphor fringe (no heavy double-vision smearing)
  const GREEN_REG_CHAIN =
    '<feColorMatrix in="SourceGraphic" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0 1" result="reg-red"></feColorMatrix>' +
    '<feOffset in="reg-red" dx="-0.28" dy="-0.08" result="reg-red-shift"></feOffset>' +
    '<feColorMatrix in="SourceGraphic" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 0 1" result="reg-green"></feColorMatrix>' +
    '<feColorMatrix in="SourceGraphic" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 0 1" result="reg-blue"></feColorMatrix>' +
    '<feOffset in="reg-blue" dx="0.34" dy="0.08" result="reg-blue-shift"></feOffset>' +
    '<feComposite in="reg-red-shift" in2="reg-green" operator="arithmetic" k2="1" k3="1" result="reg-rg"></feComposite>' +
    '<feComposite in="reg-rg" in2="reg-blue-shift" operator="arithmetic" k2="1" k3="1" result="reg-rgb"></feComposite>' +
    '<feComposite in="reg-rgb" in2="SourceGraphic" operator="in" result="reg-rgb-alpha"></feComposite>' +
    '<feComposite in="reg-rgb-alpha" in2="SourceGraphic" operator="arithmetic" k2="0.34" k3="0.66" result="reg-registered"></feComposite>' +
    '<feColorMatrix in="SourceGraphic" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  .5 .5 -1 0 0" result="reg-warm-key"></feColorMatrix>' +
    '<feOffset in="reg-warm-key" dx="-0.42" result="reg-warm-shift"></feOffset>' +
    '<feComposite in="reg-warm-key" in2="reg-warm-shift" operator="arithmetic" k2="1" k3="-1" result="reg-pale-edge"></feComposite>' +
    '<feOffset in="reg-pale-edge" dx="0.42" result="reg-pale-echo"></feOffset>' +
    '<feComponentTransfer in="reg-pale-echo" result="reg-pale-mask"><feFuncA type="linear" slope="1.25"></feFuncA></feComponentTransfer>' +
    '<feComposite in="reg-warm-shift" in2="reg-warm-key" operator="arithmetic" k2="1" k3="-1" result="reg-inverse-edge"></feComposite>' +
    '<feFlood flood-color="#e3fff4" flood-opacity="0.22" result="reg-pale"></feFlood>' +
    '<feComposite in="reg-pale" in2="reg-pale-mask" operator="in" result="reg-pale-rim"></feComposite>' +
    '<feFlood flood-color="#a0eedf" flood-opacity="0.12" result="reg-inverse"></feFlood>' +
    '<feComposite in="reg-inverse" in2="reg-inverse-edge" operator="in" result="reg-inverse-rim"></feComposite>' +
    '<feMerge result="registeredScene" data-scene-registration="green"><feMergeNode in="reg-registered"></feMergeNode><feMergeNode in="reg-pale-rim"></feMergeNode><feMergeNode in="reg-inverse-rim"></feMergeNode></feMerge>';

  // Amber phosphor registration
  const AMBER_REG_CHAIN =
    '<feOffset in="SourceGraphic" dx="0" dy="0" result="reg-registered"></feOffset>' +
    '<feColorMatrix in="SourceGraphic" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1 0 -1 0 0" result="reg-yellow-red"></feColorMatrix>' +
    '<feColorMatrix in="SourceGraphic" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -1 2 -1 0 0" result="reg-yellow-green"></feColorMatrix>' +
    '<feComposite in="reg-yellow-red" in2="reg-yellow-green" operator="in" result="reg-yellow-key"></feComposite>' +
    '<feComponentTransfer in="reg-yellow-key" result="reg-warm-key"><feFuncA type="linear" slope="4"></feFuncA></feComponentTransfer>' +
    '<feOffset in="reg-warm-key" dx="0.55" result="reg-warm-shift"></feOffset>' +
    '<feComposite in="reg-warm-key" in2="reg-warm-shift" operator="arithmetic" k2="1" k3="-1" result="reg-pale-edge"></feComposite>' +
    '<feComponentTransfer in="reg-pale-edge" result="reg-pale-mask"><feFuncA type="linear" slope="1.5"></feFuncA></feComponentTransfer>' +
    '<feComposite in="reg-warm-shift" in2="reg-warm-key" operator="arithmetic" k2="1" k3="-1" result="reg-inverse-edge"></feComposite>' +
    '<feFlood flood-color="#fffcec" flood-opacity="0.45" result="reg-pale"></feFlood>' +
    '<feComposite in="reg-pale" in2="reg-pale-mask" operator="in" result="reg-pale-rim"></feComposite>' +
    '<feMerge result="registeredScene" data-scene-registration="amber"><feMergeNode in="reg-registered"></feMergeNode><feMergeNode in="reg-pale-rim"></feMergeNode></feMerge>';

  function buildDayTube(withReg) {
    const input = withReg ? 'registeredScene' : 'SourceGraphic';
    return (
      '<filter x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">' +
      LENS_BLOCK +
      (withReg ? DAY_REG_CHAIN : '') +
      `<feGaussianBlur in="${input}" stdDeviation="0.10" result="beam"></feGaussianBlur>` +
      '<feDisplacementMap in="beam" in2="lens" scale="50" xChannelSelector="R" yChannelSelector="G" result="curvedSignal"></feDisplacementMap>' +
      '<feGaussianBlur in="curvedSignal" stdDeviation="0.05" result="tubeSignal"></feGaussianBlur>' +
      '<feColorMatrix data-tube-bloom="threshold" in="tubeSignal" type="matrix" color-interpolation-filters="linearRGB" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  .29764 1.00128 .10108 0 -.55" result="emissionKey"></feColorMatrix>' +
      '<feComposite color-interpolation-filters="linearRGB" data-tube-bloom="emission" in="tubeSignal" in2="emissionKey" operator="in" result="phosphorEmission"></feComposite>' +
      '<feGaussianBlur color-interpolation-filters="linearRGB" data-tube-bloom="near" in="phosphorEmission" stdDeviation="3.5" result="nearScatter"></feGaussianBlur>' +
      '<feComponentTransfer color-interpolation-filters="linearRGB" data-tube-bloom="near-gain" in="nearScatter" result="nearBloom"><feFuncA type="linear" slope="0.04"></feFuncA></feComponentTransfer>' +
      '<feGaussianBlur color-interpolation-filters="linearRGB" data-tube-bloom="wide" in="phosphorEmission" stdDeviation="22" result="wideScatter"></feGaussianBlur>' +
      '<feComponentTransfer color-interpolation-filters="linearRGB" data-tube-bloom="wide-gain" in="wideScatter" result="wideBloom"><feFuncA type="linear" slope="0.02"></feFuncA></feComponentTransfer>' +
      '<feBlend color-interpolation-filters="sRGB" data-tube-bloom="near-merge" in="tubeSignal" in2="nearBloom" mode="screen" result="litSignal"></feBlend>' +
      '<feBlend color-interpolation-filters="sRGB" data-tube-bloom="wide-merge" in="litSignal" in2="wideBloom" mode="screen" result="originalOptics"></feBlend>' +
      '</filter>'
    );
  }

  function buildFrostTube(withReg) {
    const input = withReg ? 'registeredScene' : 'SourceGraphic';
    return (
      '<filter x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">' +
      LENS_BLOCK +
      (withReg ? DAY_REG_CHAIN : '') +
      `<feGaussianBlur in="${input}" stdDeviation="0.22" result="beam"></feGaussianBlur>` +
      '<feDisplacementMap in="beam" in2="lens" scale="50" xChannelSelector="R" yChannelSelector="G" result="curvedSignal"></feDisplacementMap>' +
      '<feGaussianBlur in="curvedSignal" stdDeviation="0.10" result="tubeSignal"></feGaussianBlur>' +
      '<feColorMatrix data-tube-bloom="threshold" in="tubeSignal" type="matrix" color-interpolation-filters="linearRGB" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  .29764 1.00128 .10108 0 -.55" result="emissionKey"></feColorMatrix>' +
      '<feComposite color-interpolation-filters="linearRGB" data-tube-bloom="emission" in="tubeSignal" in2="emissionKey" operator="in" result="phosphorEmission"></feComposite>' +
      '<feGaussianBlur color-interpolation-filters="linearRGB" data-tube-bloom="near" in="phosphorEmission" stdDeviation="3.5" result="nearScatter"></feGaussianBlur>' +
      '<feComponentTransfer color-interpolation-filters="linearRGB" data-tube-bloom="near-gain" in="nearScatter" result="nearBloom"><feFuncA type="linear" slope="0.22"></feFuncA></feComponentTransfer>' +
      '<feGaussianBlur color-interpolation-filters="linearRGB" data-tube-bloom="wide" in="phosphorEmission" stdDeviation="20" result="wideScatter"></feGaussianBlur>' +
      '<feComponentTransfer color-interpolation-filters="linearRGB" data-tube-bloom="wide-gain" in="wideScatter" result="wideBloom"><feFuncA type="linear" slope="0.24"></feFuncA></feComponentTransfer>' +
      '<feBlend color-interpolation-filters="sRGB" data-tube-bloom="near-merge" in="tubeSignal" in2="nearBloom" mode="screen" result="litSignal"></feBlend>' +
      '<feBlend color-interpolation-filters="sRGB" data-tube-bloom="wide-merge" in="litSignal" in2="wideBloom" mode="screen" result="originalOptics"></feBlend>' +
      '<feGaussianBlur color-interpolation-filters="linearRGB" data-panel-bloom="diffuse" in="phosphorEmission" stdDeviation="40" result="panelScatter"></feGaussianBlur>' +
      '<feComponentTransfer color-interpolation-filters="linearRGB" in="panelScatter" result="panelBloom"><feFuncA type="linear" slope=".24"></feFuncA></feComponentTransfer>' +
      '<feBlend color-interpolation-filters="sRGB" in="originalOptics" in2="panelBloom" mode="screen"></feBlend>' +
      '</filter>'
    );
  }

  function buildDarkTube(phosphor, withReg) {
    const regChain = phosphor === 'amber' ? AMBER_REG_CHAIN : GREEN_REG_CHAIN;
    const input = withReg ? 'registeredScene' : 'SourceGraphic';
    const beamStd = phosphor === 'amber' ? '0.22' : '0.14';
    const tubeStd = phosphor === 'amber' ? '0.10' : '0.06';
    const nearSlope = phosphor === 'amber' ? '0.24' : '0.16';
    const wideSlope = phosphor === 'amber' ? '0.24' : '0.16';
    const panelSlope = phosphor === 'amber' ? '0.24' : '0.14';
    return (
      '<filter x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">' +
      LENS_BLOCK +
      (withReg ? regChain : '') +
      `<feGaussianBlur in="${input}" stdDeviation="${beamStd}" result="beam"></feGaussianBlur>` +
      '<feDisplacementMap in="beam" in2="lens" scale="50" xChannelSelector="R" yChannelSelector="G" result="curvedSignal"></feDisplacementMap>' +
      `<feGaussianBlur in="curvedSignal" stdDeviation="${tubeStd}" result="tubeSignal"></feGaussianBlur>` +
      '<feColorMatrix data-tube-bloom="threshold" in="tubeSignal" type="matrix" color-interpolation-filters="linearRGB" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  .29764 1.00128 .10108 0 -.55" result="emissionKey"></feColorMatrix>' +
      '<feComposite color-interpolation-filters="linearRGB" data-tube-bloom="emission" in="tubeSignal" in2="emissionKey" operator="in" result="phosphorEmission"></feComposite>' +
      '<feGaussianBlur color-interpolation-filters="linearRGB" data-tube-bloom="near" in="phosphorEmission" stdDeviation="3.2" result="nearScatter"></feGaussianBlur>' +
      `<feComponentTransfer color-interpolation-filters="linearRGB" data-tube-bloom="near-gain" in="nearScatter" result="nearBloom"><feFuncA type="linear" slope="${nearSlope}"></feFuncA></feComponentTransfer>` +
      '<feGaussianBlur color-interpolation-filters="linearRGB" data-tube-bloom="wide" in="phosphorEmission" stdDeviation="20" result="wideScatter"></feGaussianBlur>' +
      `<feComponentTransfer color-interpolation-filters="linearRGB" data-tube-bloom="wide-gain" in="wideScatter" result="wideBloom"><feFuncA type="linear" slope="${wideSlope}"></feFuncA></feComponentTransfer>` +
      '<feBlend color-interpolation-filters="sRGB" data-tube-bloom="near-merge" in="tubeSignal" in2="nearBloom" mode="screen" result="litSignal"></feBlend>' +
      '<feBlend color-interpolation-filters="sRGB" data-tube-bloom="wide-merge" in="litSignal" in2="wideBloom" mode="screen" result="originalOptics"></feBlend>' +
      '<feGaussianBlur color-interpolation-filters="linearRGB" data-panel-bloom="diffuse" in="phosphorEmission" stdDeviation="42" result="panelScatter"></feGaussianBlur>' +
      `<feComponentTransfer color-interpolation-filters="linearRGB" in="panelScatter" result="panelBloom"><feFuncA type="linear" slope="${panelSlope}"></feFuncA></feComponentTransfer>` +
      '<feBlend color-interpolation-filters="sRGB" in="originalOptics" in2="panelBloom" mode="screen"></feBlend>' +
      '</filter>'
    );
  }

  function buildFlatFilter(regChain) {
    return (
      '<filter x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">' +
      regChain +
      '</filter>'
    );
  }

  window.CallReaderGraphsV14 = Object.freeze({
    'day:false': buildDayTube(false),
    'day:true': buildDayTube(true),
    'frost:false': buildFrostTube(false),
    'frost:true': buildFrostTube(true),
    'dark:green:false': buildDarkTube('green', false),
    'dark:green:true': buildDarkTube('green', true),
    'dark:amber:false': buildDarkTube('amber', false),
    'dark:amber:true': buildDarkTube('amber', true),
    'flat:day': buildFlatFilter(DAY_REG_CHAIN),
    'flat:green': buildFlatFilter(GREEN_REG_CHAIN),
    'flat:amber': buildFlatFilter(AMBER_REG_CHAIN)
  });
})();
