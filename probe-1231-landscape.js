// THROWAWAY — wayfinder #1231. Card height is width-invariant, so the vertical
// question is a pure "how much window height does the sheet need" — checked here in
// phone landscape, where the real DateTimeField modal has no scroll container.
const { chromium } = require("playwright");
const URL = process.env.PROBE_URL || "http://localhost:8123/probe-1231";

(async () => {
  const browser = await chromium.launch();
  const rows = [];
  for (const [w, h] of [
    [667, 375],
    [844, 390],
    [568, 320],
    [375, 553],
    [375, 667],
  ]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(URL, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="probe-root"]', { timeout: 30000 });
    await page.waitForTimeout(500);
    const data = await page.evaluate(() => {
      const q = (id) => document.querySelector(`[data-testid="${id}"]`);
      const heightOf = (id) => (q(id) ? +q(id).getBoundingClientRect().height.toFixed(1) : null);
      // Card heights are width-invariant, so read whichever simulated card exists.
      const pick = (prefix) => {
        for (const el of document.querySelectorAll(`[data-testid^="${prefix}"]`)) {
          const h = el.getBoundingClientRect().height;
          if (h > 0) return +h.toFixed(1);
        }
        return null;
      };
      return {
        vw: window.innerWidth,
        vh: window.innerHeight,
        available: window.innerHeight - 48,
        cardA: pick("card-a-"),
        cardB: pick("card-b-en-"),
        cardC: pick("card-c-en-"),
        _unused: heightOf("probe-root"),
      };
    });
    data.datetimeFits = data.cardB <= data.available;
    data.dateOnlyFits = data.cardC <= data.available;
    data.shippedFits = data.cardA <= data.available;
    rows.push(data);
    await page.close();
  }
  console.log(JSON.stringify(rows, null, 1));
  await browser.close();
})();
