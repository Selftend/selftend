// PROTOTYPE — throwaway. Crops app/proto-1243-border.tsx into one PNG per style
// block, so the three variants can be LOOKED at without a 4800px page being
// downscaled to mush.
//
// Usage: node proto-1243-crop.mjs <out-dir> <port> <scheme> [style ...]
//
// Same scheme mechanics as proto-1243-capture.mjs — drive prefers-color-scheme
// and ASSERT the `dark` class, because NativeWind owns that classList and a
// hand-set class is stripped at hydration (#1149).

import { chromium } from "playwright";

const OUT = process.argv[2] ?? ".";
const PORT = process.argv[3] ?? "8343";
const SCHEME = process.argv[4] ?? "dark";
const ONLY = process.argv.slice(5);
const URL = `http://localhost:${PORT}/proto-1243-border`;

const ALL = [
  "quiet-lilac",
  "ink-ivory",
  "atlas",
  "deep-field",
  "sage-garden",
  "plum-manuscript",
  "amber-noir",
  "glacier",
];
const STYLES = ONLY.length ? ONLY : ALL;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 4800 },
  deviceScaleFactor: 2,
  colorScheme: SCHEME,
});
await page.addInitScript((s) => {
  globalThis.__PROTO_SCHEME__ = s;
}, SCHEME);

let navigated = false;
for (let attempt = 1; attempt <= 40 && !navigated; attempt++) {
  try {
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 180000 });
    navigated = true;
  } catch {
    await page.waitForTimeout(5000);
  }
}
if (!navigated) throw new Error("dev server never accepted a navigation");

await page.waitForSelector('[data-testid="proto-1243"]', { timeout: 240000 });

const darkActive = await page.evaluate(() => document.documentElement.classList.contains("dark"));
if ((SCHEME === "dark") !== darkActive) {
  throw new Error(`scheme=${SCHEME} but documentElement.dark=${darkActive} — crop would be dishonest`);
}
await page.waitForFunction(() => document.fonts.status === "loaded", null, { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(2000);

const essentialOnly = page.getByText("Essential only", { exact: true });
if (await essentialOnly.count()) {
  await essentialOnly.first().click();
  await page.waitForTimeout(600);
}

for (const style of STYLES) {
  const el = page.locator(`[data-testid="block-${style}"]`);
  await el.screenshot({ path: `${OUT}/1243-${SCHEME}-${style}.png` });
  console.log(`wrote ${OUT}/1243-${SCHEME}-${style}.png`);
}

await browser.close();
