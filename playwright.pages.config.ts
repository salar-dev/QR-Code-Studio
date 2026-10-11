import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PAGES_PORT ?? 4173);

/**
 * Tests the static GitHub Pages build exactly as it will be served:
 * under the /qr-code-studio base path, without a Node server.
 *
 *   npm run test:e2e:pages
 */
export default defineConfig({
  testDir: "tests/e2e-pages",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    // Trailing slash matters: tests navigate with relative paths ("en/").
    baseURL: `http://localhost:${PORT}/qr-code-studio/`,
    acceptDownloads: true,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run build:pages && npm run preview:pages`,
    url: `http://localhost:${PORT}/qr-code-studio/en/`,
    env: { PORT: String(PORT) },
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
  projects: [
    { name: "pages-chromium", testIgnore: /mobile/, use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "pages-mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile/ },
  ],
});
