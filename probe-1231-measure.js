// THROWAWAY — wayfinder #1231. Measures the picker sheet and the inline time control
// at real phone viewports, from rendered DOM. Run against the static export on :8123.
//
// Uses the library's OWN testIDs (days / weekdays / btn-month / btn-prev), scoped to each
// probe card, so cell geometry is read rather than inferred.
const { chromium } = require("playwright");

const URL = process.env.PROBE_URL || "http://localhost:8123/probe-1231";

const SHEET_VIEWPORTS = [
  [320, 568],
  [360, 640],
  [375, 667],
  [390, 844],
  [430, 932],
];
const ROW_ONLY_VIEWPORTS = [
  [639, 900],
  [640, 900],
  [768, 900],
];

async function measurePage(page) {
  return page.evaluate(() => {
    const r2 = (n) => +n.toFixed(1);
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: r2(r.width), h: r2(r.height), left: r2(r.left), right: r2(r.right), top: r2(r.top), bottom: r2(r.bottom) };
    };
    const byId = (id) => document.querySelector(`[data-testid="${id}"]`);
    const inScope = (scopeId, id) => document.querySelector(`[data-testid="${scopeId}"] [data-testid="${id}"]`);

    const gridOf = (pickerId) => {
      const days = inScope(pickerId, "days");
      const weekdays = inScope(pickerId, "weekdays");
      if (!days) return null;
      const wrappers = [...days.children].map((c) => rect(c));
      const buttons = [...days.querySelectorAll("button")].map((b) => rect(b));
      const rows = {};
      for (const w of wrappers) {
        const key = Math.round(w.top);
        rows[key] = (rows[key] || 0) + 1;
      }
      const wdCells = weekdays ? [...weekdays.children].map((c) => rect(c)) : [];
      const wdText = weekdays
        ? [...weekdays.querySelectorAll("*")]
            .filter((n) => !n.children.length && n.textContent.trim())
            .map((n) => ({ t: n.textContent.trim(), w: r2(n.getBoundingClientRect().width), clipped: n.scrollWidth > n.clientWidth + 1 }))
        : [];
      return {
        daysBox: rect(days),
        weekdaysBox: rect(weekdays),
        wrapperCount: wrappers.length,
        perRow: Object.values(rows),
        wrapper: wrappers.length ? { w: wrappers[0].w, h: wrappers[0].h } : null,
        tapTarget: buttons.length
          ? {
              count: buttons.length,
              w: Math.min(...buttons.map((b) => b.w)),
              h: Math.min(...buttons.map((b) => b.h)),
              maxW: Math.max(...buttons.map((b) => b.w)),
            }
          : null,
        weekdayCellW: wdCells.length ? wdCells[0].w : null,
        weekdayLabels: wdText,
      };
    };

    const headerOf = (pickerId) => {
      const month = inScope(pickerId, "btn-month");
      const year = inScope(pickerId, "btn-year");
      const prev = inScope(pickerId, "btn-prev");
      const next = inScope(pickerId, "btn-next");
      const textOf = (el) => {
        if (!el) return null;
        const leaf = [...el.querySelectorAll("*")].find((n) => !n.children.length && n.textContent.trim());
        return leaf ? { t: leaf.textContent.trim(), w: r2(leaf.getBoundingClientRect().width), clipped: leaf.scrollWidth > leaf.clientWidth + 1 } : null;
      };
      return { month: rect(month), monthText: textOf(month), year: rect(year), prev: rect(prev), next: rect(next) };
    };

    const overflowOf = (containerId, pad) => {
      const root = byId(containerId);
      if (!root) return null;
      const rr = root.getBoundingClientRect();
      let worst = 0;
      let node = "";
      for (const n of root.querySelectorAll("*")) {
        const r = n.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const over = Math.max(r.right - (rr.right - pad), rr.left + pad - r.left);
        if (over > worst) {
          worst = over;
          node = (n.textContent || "").trim().slice(0, 26) || n.tagName;
        }
      }
      return { px: r2(worst), node };
    };

    const clippedIn = (containerId) => {
      const root = byId(containerId);
      if (!root) return [];
      const out = [];
      for (const n of root.querySelectorAll("*")) {
        if (n.children.length) continue;
        const t = (n.textContent || "").trim();
        if (!t) continue;
        if (n.clientWidth > 0 && n.scrollWidth > n.clientWidth + 1) out.push({ t: t.slice(0, 28), clientW: n.clientWidth, scrollW: n.scrollWidth });
      }
      return out.slice(0, 6);
    };

    const w = window.innerWidth;
    const out = {
      viewport: { w, h: window.innerHeight },
      docScrollWidth: document.documentElement.scrollWidth,
      horizontalPageOverflow: document.documentElement.scrollWidth > w,
      cards: {},
      rows: {},
    };

    for (const [key, suffix] of [
      ["A-shipped", `a-${w}`],
      ["B-datetime-en", `b-en-${w}`],
      ["B-datetime-bg", `b-bg-${w}`],
      ["C-dateonly-en", `c-en-${w}`],
      ["C-dateonly-bg", `c-bg-${w}`],
    ]) {
      const cardId = `card-${suffix}`;
      const card = byId(cardId);
      if (!card) continue;
      const cardR = rect(card);
      const avail = window.innerHeight - 48;
      out.cards[key] = {
        card: { w: cardR.w, h: cardR.h },
        contentWidth: r2(cardR.w - 24),
        maxWidthReached: cardR.w >= 339.5,
        availableModalHeight: avail,
        fitsVertically: cardR.h <= avail,
        verticalSlackPx: r2(avail - cardR.h),
        picker: rect(byId(`picker-${suffix}`)),
        grid: gridOf(`picker-${suffix}`),
        header: headerOf(`picker-${suffix}`),
        footer: rect(byId(`footer-${suffix}`)),
        footerClear: rect(byId(`footer-${suffix}-clear`)),
        footerDone: rect(byId(`footer-${suffix}-done`)),
        timeControl: rect(byId(`timeinput-${suffix}`)),
        meridiem: rect(byId(`timeinput-${suffix}-meridiem`)),
        overflow: overflowOf(cardId, 12),
        clipped: clippedIn(cardId),
      };
    }

    for (const id of ["d-bg-12", "d-bg-24", "d-en-12"]) {
      const row = byId(id);
      if (!row) continue;
      const label = byId(`${id}-label`);
      const time = byId(`${id}-time`);
      const body = byId(`${id}-body`);
      const cardR = rect(byId("d-card"));
      const bodyR = rect(body);
      const labelR = rect(label);
      const timeR = rect(time);
      out.rows[id] = {
        row: rect(row),
        body: bodyR,
        label: labelR,
        labelClipped: label ? label.scrollWidth > label.clientWidth + 1 : null,
        labelNeedsPx: label ? label.scrollWidth : null,
        time: timeR,
        timeH: timeR ? timeR.h : null,
        hh: rect(byId(`${id}-time-hh`)),
        meridiem: rect(byId(`${id}-time-meridiem`)),
        switch: rect(byId(`${id}-switch`)),
        stacked: bodyR && labelR && timeR ? timeR.top > labelR.bottom - 1 : null,
        bodySlackPx: bodyR && timeR ? r2(bodyR.right - timeR.right) : null,
        cardInnerRight: cardR ? r2(cardR.right - 16) : null,
        overflow: overflowOf("d-card", 16),
      };
    }
    return out;
  });
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const results = [];
  for (const [w, h] of [...SHEET_VIEWPORTS, ...ROW_ONLY_VIEWPORTS]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    page.on("pageerror", (e) => errors.push(`${w}: ${e}`));
    await page.goto(URL, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="probe-root"]', { timeout: 30000 });
    await page.waitForTimeout(800);
    results.push(await measurePage(page));
    await page.close();
  }
  console.log(JSON.stringify({ errors: errors.slice(0, 6), results }, null, 1));
  await browser.close();
})();
