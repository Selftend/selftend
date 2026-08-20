// THROWAWAY — wayfinder #1144, second pass: the toast over a DATA-ENTRY screen,
// where MobileFormScreen's sticky footer puts the Save button at the bottom edge.
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");

const BASE = "http://localhost:8092";
const SUPABASE_URL = "http://localhost:54321";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const STORAGE_KEY = "sb-localhost-auth-token";
const OUT = path.join(process.cwd(), "docs", "prototypes", "1144");
const PHONE = { width: 390, height: 844 };

const FORMS = [
  { key: "goalnew", url: "/modules/cbt/goals/new" },
  { key: "moodnew", url: "/tools/check-in/new" },
];

async function captureSession() {
  const mem = new Map();
  const client = createClient(SUPABASE_URL, ANON, {
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
  return mem.get(STORAGE_KEY);
}

const CONSENT = JSON.stringify({
  analytics: false,
  accepted: true,
  acceptedAt: "2026-01-01T00:00:00.000Z",
});

async function main() {
  const session = await captureSession();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: PHONE,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: "light",
    baseURL: BASE,
  });
  await ctx.addInitScript(
    ({ key, session, consent }) => {
      localStorage.setItem(key, session);
      localStorage.setItem("selftend_cookie_consent", consent);
      localStorage.setItem("selftend:theme", "light");
    },
    { key: STORAGE_KEY, session, consent: CONSENT },
  );
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(180000);
  fs.mkdirSync(OUT, { recursive: true });

  for (const form of FORMS) {
    for (const edge of ["top", "bottom"]) {
      await page.goto(`${form.url}?toastEdge=${edge}`);
      await page.waitForTimeout(3500);
      if (edge === "top") {
        await page.screenshot({ path: path.join(OUT, `light-${form.key}-baseline.png`) });
      }
      await page.evaluate(() =>
        window.__protoToast({
          tone: "error",
          title: "Couldn't save your entry",
          description: "Check your connection and try again.",
          durationMs: 60000,
        }),
      );
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(OUT, `light-${form.key}-${edge}-error.png`) });
      console.log("shot", form.key, edge);
    }
  }

  await ctx.close();
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
