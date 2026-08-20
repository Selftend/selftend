// THROWAWAY — wayfinder #1144: does a bottom toast survive an open keyboard?
// Chromium has no soft keyboard, so this simulates the resize an Android soft
// keyboard causes: shrink the visual viewport by ~300dp and re-shoot. The point
// is not pixel fidelity, it is whether the toast's anchor is the WINDOW bottom
// (goes under the keyboard) or the layout bottom (rides above it).
const path = require("node:path");
const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");

const BASE = "http://localhost:8092";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const STORAGE_KEY = "sb-localhost-auth-token";
const OUT = path.join(process.cwd(), "docs", "prototypes", "1144");

async function main() {
  const mem = new Map();
  const client = createClient("http://localhost:54321", ANON, {
    auth: {
      storage: {
        getItem: (k) => mem.get(k) ?? null,
        setItem: (k, v) => mem.set(k, v),
        removeItem: (k) => mem.delete(k),
      },
      storageKey: STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const { error } = await client.auth.signInWithPassword({
    email: "e2e-w0@test.local",
    password: "e2e-worker-pass-123",
  });
  if (error) throw new Error(error.message);
  const session = mem.get(STORAGE_KEY);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: "light",
    baseURL: BASE,
  });
  await ctx.addInitScript(
    ({ key, session }) => {
      localStorage.setItem(key, session);
      localStorage.setItem(
        "selftend_cookie_consent",
        JSON.stringify({
          analytics: false,
          accepted: true,
          acceptedAt: "2026-01-01T00:00:00.000Z",
        }),
      );
      localStorage.setItem("selftend:theme", "light");
    },
    { key: STORAGE_KEY, session },
  );
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(180000);

  await page.goto("/modules/cbt/goals/new?toastEdge=bottom");
  await page.waitForTimeout(3500);
  // Step through to a step with a text field.
  await page
    .getByRole("button", { name: "Work", exact: true })
    .click()
    .catch(() => {});
  await page
    .getByRole("button", { name: "Do more of", exact: true })
    .click()
    .catch(() => {});
  await page
    .getByRole("button", { name: "Continue", exact: true })
    .click()
    .catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, "light-kbd-step2-baseline.png") });

  const box = await page.evaluate(() => ({
    inner: window.innerHeight,
    visual: window.visualViewport ? window.visualViewport.height : null,
  }));
  console.log("viewport before", JSON.stringify(box));

  // Focus the first text input, then shrink the viewport the way a soft keyboard does.
  const field = page.locator("input[type=text], textarea").first();
  await field.click().catch(() => {});
  await page.waitForTimeout(400);
  await page.setViewportSize({ width: 390, height: 844 - 300 });
  await page.waitForTimeout(800);

  await page.evaluate(() =>
    window.__protoToast({
      tone: "error",
      title: "Couldn't save your entry",
      description: "Check your connection and try again.",
      durationMs: 60000,
    }),
  );
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, "light-kbd-bottom-error.png") });
  console.log(
    "viewport after",
    JSON.stringify(
      await page.evaluate(() => ({
        inner: window.innerHeight,
        visual: window.visualViewport ? window.visualViewport.height : null,
      })),
    ),
  );

  await ctx.close();
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
