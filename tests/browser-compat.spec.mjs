import { test, expect } from '@playwright/test';

test('terminal optics, mobile accordion, home jump and public downloads work', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(420);
  await expect(page.locator('.boot__wordmark')).toBeVisible();
  await expect(page.locator('.boot__raster')).toBeVisible();
  await expect(page.locator('.boot__grain')).toBeVisible();
  await page.screenshot({ path: `test-results/${testInfo.project.name}-boot.png`, fullPage: false });
  await expect(page.locator('#boot')).toHaveClass(/is-hidden/, { timeout: 6000 });

  await expect(page.locator('.screen')).toBeVisible();
  await expect(page.locator('#pixel-toggle')).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => document.fonts.load('12px MagiusPixel'));
  expect(await page.evaluate(() => document.fonts.check('12px MagiusPixel'))).toBeTruthy();
  await expect(page.locator('.boot__wordmark')).toHaveAttribute('src', /magius-link-wordmark\.svg/);

  const engine = await page.locator('html').getAttribute('data-crt-engine');
  expect(['svg', 'webkit-svg', 'ios-safe']).toContain(engine);
  if (testInfo.project.name === 'ios27-webkit-safe') {
    expect(engine).toBe('ios-safe');
    const computedFilter = await page.locator('#signal').evaluate(el => getComputedStyle(el).filter);
    expect(computedFilter).not.toContain('url(');
  }

  await page.bringToFront();
  const documentHidden = await page.evaluate(() => document.hidden);
  if (!documentHidden && testInfo.project.name !== 'ios27-webkit-safe') {
    const initialTick = Number(await page.locator('#signal').getAttribute('data-tick') || '0');
    await page.waitForFunction(
      previous => Number(document.querySelector('#signal')?.dataset.tick || '0') > previous,
      initialTick,
      { timeout: 2400 }
    );
    const laterTick = Number(await page.locator('#signal').getAttribute('data-tick') || '0');
    expect(laterTick).toBeGreaterThan(initialTick);
  } else {
    await expect(page.locator('#tracking-sweep')).toBeAttached();
    await expect(page.locator('.tube-grain')).toBeAttached();
  }

  await page.locator('[data-program="bilibili"]').evaluate(el => el.click());
  await expect(page.locator('[data-sub="source"]')).toHaveCount(0);
  await expect(page.locator('[data-sub="android"]')).toBeVisible();
  await page.locator('[data-sub="android"]').evaluate(el => el.click());
  const apk = page.locator('.download-button').first();
  await expect(apk).toHaveAttribute('href', /bilibili-follower-snapshot\.pages\.dev\/downloads\/bilibili\/v0\.1\.9\/.*\.apk/);
  expect(await page.locator('#content-panel').evaluate(node => node.previousElementSibling?.dataset?.sub)).toBe('android');

  await page.locator('[data-program="netease"]').evaluate(el => el.click());
  await expect(page.locator('[data-sub="netease-source"]')).toHaveCount(0);
  const selectedNetease = page.locator('[data-program="netease"]');
  const selectedSubtitle = selectedNetease.locator('.menu-node__copy small');
  await expect(selectedNetease).toHaveClass(/is-selected/);
  expect(await selectedNetease.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
  expect(await selectedSubtitle.evaluate(el => getComputedStyle(el).color)).toBe('rgb(21, 54, 31)');
  await page.locator('[data-sub="windows"]').evaluate(el => el.click());
  if (testInfo.project.name.includes('ios') || testInfo.project.name.includes('android')) {
    await page.locator('[data-sub="windows"]').evaluate(el => el.click());
    await expect(page.locator('#content-panel')).toBeHidden();
    await page.locator('[data-sub="windows"]').evaluate(el => el.click());
    await expect(page.locator('#content-panel')).toBeVisible();
  }
  const win = page.locator('.download-button').first();
  await expect(win).toHaveAttribute('href', /bilibili-follower-snapshot\.pages\.dev\/downloads\/netease\/v2\.5\.1\/.*windows-x64\.zip/);

  await page.locator('[data-program="exedra"]').evaluate(el => el.click());
  await page.locator('[data-sub="integrity"]').evaluate(el => el.click());
  await expect(page.getByText('TW ORIGINAL CLIENT')).toBeVisible();
  await expect(page.getByText('JP ORIGINAL CLIENT')).toBeVisible();

  await page.locator('#home-jump').evaluate(el => el.click());
  await expect(page).toHaveURL(/#home\/welcome$/);
  await expect(page.locator('h2', { hasText: 'WELCOME' })).toBeVisible();

  await page.locator('#pixel-toggle').evaluate(el => el.click());
  await expect(page.locator('#pixel-toggle')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#pixel-toggle').evaluate(el => el.click());
  await expect(page.locator('#pixel-toggle')).toHaveAttribute('aria-pressed', 'true');

  await page.locator('[data-program="bilibili"]').click({ force: true });
  await expect(page.locator('#tracking-sweep')).toBeVisible();
  await expect(page.locator('#signal')).toHaveAttribute('data-tracking', 'true', { timeout: 1000 });

  await page.screenshot({ path: `test-results/${testInfo.project.name}-live.png`, fullPage: false });
});
