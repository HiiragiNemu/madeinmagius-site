import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'browser-compat.spec.mjs',
  timeout: 30000,
  expect: { timeout: 7000 },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 1600, height: 900 },
        deviceScaleFactor: 1,
      },
    },
    {
      name: 'ios-webkit',
      use: {
        ...devices['iPhone 15 Pro'],
        browserName: 'webkit',
      },
    },
    {
      name: 'ios27-webkit-safe',
      use: {
        ...devices['iPhone 15 Pro'],
        browserName: 'webkit',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X) AppleWebKit/620.1.1 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1',
      },
    },
    {
      name: 'android-chromium',
      use: {
        ...devices['Pixel 7'],
        browserName: 'chromium',
      },
    },
  ],
});
