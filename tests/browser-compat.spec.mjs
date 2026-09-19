import { test, expect, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4173';

for (const profile of [
  { name: 'ios-webkit', browserName: 'webkit', device: devices['iPhone 15 Pro'] },
  { name: 'android-chromium', browserName: 'chromium', device: devices['Pixel 7'] },
]) {
  test.describe(profile.name, () => {
    test.use({ browserName: profile.browserName, ...profile.device });

    test('terminal optics, mobile accordion, home jump and public downloads work', async ({ page }) => {
      await page.goto(baseURL, { waitUntil: 'networkidle' });
      await page.waitForSelector('#boot.is-hidden', { timeout: 5000 });

      await expect(page.locator('.screen')).toBeVisible();
      await expect(page.locator('#pixel-toggle')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.boot__wordmark')).toHaveAttribute('src', /magius-link-wordmark\.svg/);

      const engine = await page.locator('html').getAttribute('data-crt-engine');
      expect(['svg', 'webkit-svg', 'ios-safe']).toContain(engine);

      const initialJitter = await page.locator('html').evaluate(el => getComputedStyle(el).getPropertyValue('--jitter-x'));
      await page.waitForTimeout(150);
      const laterJitter = await page.locator('html').evaluate(el => getComputedStyle(el).getPropertyValue('--jitter-x'));
      expect(laterJitter).not.toBe(initialJitter);

      await page.locator('[data-program="bilibili"]').click();
      await expect(page.locator('[data-sub="android"]')).toBeVisible();
      await page.locator('[data-sub="android"]').click();
      const apk = page.locator('.download-button').first();
      await expect(apk).toHaveAttribute('href', /bilibili-follower-snapshot\.pages\.dev\/downloads\/bilibili\/v0\.1\.9\/.*\.apk/);

      const selectedBili = page.locator('[data-sub="android"]');
      const panel = page.locator('#content-panel');
      const mobileInline = await panel.evaluate((node) => node.previousElementSibling?.dataset?.sub === 'android');
      expect(mobileInline).toBeTruthy();

      await page.locator('[data-program="netease"]').click();
      await page.locator('[data-sub="windows"]').click();
      const win = page.locator('.download-button').first();
      await expect(win).toHaveAttribute('href', /bilibili-follower-snapshot\.pages\.dev\/downloads\/netease\/v2\.5\.1\/.*windows-x64\.zip/);

      await page.locator('[data-program="exedra"]').click();
      await page.locator('[data-sub="integrity"]').click();
      await expect(page.locator('text=TW ORIGINAL CLIENT')).toBeVisible();
      await expect(page.locator('text=JP ORIGINAL CLIENT')).toBeVisible();

      await page.locator('#home-jump').click();
      await expect(page).toHaveURL(/#home\/welcome$/);
      await expect(page.locator('h2', { hasText: 'WELCOME' })).toBeVisible();

      await page.locator('#pixel-toggle').click();
      await expect(page.locator('#pixel-toggle')).toHaveAttribute('aria-pressed', 'false');
      await page.locator('#pixel-toggle').click();
      await expect(page.locator('#pixel-toggle')).toHaveAttribute('aria-pressed', 'true');

      await page.screenshot({ path: `test-results/${profile.name}.png`, fullPage: false });
    });
  });
}
