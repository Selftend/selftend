import { defineConfig, devices } from "@playwright/test";

// E2E tests run against the Expo web dev server pointed at local Supabase.
// They live in test/e2e/ and are kept separate from unit and integration suites.
//
// Default to :8081 - the same port as `site_url` and the only web origin in
// supabase/config.toml's additional_redirect_urls. The password-reset flow needs
// its redirect_to (…/auth-callback?type=recovery) to be allowlisted, so the e2e
// server must run on an allowlisted origin. (Override with E2E_PORT to run e2e
// alongside a local dev web server already occupying :8081.)
const PORT = Number(process.env.E2E_PORT ?? 8081);

// Deterministic Supabase CLI defaults - same on every dev machine and in CI,
// matches the keys used by integration tests (test/integration/helpers.ts).
const LOCAL_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

export default defineConfig({
  testDir: "./test/e2e",
  testMatch: /.*\.e2e\.test\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: `npm exec expo -- start --web --port ${PORT}`,
    env: {
      EXPO_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: LOCAL_ANON_KEY,
      EXPO_PUBLIC_PUBLIC_APP_URL: `http://localhost:${PORT}`,
    },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: process.env.E2E_REUSE_EXISTING_SERVER === "1",
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
