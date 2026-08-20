// THROWAWAY — wayfinder #1205. Answers the ticket's one empirical question:
// is the calendar grid keyboard-reachable and announced at all on web?
// Reads the rendered DOM + drives real Tab/arrow keys against the static export.
const { chromium } = require("playwright");
const URL = process.env.PROBE_URL || "http://localhost:8123/probe-1231";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="probe-root"]', { timeout: 30000 });
  await page.waitForTimeout(1200);

  // 1. Static semantics of the grid, header and weekday row.
  const semantics = await page.evaluate(() => {
    const scope = document.querySelector('[data-testid="picker-c-en-390"]');
    if (!scope) return { missing: true };
    const describe = (el) => {
      if (!el) return null;
      const attrs = {};
      for (const a of el.attributes) attrs[a.name] = a.value;
      return {
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || "").trim().slice(0, 20),
        tabIndex: el.tabIndex,
        role: el.getAttribute("role"),
        ariaLabel: el.getAttribute("aria-label"),
        ariaSelected: el.getAttribute("aria-selected"),
        ariaDisabled: el.getAttribute("aria-disabled"),
        disabled: el.hasAttribute("disabled"),
        attrs: Object.keys(attrs),
      };
    };
    const days = scope.querySelector('[data-testid="days"]');
    const dayButtons = [...days.querySelectorAll("button")];
    const weekdays = scope.querySelector('[data-testid="weekdays"]');
    return {
      calendarRoot: describe(scope.querySelector('[data-testid="calendar"]')),
      daySelector: describe(scope.querySelector('[data-testid="day-selector"]')),
      daysContainer: describe(days),
      weekdaysContainer: describe(weekdays),
      weekdayFirst: describe(weekdays ? weekdays.children[0] : null),
      dayButtonCount: dayButtons.length,
      firstDay: describe(dayButtons[0]),
      selectedDay: describe(dayButtons.find((b) => b.getAttribute("aria-selected") === "true")),
      // A disabled (past) day, per ruling 3.
      someDays: dayButtons.slice(0, 4).map(describe),
      lastDay: describe(dayButtons[dayButtons.length - 1]),
      monthBtn: describe(scope.querySelector('[data-testid="btn-month"]')),
      prevBtn: describe(scope.querySelector('[data-testid="btn-prev"]')),
      anyGridRole: !!scope.querySelector('[role="grid"],[role="row"],[role="gridcell"],table'),
    };
  });

  // 2. Real Tab traversal: how many stops does the calendar consume?
  const tabWalk = await page.evaluate(() => {
    const scope = document.querySelector('[data-testid="picker-c-en-390"]');
    const focusables = [...scope.querySelectorAll("*")].filter((el) => {
      if (el.tabIndex < 0) return false;
      const tag = el.tagName.toLowerCase();
      return tag === "button" || tag === "input" || tag === "a" || el.hasAttribute("tabindex");
    });
    return {
      focusableCount: focusables.length,
      breakdown: focusables.slice(0, 12).map((el) => ({
        tag: el.tagName.toLowerCase(),
        tid: el.getAttribute("data-testid"),
        text: (el.textContent || "").trim().slice(0, 12),
        tabIndex: el.tabIndex,
      })),
    };
  });

  // 3. Drive the real keyboard: focus the first day, then press arrows.
  const arrowTest = await page.evaluate(() => {
    const days = document.querySelector('[data-testid="picker-c-en-390"] [data-testid="days"]');
    const btns = [...days.querySelectorAll("button")];
    const target = btns[10];
    target.focus();
    return { focusedText: (document.activeElement.textContent || "").trim(), isDayButton: document.activeElement === target };
  });
  const arrowResults = [];
  for (const key of ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "PageDown"]) {
    await page.keyboard.press(key);
    const after = await page.evaluate(() => ({
      text: (document.activeElement.textContent || "").trim().slice(0, 12),
      tag: document.activeElement.tagName.toLowerCase(),
    }));
    arrowResults.push({ key, after });
  }

  // 4. Does Enter/Space on a focused day actually select it?
  const activate = await page.evaluate(() => {
    const days = document.querySelector('[data-testid="picker-c-en-390"] [data-testid="days"]');
    const btns = [...days.querySelectorAll("button")];
    const before = btns.filter((b) => b.getAttribute("aria-selected") === "true").map((b) => b.textContent.trim());
    const t = btns[20];
    t.focus();
    return { before, targetText: t.textContent.trim() };
  });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  const afterEnter = await page.evaluate(() => {
    const days = document.querySelector('[data-testid="picker-c-en-390"] [data-testid="days"]');
    const btns = [...days.querySelectorAll("button")];
    return {
      selectedNow: btns.filter((b) => b.getAttribute("aria-selected") === "true").map((b) => b.textContent.trim()),
      activeText: (document.activeElement.textContent || "").trim().slice(0, 12),
    };
  });

  console.log(JSON.stringify({ semantics, tabWalk, arrowTest, arrowResults, activate, afterEnter }, null, 1));
  await browser.close();
})();
