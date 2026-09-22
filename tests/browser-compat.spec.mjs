import { test, expect } from '@playwright/test';

test('terminal optics, responsive information hierarchy, home jump and public downloads work', async ({ page }, testInfo) => {
  const isMobileProject = testInfo.project.name.includes('ios') || testInfo.project.name.includes('android');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(420);
  await expect(page.locator('.boot__wordmark')).toBeVisible();
  await expect(page.locator('#signal #boot')).toHaveCount(1);
  expect(await page.locator('#boot').evaluate(el => !!el.closest('.screen'))).toBe(true);
  await expect(page.locator('.boot__raster')).toBeVisible();
  await expect(page.locator('.boot__grain')).toBeVisible();
  await page.screenshot({ path: `test-results/${testInfo.project.name}-boot.png`, fullPage: false });
  await expect(page.locator('#boot')).toHaveClass(/is-hidden/, { timeout: 6000 });

  await expect(page.locator('.screen')).toBeVisible();

  // performance-static-check: no continuous scan/jitter loops.
  const perfState = await page.evaluate(() => ({
    trackingDisplay: getComputedStyle(document.querySelector('#tracking-sweep')).display,
    rollingDisplay: getComputedStyle(document.querySelector('.rolling-band')).display,
    tearDisplay: getComputedStyle(document.querySelector('.tear-band')).display,
    scanlineAnimation: getComputedStyle(document.querySelector('.scanlines')).animationName,
    grainAnimation: getComputedStyle(document.querySelector('.tube-grain')).animationName,
    signalTransform: getComputedStyle(document.querySelector('#signal')).transform,
  }));
  expect(perfState.trackingDisplay).toBe('none');
  expect(perfState.rollingDisplay).toBe('none');
  expect(perfState.tearDisplay).toBe('none');
  expect(perfState.scanlineAnimation).toBe('none');
  expect(perfState.grainAnimation).toBe('none');

  const staticLowFi = await page.evaluate(() => ({
    grainOpacity: Number(getComputedStyle(document.querySelector('.tube-grain')).opacity),
    scanOpacity: Number(getComputedStyle(document.querySelector('.scanlines')).opacity),
    phosphorOpacity: Number(getComputedStyle(document.querySelector('.phosphor-grid')).opacity),
    headingShadow: getComputedStyle(document.querySelector('.masthead__row h1')).textShadow,
  }));
  expect(staticLowFi.grainOpacity).toBeGreaterThanOrEqual(0.19);
  expect(staticLowFi.scanOpacity).toBeGreaterThanOrEqual(0.38);
  expect(staticLowFi.phosphorOpacity).toBeGreaterThanOrEqual(0.05);
  expect(staticLowFi.headingShadow).not.toBe('none');

  await expect(page.locator('.tube-grain')).toBeAttached();
  await expect(page.locator('#pixel-toggle')).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => document.fonts.load('12px MagiusPixel'));
  expect(await page.evaluate(() => document.fonts.check('12px MagiusPixel'))).toBeTruthy();
  await expect(page.locator('.boot__wordmark')).toHaveAttribute('src', /magius-link-wordmark\.svg/);

  const iosCSS = await page.locator('html').getAttribute('data-crt-platform') === 'ios-webkit';
  await expect(page.locator('html')).toHaveAttribute('data-crt-engine', iosCSS ? 'ios-static-css' : 'static-svg');
  const signalFilter = await page.locator('#signal').evaluate(el => getComputedStyle(el).filter);
  expect(signalFilter.includes('url(')).toBe(!iosCSS);
  if (iosCSS) expect(signalFilter).toBe('none');
  if (iosCSS) {
    await expect(page.locator('#curve-displacement')).toHaveAttribute('scale', '0');
    expect(await page.locator('#crt-warp-map').getAttribute('href')).toBeNull();
  } else {
    expect(Number(await page.locator('#curve-displacement').getAttribute('scale'))).toBeGreaterThan(0);
    await expect(page.locator('#crt-warp-map')).toHaveAttribute('href', /^data:image\/png/);
  }
  const controlsContained = await page.evaluate(() => {
    const bar = document.querySelector('.masthead__bar').getBoundingClientRect();
    return ['#pixel-toggle', '#home-jump'].every(selector => {
      const r = document.querySelector(selector).getBoundingClientRect();
      return r.top >= bar.top + 1 && r.bottom <= bar.bottom - 1 && r.left >= bar.left && r.right <= bar.right;
    });
  });
  expect(controlsContained).toBe(true);

  await page.bringToFront();
  await expect(page.locator('#tracking-sweep')).toBeAttached();
  await expect(page.locator('.tube-grain')).toBeAttached();
  const scanlineAnimation = await page.locator('.scanlines').evaluate(el => getComputedStyle(el).animationName);
  expect(scanlineAnimation).toBe('none');

  await page.locator('[data-program="bilibili"]').evaluate(el => el.click());
  await expect(page.locator('[data-sub="source"]')).toHaveCount(0);
  await expect(page.locator('[data-sub="android"]')).toBeVisible();
  await page.locator('[data-sub="android"]').evaluate(el => el.click());
  const apk = page.locator('.download-button').first();
  await expect(apk).toHaveAttribute('href', /downloads\/bilibili\/(?:android$|v0\.1\.9\/.*\.apk)/);
  if (isMobileProject) {
    expect(await page.locator('#content-panel').evaluate(node => node.previousElementSibling?.dataset?.sub)).toBe('android');
  }

  await page.locator('[data-program="netease"]').evaluate(el => el.click());
  await expect(page.locator('[data-sub="netease-source"]')).toHaveCount(0);
  const selectedNetease = page.locator('[data-program="netease"]');
  const selectedSubtitle = selectedNetease.locator('.menu-node__copy small');
  await expect(selectedNetease).toHaveClass(/is-selected/);
  expect(await selectedNetease.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
  expect(await selectedSubtitle.evaluate(el => getComputedStyle(el).color)).toBe('rgb(21, 54, 31)');
  await page.locator('[data-sub="windows"]').evaluate(el => el.click());
  if (isMobileProject) {
    await page.locator('[data-sub="windows"]').evaluate(el => el.click());
    await expect(page.locator('#content-panel')).toBeHidden();
    await page.locator('[data-sub="windows"]').evaluate(el => el.click());
    await expect(page.locator('#content-panel')).toBeVisible();
  }
  if (testInfo.project.name === 'desktop-chromium') {
    const layout = await page.evaluate(() => {
      const folders = document.querySelector('.folders')?.getBoundingClientRect();
      const subsystem = document.querySelector('.subsystem')?.getBoundingClientRect();
      const panel = document.querySelector('#content-panel')?.getBoundingClientRect();
      const firstSub = document.querySelector('.sub-node')?.getBoundingClientRect();
      return folders && subsystem && panel && firstSub ? {
        foldersWidth: folders.width,
        subsystemWidth: subsystem.width,
        panelWidth: panel.width,
        panelHeight: panel.height,
        firstSubWidth: firstSub.width,
        panelLeft: panel.left,
        subsystemRight: subsystem.right,
      } : null;
    });
    expect(layout).not.toBeNull();
    expect(layout.foldersWidth).toBeLessThan(235);
    expect(layout.subsystemWidth).toBeLessThan(285);
    expect(layout.firstSubWidth).toBeLessThan(285);
    expect(layout.panelWidth).toBeGreaterThan(650);
    expect(layout.panelHeight).toBeGreaterThan(430);
    expect(layout.panelLeft).toBeGreaterThanOrEqual(layout.subsystemRight - 3);
  }

  const win = page.locator('.download-button').first();
  await expect(win).toHaveAttribute('href', /downloads\/netease\/(?:windows$|v2\.5\.1\/.*windows-x64\.zip)/);

  await page.locator('[data-program="exedra"]').evaluate(el => el.click());
  await expect(page.locator('[data-sub="tw-demo"]')).toHaveCount(0);
  await page.locator('[data-sub="integrity"]').evaluate(el => el.click());
  await expect(page.getByText('TW ORIGINAL CLIENT')).toBeVisible();
  await expect(page.getByText('JP ORIGINAL CLIENT')).toBeVisible();

  await page.locator('#home-jump').click();
  await expect(page).toHaveURL(/#home\/welcome$/);
  await expect(page.locator('h2', { hasText: '魔法纪录相关网站' })).toBeVisible();

  await page.locator('#pixel-toggle').click();
  await expect(page.locator('#pixel-toggle')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#pixel-toggle').click();
  await expect(page.locator('#pixel-toggle')).toHaveAttribute('aria-pressed', 'true');

  await page.screenshot({ path: `test-results/${testInfo.project.name}-live.png`, fullPage: false });
});
