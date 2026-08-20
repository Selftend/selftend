// THROWAWAY — wayfinder #1205. Locate where the picker paints the selected day, then
// use that node to prove whether keyboard Enter actually selects.
const { chromium } = require("playwright");
const URL = process.env.PROBE_URL || "http://localhost:8123/probe-1231";
const SCOPE = '[data-testid="picker-b-en-390"]';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="probe-root"]', { timeout: 30000 });
  await page.waitForTimeout(1200);

  const findPaint = () =>
    page.evaluate((SCOPE) => {
      const days = document.querySelector(SCOPE).querySelector('[data-testid="days"]');
      const hits = [];
      for (const n of days.querySelectorAll("*")) {
        const cs = getComputedStyle(n);
        const bg = cs.backgroundColor;
        const bc = cs.borderColor;
        const transparent = bg === "rgba(0, 0, 0, 0)" || bg === "transparent";
        if (!transparent) {
          hits.push({
            tag: n.tagName.toLowerCase(),
            text: (n.textContent || "").trim().slice(0, 6),
            bg,
            depthFromButton: n.tagName.toLowerCase() === "button" ? 0 : n.querySelector("button") ? -1 : 1,
          });
        } else if (cs.borderWidth !== "0px" && bc && bc !== "rgba(0, 0, 0, 0)") {
          hits.push({ tag: n.tagName.toLowerCase(), text: (n.textContent || "").trim().slice(0, 6), border: `${cs.borderWidth} ${bc}` });
        }
      }
      return hits.slice(0, 12);
    }, SCOPE);

  const before = await findPaint();

  const target = await page.evaluate((SCOPE) => {
    const days = [...document.querySelector(SCOPE).querySelectorAll('[data-testid="days"] button')];
    const enabled = days.filter((b) => !b.hasAttribute("disabled"));
    // pick one that is clearly not the currently selected 15th
    const t = enabled.find((b) => b.textContent.trim() === "8") || enabled[2];
    t.focus();
    return { text: t.textContent.trim(), focused: document.activeElement === t };
  }, SCOPE);

  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);
  const after = await findPaint();

  console.log(JSON.stringify({ before, target, after }, null, 1));
  await browser.close();
})();
