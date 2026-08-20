// THROWAWAY — wayfinder #1205, pass 2. Pass 1 focused a DISABLED day (past dates carry
// the `disabled` attribute), so .focus() was a no-op and the arrow test proved nothing.
// This focuses a genuinely enabled day, then drives real keys.
const { chromium } = require("playwright");
const URL = process.env.PROBE_URL || "http://localhost:8123/probe-1231";
const SCOPE = '[data-testid="picker-c-en-390"]';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="probe-root"]', { timeout: 30000 });
  await page.waitForTimeout(1200);

  const out = {};

  // How many tab stops does one calendar consume?
  out.tabStops = await page.evaluate((SCOPE) => {
    const scope = document.querySelector(SCOPE);
    const all = [...scope.querySelectorAll("button")];
    const enabled = all.filter((b) => !b.hasAttribute("disabled") && b.tabIndex >= 0);
    const days = [...scope.querySelectorAll('[data-testid="days"] button')];
    return {
      buttonsTotal: all.length,
      tabbableTotal: enabled.length,
      dayButtonsTotal: days.length,
      dayButtonsTabbable: days.filter((b) => !b.hasAttribute("disabled") && b.tabIndex >= 0).length,
      dayButtonsDisabled: days.filter((b) => b.hasAttribute("disabled")).length,
      chromeButtons: all
        .filter((b) => !days.includes(b))
        .map((b) => ({ tid: b.getAttribute("data-testid"), text: b.textContent.trim().slice(0, 10), tabIndex: b.tabIndex })),
    };
  }, SCOPE);

  // Focus a genuinely enabled day.
  out.focusEnabled = await page.evaluate((SCOPE) => {
    const days = [...document.querySelector(SCOPE).querySelectorAll('[data-testid="days"] button')];
    const target = days.find((b) => !b.hasAttribute("disabled"));
    if (!target) return { none: true };
    target.focus();
    return {
      targetText: target.textContent.trim(),
      focusLanded: document.activeElement === target,
      activeTag: document.activeElement.tagName.toLowerCase(),
    };
  }, SCOPE);

  // Arrow / Home / PageDown from a focused enabled day.
  out.arrows = [];
  for (const key of ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End", "PageDown"]) {
    await page.keyboard.press(key);
    const after = await page.evaluate(() => ({
      tag: document.activeElement.tagName.toLowerCase(),
      text: (document.activeElement.textContent || "").trim().slice(0, 10),
    }));
    out.arrows.push({ key, movedTo: after });
  }

  // Does Enter actually select? Detect via the themed background the picker paints.
  out.enterSelects = await page.evaluate((SCOPE) => {
    const days = [...document.querySelector(SCOPE).querySelectorAll('[data-testid="days"] button')];
    const enabled = days.filter((b) => !b.hasAttribute("disabled"));
    const target = enabled[3];
    const bgOf = (b) => {
      // The library paints `selected` on the day's wrapper, not the button.
      const wrap = b.parentElement;
      return getComputedStyle(wrap).backgroundColor;
    };
    target.focus();
    return { targetText: target.textContent.trim(), bgBefore: bgOf(target) };
  }, SCOPE);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  out.afterEnter = await page.evaluate((SCOPE) => {
    const days = [...document.querySelector(SCOPE).querySelectorAll('[data-testid="days"] button')];
    const enabled = days.filter((b) => !b.hasAttribute("disabled"));
    const target = enabled[3];
    const wrap = target.parentElement;
    return {
      bgAfter: getComputedStyle(wrap).backgroundColor,
      stillFocused: document.activeElement === target,
      anyAriaSelected: days.some((b) => b.hasAttribute("aria-selected")),
      anyAriaPressed: days.some((b) => b.hasAttribute("aria-pressed")),
      anyAriaCurrent: days.some((b) => b.hasAttribute("aria-current")),
    };
  }, SCOPE);

  // Does the picker expose ANY grid/table semantics?
  out.gridSemantics = await page.evaluate((SCOPE) => {
    const scope = document.querySelector(SCOPE);
    return {
      grid: scope.querySelectorAll('[role="grid"]').length,
      row: scope.querySelectorAll('[role="row"]').length,
      gridcell: scope.querySelectorAll('[role="gridcell"]').length,
      columnheader: scope.querySelectorAll('[role="columnheader"]').length,
      table: scope.querySelectorAll("table").length,
      ariaLive: scope.querySelectorAll("[aria-live]").length,
      headings: scope.querySelectorAll("h1,h2,h3,h4,[role='heading']").length,
    };
  }, SCOPE);

  // What does the month/year/nav chrome announce?
  out.chromeNames = await page.evaluate((SCOPE) => {
    const scope = document.querySelector(SCOPE);
    const pick = (tid) => {
      const el = scope.querySelector(`[data-testid="${tid}"]`);
      if (!el) return null;
      return {
        tag: el.tagName.toLowerCase(),
        ariaLabel: el.getAttribute("aria-label"),
        text: el.textContent.trim().slice(0, 20),
        tabIndex: el.tabIndex,
      };
    };
    return { prev: pick("btn-prev"), next: pick("btn-next"), month: pick("btn-month"), year: pick("btn-year") };
  }, SCOPE);

  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
