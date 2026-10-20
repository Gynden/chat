import { defineConfig } from "@playwright/test";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      args: ["--no-sandbox", "--proxy-server=direct://", "--proxy-bypass-list=*"],
    },
  },
  webServer: {
    command: "npm start -- --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    env: { GAME_DATA_DIR: mkdtempSync(join(tmpdir(), "ruptura-e2e-")) },
  },
});
