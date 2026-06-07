import { defineConfig, devices } from "@playwright/test";

// E2E tests run against the Expo web dev server pointed at local Supabase.
// They live in test/e2e/ and are kept separate from unit and integration suites.
//
// Default to :8099 - a dedicated e2e port so the suite never collides with a dev
// server on :8081. Both :8081 and :8099 /auth-callback origins are allowlisted in
// supabase/config.toml's additional_redirect_urls, which the password-reset flow
// needs (its redirect_to …/auth-callback?type=recovery must hit an allowlisted
// origin). Override with E2E_PORT to run on a different port (allowlist it too).
const PORT = Number(process.env.E2E_PORT ?? 8099);

// Deterministic Supabase CLI defaults - same on every dev machine and in CI,
// matches the keys used by integration tests (test/integration/helpers.ts).
const LOCAL_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

export default defineConfig({
  testDir: "./test/e2e",
  testMatch: /.*\.e2e\.test\.ts$/,
  fullyParallel: true,
  // Each parallel worker gets its own dedicated pool user (e2e-w<parallelIndex>),
  // so worker counts must stay <= the pool size (8). See test/e2e/fixtures.ts.
  workers: process.env.CI ? 4 : 6,
  retries: 0,
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
    // Serve a built static export instead of the Metro dev server: workers hit plain
    // files (no per-navigation re-bundle, no recompile races, true concurrency).
    // The script builds the export once (skipped with E2E_SKIP_BUILD=1) then serves
    // it. Timeout is generous because the build runs on the first start.
    command: `node scripts/e2e-web-server.js ${PORT}`,
    env: {
      EXPO_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: LOCAL_ANON_KEY,
      EXPO_PUBLIC_PUBLIC_APP_URL: `http://localhost:${PORT}`,
    },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: process.env.E2E_REUSE_EXISTING_SERVER === "1",
    timeout: 300_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
