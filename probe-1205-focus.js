// THROWAWAY — wayfinder #1205. Drives the REAL modal sheet: where focus lands on open,
// what the tab cycle is, whether Escape closes, and whether focus returns to the opener.
const { chromium } = require("playwright");
const URL = process.env.PROBE_URL || "http://localhost:8123/probe-1205";

const describeActive = () => {
  const el = document.activeElement;
  if (!el) return null;
  return {
    tag: el.tagName.toLowerCase(),
    tid: el.getAttribute("data-testid"),
    role: el.getAttribute("role"),
    ariaLabel: el.getAttribute("aria-label"),
    text: (el.textContent || "").trim().slice(0, 16),
    tabIndex: el.tabIndex,
    inSheet: !!el.closest('[data-testid="sheet-container"]'),
  };
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  const out = {};
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="probe-1205-root"]', { timeout: 30000 });
  await page.waitForTimeout(800);

  await page.addInitScript(() => {});

  // Open the sheet by real click on the trigger, so the opener is a real focused element.
  await page.click('[data-testid="open-trigger"]');
  await page.waitForTimeout(700);

  out.focusOnOpen = await page.evaluate(describeActive);
  out.sheetPresent = await page.evaluate(() => !!document.querySelector('[data-testid="sheet-card"]'));

  // Walk the tab cycle and record every stop until it wraps or we hit a cap.
  out.tabCycle = [];
  for (let i = 0; i < 45; i += 1) {
    await page.keyboard.press("Tab");
    const stop = await page.evaluate(describeActive);
    out.tabCycle.push(stop);
  }

  // Does focus ever escape the sheet?
  out.everLeftSheet = out.tabCycle.some((s) => s && s.inSheet === false);

  // Escape closes?
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  out.afterEscape = {
    sheetPresent: await page.evaluate(() => !!document.querySelector('[data-testid="sheet-card"]')),
    active: await page.evaluate(describeActive),
  };

  // Reopen, then close via the Done button, and check focus return.
  await page.click('[data-testid="open-trigger"]');
  await page.waitForTimeout(600);
  await page.click('[data-testid="sheet-done"]');
  await page.waitForTimeout(600);
  out.afterDone = {
    sheetPresent: await page.evaluate(() => !!document.querySelector('[data-testid="sheet-card"]')),
    active: await page.evaluate(describeActive),
  };

  // Reopen and close via backdrop click.
  await page.click('[data-testid="open-trigger"]');
  await page.waitForTimeout(600);
  await page.mouse.click(20, 20);
  await page.waitForTimeout(600);
  out.afterBackdrop = {
    sheetPresent: await page.evaluate(() => !!document.querySelector('[data-testid="sheet-card"]')),
    active: await page.evaluate(describeActive),
  };

  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
