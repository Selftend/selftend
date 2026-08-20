// THROWAWAY — wayfinder #1205, pass 3. Variant C has a no-op onChange (fixed `date`),
// so "Enter did not select" there was a PROBE artifact. Variant B holds real state.
// Also checks whether the library's nav aria-labels localize.
const { chromium } = require("playwright");
const URL = process.env.PROBE_URL || "http://localhost:8123/probe-1231";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="probe-root"]', { timeout: 30000 });
  await page.waitForTimeout(1200);

  const SCOPE = '[data-testid="picker-b-en-390"]';
  const snapshot = (scope) =>
    page.evaluate((SCOPE) => {
      const days = [...document.querySelector(SCOPE).querySelectorAll('[data-testid="days"] button')];
      const painted = days
        .map((b) => ({ t: b.textContent.trim(), bg: getComputedStyle(b.parentElement).backgroundColor }))
        .filter((d) => d.bg !== "rgba(0, 0, 0, 0)" && !d.bg.startsWith("rgba(0, 0, 0, 0)"));
      return { paintedDays: painted };
    }, scope);

  const before = await snapshot(SCOPE);

  // Focus an enabled day that is NOT the currently selected one, then press Enter.
  const target = await page.evaluate((SCOPE) => {
    const days = [...document.querySelector(SCOPE).querySelectorAll('[data-testid="days"] button')];
    const enabled = days.filter((b) => !b.hasAttribute("disabled"));
    const t = enabled[2];
    t.focus();
    return { text: t.textContent.trim(), focused: document.activeElement === t };
  }, SCOPE);

  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  const afterEnter = await snapshot(SCOPE);

  // And via Space, which RNW handles separately from Enter on role=button.
  const target2 = await page.evaluate((SCOPE) => {
    const days = [...document.querySelector(SCOPE).querySelectorAll('[data-testid="days"] button')];
    const enabled = days.filter((b) => !b.hasAttribute("disabled"));
    const t = enabled[5];
    t.focus();
    return { text: t.textContent.trim() };
  }, SCOPE);
  await page.keyboard.press(" ");
  await page.waitForTimeout(400);
  const afterSpace = await snapshot(SCOPE);

  // Do the library's own nav labels localize?
  const bgChrome = await page.evaluate(() => {
    const scope = document.querySelector('[data-testid="picker-b-bg-390"]');
    const pick = (tid) => {
      const el = scope.querySelector(`[data-testid="${tid}"]`);
      return el ? { ariaLabel: el.getAttribute("aria-label"), text: el.textContent.trim() } : null;
    };
    const firstDay = scope.querySelector('[data-testid="days"] button');
    return {
      prev: pick("btn-prev"),
      next: pick("btn-next"),
      month: pick("btn-month"),
      firstDayAriaLabel: firstDay ? firstDay.getAttribute("aria-label") : null,
    };
  });

  console.log(JSON.stringify({ before, target, afterEnter, target2, afterSpace, bgChrome }, null, 1));
  await browser.close();
})();
