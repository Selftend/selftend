// THROWAWAY — wayfinder #1144. Captures the prototype toast at both edges,
// at phone width, over real app screens, light and dark.
//
// Run against `npx expo start --web --port 8092` pointed at LOCAL supabase.
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");

const BASE = process.env.PROTO_BASE ?? "http://localhost:8092";
const SUPABASE_URL = "http://localhost:54321";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const EMAIL = "e2e-w0@test.local";
const PASSWORD = "e2e-worker-pass-123";
const STORAGE_KEY = "sb-localhost-auth-token";
const OUT = path.join(process.cwd(), "docs", "prototypes", "1144");

// iPhone 14 logical viewport — well under RN-web's 768 desktop breakpoint.
const PHONE = { width: 390, height: 844 };

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
  const { error } = await client.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (error) throw new Error(`sign-in failed: ${error.message}`);
  const value = mem.get(STORAGE_KEY);
  if (!value) throw new Error("no session persisted");
  return value;
}

const COOKIE_CONSENT = JSON.stringify({
  analytics: false,
  accepted: true,
  acceptedAt: "2026-01-01T00:00:00.000Z",
});

async function newContext(browser, sessionValue, theme) {
  const context = await browser.newContext({
    viewport: PHONE,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: theme,
    baseURL: BASE,
  });
  await context.addInitScript(
    ({ key, session, consent, themeName }) => {
      window.localStorage.setItem(key, session);
      window.localStorage.setItem("selftend_cookie_consent", consent);
      window.localStorage.setItem("selftend:theme", themeName);
    },
    { key: STORAGE_KEY, session: sessionValue, consent: COOKIE_CONSENT, themeName: theme },
  );
  return context;
}

async function settle(page, ms = 1200) {
  await page.waitForTimeout(ms);
}

async function dismissOverlays(page) {
  // Button tours / onboarding leftovers: press Escape and click any "Got it".
  for (const name of ["Got it", "Skip", "Close"]) {
    const btn = page.getByRole("button", { name, exact: true }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => {});
      await settle(page, 400);
    }
  }
}

async function fireToast(page, tone, title, description) {
  await page.evaluate(
    ({ tone, title, description }) => {
      window.__protoToast({ tone, title, description, durationMs: 60000 });
    },
    { tone, title, description },
  );
  await settle(page, 500);
}

async function shoot(page, name) {
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file });
  console.log("shot", file);
}

async function ensureRoutine(page) {
  // The FAB only renders while a scheduled routine step is open today. Create
  // one through the editor UI (the routine-complete e2e flow).
  await page.goto("/routines");
  await settle(page, 2500);
  await dismissOverlays(page);
  const existing = page.getByRole("button", { name: "Open routine", exact: true }).first();
  if (await existing.isVisible().catch(() => false)) {
    console.log("routine already present");
    return;
  }
  const create = page.getByRole("button", { name: "New routine", exact: true }).first();
  if (!(await create.isVisible().catch(() => false))) {
    console.log("!! could not find 'New routine'");
    return;
  }
  await create.click();
  await page.waitForURL(/\/routines\/new$/, { timeout: 15000 });
  await page.getByRole("textbox", { name: "Routine name", exact: true }).fill("Morning reset");
  await page.getByRole("button", { name: "Add Mood check-in", exact: true }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForURL(/\/routines\/(?!new)[^/]+$/, { timeout: 15000 });
  console.log("routine created");
}

const SCREENS = [
  { key: "home", url: "/" },
  { key: "cbt", url: "/modules/cbt" },
];

async function main() {
  const sessionValue = await captureSession();
  const browser = await chromium.launch();
  // Metro cold-bundles on first navigation; give it room.

  // One-time setup pass (light context) to guarantee the FAB has something to show.
  {
    const ctx = await newContext(browser, sessionValue, "light");
    const page = await ctx.newPage();
    page.setDefaultNavigationTimeout(300000);
    page.setDefaultTimeout(30000);
    await ensureRoutine(page);
    await ctx.close();
  }

  for (const theme of ["light", "dark"]) {
    const ctx = await newContext(browser, sessionValue, theme);
    const page = await ctx.newPage();
    page.setDefaultNavigationTimeout(300000);
    page.setDefaultTimeout(30000);
    page.on("console", (m) => {
      if (m.type() === "error") console.log("  [console.error]", m.text().slice(0, 200));
    });

    for (const screen of SCREENS) {
      for (const edge of ["top", "bottom"]) {
        const url = `${screen.url}${screen.url.includes("?") ? "&" : "?"}toastEdge=${edge}`;
        await page.goto(url);
        await settle(page, 3000);
        await dismissOverlays(page);

        // Baseline (no toast) once per screen/theme, so the occlusion is legible.
        if (edge === "top") {
          await shoot(page, `${theme}-${screen.key}-baseline`);
        }

        await fireToast(page, "success", "Saved", undefined);
        await shoot(page, `${theme}-${screen.key}-${edge}-success`);

        await page.evaluate(() => window.__protoToast({ tone: "error", title: "reset" }));
        await settle(page, 300);
        await fireToast(
          page,
          "error",
          "Couldn't save your entry",
          "Check your connection and try again.",
        );
        await shoot(page, `${theme}-${screen.key}-${edge}-error`);
      }
    }
    await ctx.close();
  }

  await browser.close();
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
