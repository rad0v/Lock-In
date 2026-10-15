import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/ui",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 390, height: 844 },
    timezoneId: "Asia/Kolkata",
    reducedMotion: "reduce",
    launchOptions: { channel: "msedge" },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/preview.mjs",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
  },
});
