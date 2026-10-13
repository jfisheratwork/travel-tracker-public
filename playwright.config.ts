// Playwright Test Configuration Documentation: https://playwright.dev/docs/test-configuration
// Node.js File System Documentation: https://nodejs.org/api/fs.html
// Node.js OS Documentation: https://nodejs.org/api/os.html
// Node.js Path Documentation: https://nodejs.org/api/path.html
import { defineConfig, devices, chromium } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Resolves a guaranteed working Chromium executable path.
 * 1. Uses Playwright's bundled executable if installed on disk.
 * 2. Scans ~/Library/Caches/ms-playwright for any installed chromium_headless_shell revision.
 * 3. Falls back to system Google Chrome (/Applications/Google Chrome.app).
 */
function resolveChromiumLaunchOptions(): Record<string, unknown> {
  try {
    const defaultExec = chromium.executablePath();
    if (defaultExec && fs.existsSync(defaultExec)) {
      return {};
    }
  } catch {
    // Fallback if executablePath throws
  }

  const cacheDir = path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright');
  if (fs.existsSync(cacheDir)) {
    const entries = fs
      .readdirSync(cacheDir)
      .filter((dirEntry) => dirEntry.startsWith('chromium_headless_shell-'))
      .sort()
      .reverse();
    for (const dirName of entries) {
      const candidate = path.join(
        cacheDir,
        dirName,
        'chrome-headless-shell-mac-arm64',
        'chrome-headless-shell',
      );
      if (fs.existsSync(candidate)) {
        return { launchOptions: { executablePath: candidate } };
      }
    }
  }

  const systemChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (fs.existsSync(systemChrome)) {
    return { channel: 'chrome' };
  }

  return {};
}

const resolvedBrowserConfig = resolveChromiumLaunchOptions();

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    ...resolvedBrowserConfig,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...resolvedBrowserConfig,
      },
    },
  ],
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
