import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    { name:"desktop", use:{...devices["Desktop Chrome"], viewport:{width:1440,height:1000}} },
    { name:"mobile", use:{...devices["iPhone 13"], defaultBrowserType:"chromium"} },
  ],
  webServer: { command:"npm run start", url:"http://127.0.0.1:3000", reuseExistingServer: !process.env.CI, timeout:30_000 },
});
