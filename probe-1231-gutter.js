// THROWAWAY — wayfinder #1231. Verifies the ruled fix (breakpoint-aware modal gutter,
// 340px cap kept) by re-laying-out the SAME rendered DOM at each candidate padding and
// re-reading the day tap target. Measured, not calculated.
const { chromium } = require("playwright");
const URL = process.env.PROBE_URL || "http://localhost:8123/probe-1231";

(async () => {
  const browser = await chromium.launch();
  const rows = [];
  for (const [w, h] of [
    [360, 700],
    [375, 700],
    [390, 900],
    [412, 900],
  ]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(URL, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="probe-root"]', { timeout: 30000 });
    await page.waitForTimeout(500);
    for (const pad of [24, 16, 12, 8]) {
      const data = await page.evaluate(
        ({ pad, w }) => {
          const vp = document.querySelector(`[data-testid="card-c-en-${w}-viewport"]`);
          const card = document.querySelector(`[data-testid="card-c-en-${w}"]`);
          if (!vp || !card) return null;
          vp.style.padding = `${pad}px`;
          // force reflow
          void card.getBoundingClientRect();
          const days = document.querySelector(`[data-testid="picker-c-en-${w}"] [data-testid="days"]`);
          const btn = days ? days.querySelector("button") : null;
          const wrap = days ? days.children[0] : null;
          const perRow = {};
          if (days) {
            for (const c of days.children) {
              const k = Math.round(c.getBoundingClientRect().top);
              perRow[k] = (perRow[k] || 0) + 1;
            }
          }
          const cr = card.getBoundingClientRect();
          const br = btn ? btn.getBoundingClientRect() : null;
          const wr = wrap ? wrap.getBoundingClientRect() : null;
          return {
            pad,
            cardW: +cr.width.toFixed(1),
            cappedAt340: cr.width >= 339.5,
            cellW: wr ? +wr.width.toFixed(1) : null,
            tapW: br ? +br.width.toFixed(1) : null,
            tapH: br ? +br.height.toFixed(1) : null,
            maxPerRow: Math.max(...Object.values(perRow)),
          };
        },
        { pad, w },
      );
      if (data) rows.push({ viewport: w, ...data });
    }
    await page.close();
  }
  console.table(rows);
  await browser.close();
})();
