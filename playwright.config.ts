import { defineConfig, devices } from "@playwright/test";

// E2E tests run against the Expo web dev server pointed at local Supabase.
// They live in test/e2e/ and are kept separate from unit and integration suites.
//
// Default to :8099 - a dedicated e2e port so the suite never collides with a dev
// server on :8081. Both :8081 and :8099 /auth-callback origins are allowlisted in
// supabase/config.toml's additional_redirect_urls so the redirect_to the app
// sends stays allowlist-valid; emailed links themselves point at site_url
// (:8081) and the password-reset e2e rewrites their origin to this port.
// Override with E2E_PORT to run on a different port (allowlist it too).
const PORT = Number(process.env.E2E_PORT ?? 8099);

// Deterministic Supabase CLI defaults - same on every dev machine and in CI,
// matches the keys used by integration tests (test/integration/helpers.ts).
const LOCAL_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

// Real-format P-256 VAPID public key generated once for the e2e suite; the private
// half was discarded at generation, so this can never push to anyone. Never a real
// environment's key. Injected via webServer.env (not a `?? fallback` in
// scripts/e2e-web-server.js) so local and CI bake the SAME constant - local e2e
// bundles must not silently absorb the real key from .env. Without it the web
// reminder channel reads `unsupported` and the re-arm suite tests nothing (#966).
export const E2E_WEB_PUSH_VAPID_PUBLIC_KEY =
  "BFB21JovGgXTOEO4dScrQkLFKM64920GMVyPY6gWXFWIKUc03W-ZFMox55qbbww2sm06RARAsHRSVWJBmc2Q0vs";

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
    // The app honors prefers-reduced-motion (src/lib/accessibility.ts), so this
    // runs every modal with animationType="none" and removes the whole class of
    // slide/fade races where a click lands on a still-moving element (#1051:
    // Playwright's two-frame stability check can misfire mid-slide on a loaded
    // CI runner, swallowing the press). Trade-off: the suite no longer
    // exercises the animated variants of these transitions.
    contextOptions: { reducedMotion: "reduce" },
    // retain-on-failure, not on-first-retry: with retries:0 a retry never
    // happens, so the flake family in #172 left no trace evidence. The trace
    // records the prefs network responses, which is exactly what diagnosing a
    // prefs-dependent-UI failure needs; it is only written to disk on failure.
    trace: "retain-on-failure",
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
      // The Android download bar and the native update offer key off this
      // being set (#388); e2e asserts the bar's UA gating, so give the build
      // the real listing URL.
      EXPO_PUBLIC_PLAY_STORE_URL:
        "https://play.google.com/store/apps/details?id=org.vasilyoshev.selftend",
      EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY: E2E_WEB_PUSH_VAPID_PUBLIC_KEY,
      // The support page renders its message form only when a support address
      // is configured (#1728). A `.test.local` address, so CI's bundle carries
      // nothing real; a developer's .env.local can still win the bake, which is
      // why the support spec intercepts every send rather than trusting this.
      EXPO_PUBLIC_SUPPORT_EMAIL: "support-e2e@test.local",
    },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: process.env.E2E_REUSE_EXISTING_SERVER === "1",
    timeout: 300_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
