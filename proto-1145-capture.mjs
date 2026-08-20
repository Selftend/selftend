// PROTOTYPE — throwaway, never merged to main. Captures app/proto-1145-toast.tsx
// for #1145.
//
// Usage: start the web dev server on a port NOTHING ELSE is using
//   npx expo start --web --port 8337
// then
//   node proto-1145-capture.mjs <out-dir>
//
// ☠️ Parallel agent sessions run their own Metro on 8081 and upwards. `expo start`
// refuses non-interactively when its port is taken, and a capture pointed at a
// port you did not start renders SOMEONE ELSE'S worktree. Check the port is free
// first (Get-NetTCPConnection -State Listen) rather than trusting a 200.

import { chromium } from "playwright";

const OUT = process.argv[2] ?? ".";
const PORT = process.argv[3] ?? "8337";
const URL = `http://localhost:${PORT}/proto-1145-toast`;

const browser = await chromium.launch();
// ☠️ RN-web renders ScrollView as a fixed-height scrollable div, so Playwright's
// `fullPage` captures only the viewport slice — the page itself never grows.
// The viewport has to be tall enough to hold everything instead.
const page = await browser.newPage({
  viewport: { width: 820, height: 1800 },
  deviceScaleFactor: 2,
});

page.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE ERROR:", m.text().slice(0, 200));
});

console.log("navigating…");
let navigated = false;
for (let attempt = 1; attempt <= 40 && !navigated; attempt++) {
  try {
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 180000 });
    navigated = true;
  } catch (err) {
    console.log(`attempt ${attempt}: ${String(err).split("\n")[0].slice(0, 90)}`);
    await page.waitForTimeout(5000);
  }
}
if (!navigated) throw new Error("dev server never accepted a navigation");

// The dev server bundles on first request; the testID is the ready signal.
await page.waitForSelector('[data-testid="proto-1145"]', { timeout: 240000 });
await page
  .waitForFunction(() => document.fonts.status === "loaded", null, { timeout: 30000 })
  .catch(() => {});
await page.waitForTimeout(1500);

// The cookie strip is `fixed bottom-0` and covers the last variant — which is
// itself the #1154 collision, but not what this prototype is asking about.
const essentialOnly = page.getByText("Essential only", { exact: true });
if (await essentialOnly.count()) {
  await essentialOnly.first().click();
  await page.waitForTimeout(600);
}

await page.screenshot({ path: `${OUT}/proto-1145-all.png`, fullPage: true });
console.log("wrote proto-1145-all.png");

await browser.close();
