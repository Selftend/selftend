// THROWAWAY — wayfinder #1231. Pins the exact viewport at which the compact 12-hour
// control collides with the Switch, measures the segment tap targets, and captures
// screenshots as evidence.
const { chromium } = require("playwright");
const URL = process.env.PROBE_URL || "http://localhost:8123/probe-1231";

(async () => {
  const browser = await chromium.launch();
  const out = { collision: [], segments: null, dayTargets: null };

  for (const w of [300, 310, 320, 330, 336, 337, 338, 340, 350, 360]) {
    const page = await browser.newPage({ viewport: { width: w, height: 700 } });
    await page.goto(URL, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="probe-root"]', { timeout: 30000 });
    await page.waitForTimeout(500);
    const data = await page.evaluate(() => {
      const q = (id) => document.querySelector(`[data-testid="${id}"]`);
      const r = (el) => (el ? el.getBoundingClientRect() : null);
      const row = "d-en-12";
      const t = r(q(`${row}-time`));
      const s = r(q(`${row}-switch`));
      const b = r(q(`${row}-body`));
      return {
        vw: window.innerWidth,
        timeRight: +t.right.toFixed(1),
        switchLeft: +s.left.toFixed(1),
        overlapPx: +(t.right - s.left).toFixed(1),
        bodyW: +b.width.toFixed(1),
        timeW: +t.width.toFixed(1),
        bodyOverflowPx: +(t.right - b.right).toFixed(1),
      };
    });
    out.collision.push(data);
    await page.close();
  }

  // Segment + input tap targets in the compact control, and day-cell targets at max card width.
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="probe-root"]', { timeout: 30000 });
  await page.waitForTimeout(600);
  out.segments = await page.evaluate(() => {
    const q = (id) => document.querySelector(`[data-testid="${id}"]`);
    const rr = (el) => (el ? { w: +el.getBoundingClientRect().width.toFixed(1), h: +el.getBoundingClientRect().height.toFixed(1) } : null);
    const mer = q("d-en-12-time-meridiem");
    const tabs = mer ? [...mer.querySelectorAll('[role="tab"]')].map(rr) : [];
    const control = q("d-en-12-time");
    const inputs = control ? [...control.querySelectorAll("input")].map(rr) : [];
    return { controlH: rr(control), tabs, inputs };
  });
  out.dayTargets = await page.evaluate(() => {
    const days = document.querySelector('[data-testid="picker-c-en-390"] [data-testid="days"]');
    if (!days) return null;
    const btns = [...days.querySelectorAll("button")].map((b) => b.getBoundingClientRect());
    const wraps = [...days.children].map((c) => c.getBoundingClientRect());
    // Horizontal gap between adjacent tap targets in the first full row.
    const sorted = btns.slice(0, 7).sort((a, b) => a.left - b.left);
    const gaps = [];
    for (let i = 1; i < sorted.length; i += 1) gaps.push(+(sorted[i].left - sorted[i - 1].right).toFixed(1));
    return {
      button: { w: +btns[0].width.toFixed(1), h: +btns[0].height.toFixed(1) },
      wrapper: { w: +wraps[0].width.toFixed(1), h: +wraps[0].height.toFixed(1) },
      horizontalGapsBetweenTargets: gaps,
    };
  });

  await q_screenshot(page, "shot-sheet-390.png", '[data-testid="card-c-en-390"]');
  await page.close();

  const p320 = await browser.newPage({ viewport: { width: 320, height: 700 } });
  await p320.goto(URL, { waitUntil: "networkidle" });
  await p320.waitForSelector('[data-testid="probe-root"]', { timeout: 30000 });
  await p320.waitForTimeout(600);
  await q_screenshot(p320, "shot-row-320.png", '[data-testid="d-card"]');
  await q_screenshot(p320, "shot-sheet-320.png", '[data-testid="card-c-en-320"]');
  await q_screenshot(p320, "shot-datetime-320.png", '[data-testid="card-b-en-320"]');
  await p320.close();

  const p360 = await browser.newPage({ viewport: { width: 360, height: 700 } });
  await p360.goto(URL, { waitUntil: "networkidle" });
  await p360.waitForSelector('[data-testid="probe-root"]', { timeout: 30000 });
  await p360.waitForTimeout(600);
  await q_screenshot(p360, "shot-row-360.png", '[data-testid="d-card"]');
  await p360.close();

  console.log(JSON.stringify(out, null, 1));
  await browser.close();

  async function q_screenshot(pg, file, selector) {
    const el = await pg.$(selector);
    if (el) await el.screenshot({ path: file });
  }
})();
