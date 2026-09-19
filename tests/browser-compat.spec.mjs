import { test, expect } from '@playwright/test';

test('terminal optics, mobile accordion, home jump and public downloads work', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#boot.is-hidden', { timeout: 6000 });

  await expect(page.locator('.screen')).toBeVisible();
  await expect(page.locator('#pixel-toggle')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.boot__wordmark')).toHaveAttribute('src', /magius-link-wordmark\.svg/);

  const engine = await page.locator('html').getAttribute('data-crt-engine');
  expect(['svg', 'webkit-svg', 'ios-safe']).toContain(engine);

  const initialJitter = await page.locator('html').evaluate(el => getComputedStyle(el).getPropertyValue('--jitter-x'));
  await page.waitForTimeout(160);
  const laterJitter = await page.locator('html').evaluate(el => getComputedStyle(el).getPropertyValue('--jitter-x'));
  expect(laterJitter).not.toBe(initialJitter);

  await page.locator('[data-program="bilibili"]').click();
  await expect(page.locator('[data-sub="android"]')).toBeVisible();
  await page.locator('[data-sub="android"]').click();
  const apk = page.locator('.download-button').first();
  await expect(apk).toHaveAttribute('href', /bilibili-follower-snapshot\.pages\.dev\/downloads\/bilibili\/v0\.1\.9\/.*\.apk/);
  expect(await page.locator('#content-panel').evaluate(node => node.previousElementSibling?.dataset?.sub)).toBe('android');

  await page.locator('[data-program="netease"]').click();
  await page.locator('[data-sub="windows"]').click();
  const win = page.locator('.download-button').first();
  await expect(win).toHaveAttribute('href', /bilibili-follower-snapshot\.pages\.dev\/downloads\/netease\/v2\.5\.1\/.*windows-x64\.zip/);

  await page.locator('[data-program="exedra"]').click();
  await page.locator('[data-sub="integrity"]').click();
  await expect(page.getByText('TW ORIGINAL CLIENT')).toBeVisible();
  await expect(page.getByText('JP ORIGINAL CLIENT')).toBeVisible();

  await page.locator('#home-jump').click();
  await expect(page).toHaveURL(/#home\/welcome$/);
  await expect(page.locator('h2', { hasText: 'WELCOME' })).toBeVisible();

  await page.locator('#pixel-toggle').click();
  await expect(page.locator('#pixel-toggle')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#pixel-toggle').click();
  await expect(page.locator('#pixel-toggle')).toHaveAttribute('aria-pressed', 'true');

  await page.locator('[data-program="bilibili"]').click();
  await expect(page.locator('#tracking-sweep')).toBeVisible();
  await expect(page.locator('#signal')).toHaveAttribute('data-tracking', 'true', { timeout: 1000 });

  await page.screenshot({ path: `test-results/${testInfo.project.name}.png`, fullPage: false });
});
