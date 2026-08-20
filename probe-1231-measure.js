// THROWAWAY — wayfinder #1231. Measures the picker sheet and the inline time control
// at real phone viewports, from rendered DOM. Run against the static export.
const { chromium } = require("playwright");

const URL = process.env.PROBE_URL || "http://localhost:8123/probe-1231";
const SHEET_VIEWPORTS = [
  [320, 568],
  [360, 640],
  [375, 667],
  [390, 844],
  [430, 932],
];
const ROW_VIEWPORTS = [
  [320, 568],
  [360, 640],
  [375, 667],
  [390, 844],
  [639, 900],
  [640, 900],
  [641, 900],
  [768, 900],
];

const M = (fn) => fn; // marker for readability

async function measurePage(page) {
  return page.evaluate(() => {
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), right: +r.right.toFixed(1), bottom: +r.bottom.toFixed(1) };
    };
    const byId = (id) => document.querySelector(`[data-testid="${id}"]`);

    // A day cell is a leaf whose text is a 1-2 digit number, inside the picker.
    const dayGrid = (pickerId) => {
      const root = byId(pickerId);
      if (!root) return null;
      const leaves = [...root.querySelectorAll("*")].filter(
        (n) => n.children.length === 0 && /^\d{1,2}$/.test((n.textContent || "").trim()),
      );
      if (!leaves.length) return { empty: true };
      // Group by row (rounded top of the tappable ancestor).
      const cells = leaves.map((leaf) => {
        // Walk up to the ancestor that is roughly gridWidth/7 wide — the tap target.
        let node = leaf;
        let best = leaf;
        for (let i = 0; i < 5 && node.parentElement && node.parentElement !== root; i += 1) {
          node = node.parentElement;
          const r = node.getBoundingClientRect();
          const rootW = root.getBoundingClientRect().width;
          if (r.width <= rootW / 6.2 && r.width >= rootW / 9) best = node;
        }
        const r = best.getBoundingClientRect();
        return { text: leaf.textContent.trim(), w: +r.width.toFixed(1), h: +r.height.toFixed(1), top: Math.round(r.top), left: +r.left.toFixed(1), right: +r.right.toFixed(1) };
      });
      const rows = {};
      for (const c of cells) {
        rows[c.top] = rows[c.top] || [];
        rows[c.top].push(c);
      }
      const rowSizes = Object.values(rows).map((r) => r.length);
      const widths = cells.map((c) => c.w);
      const heights = cells.map((c) => c.h);
      return {
        cellCount: cells.length,
        rowCount: Object.keys(rows).length,
        maxCellsPerRow: Math.max(...rowSizes),
        rowSizes,
        cellW: { min: Math.min(...widths), max: Math.max(...widths) },
        cellH: { min: Math.min(...heights), max: Math.max(...heights) },
        gridLeft: Math.min(...cells.map((c) => c.left)),
        gridRight: Math.max(...cells.map((c) => c.right)),
      };
    };

    // Any descendant painting outside its container's content box.
    const overflow = (containerId, pad = 12) => {
      const root = byId(containerId);
      if (!root) return null;
      const rr = root.getBoundingClientRect();
      const leftBound = rr.left + pad;
      const rightBound = rr.right - pad;
      let worst = 0;
      let worstText = "";
      for (const n of root.querySelectorAll("*")) {
        const r = n.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const over = Math.max(r.right - rightBound, leftBound - r.left);
        if (over > worst) {
          worst = over;
          worstText = (n.textContent || "").trim().slice(0, 24) || n.tagName;
        }
      }
      return { worstOverflowPx: +worst.toFixed(1), worstNode: worstText };
    };

    // Clipped text: a node whose content is wider than its box.
    const clipped = (containerId) => {
      const root = byId(containerId);
      if (!root) return null;
      const out = [];
      for (const n of root.querySelectorAll("*")) {
        if (n.children.length) continue;
        const t = (n.textContent || "").trim();
        if (!t) continue;
        if (n.scrollWidth > n.clientWidth + 1 && n.clientWidth > 0) {
          out.push({ text: t.slice(0, 30), clientW: n.clientWidth, scrollW: n.scrollWidth });
        }
      }
      return out.slice(0, 8);
    };

    const headerText = (pickerId) => {
      const root = byId(pickerId);
      if (!root) return null;
      // The month/year selectors are the first text leaves that are NOT plain day numbers.
      const leaves = [...root.querySelectorAll("*")].filter((n) => n.children.length === 0);
      const texts = leaves
        .map((n) => ({ t: (n.textContent || "").trim(), w: +n.getBoundingClientRect().width.toFixed(1) }))
        .filter((o) => o.t && !/^\d{1,2}$/.test(o.t));
      return texts.slice(0, 12);
    };

    const out = {
      viewport: { w: window.innerWidth, h: window.innerHeight },
      documentScrollWidth: document.documentElement.scrollWidth,
      cards: {},
      rows: {},
    };

    const w = window.innerWidth;
    for (const [key, cardId, pickerId] of [
      ["A", `card-a-${w}`, `picker-a-${w}`],
      ["B-en", `card-b-en-${w}`, `picker-b-en-${w}`],
      ["B-bg", `card-b-bg-${w}`, `picker-b-bg-${w}`],
      ["C-en", `card-c-en-${w}`, `picker-c-en-${w}`],
      ["C-bg", `card-c-bg-${w}`, `picker-c-bg-${w}`],
    ]) {
      const card = byId(cardId);
      if (!card) continue;
      const cardR = rect(card);
      const entry = {
        card: cardR,
        contentWidth: +(cardR.w - 24).toFixed(1),
        availableModalHeight: window.innerHeight - 48,
        fitsVertically: cardR.h <= window.innerHeight - 48,
        picker: rect(byId(pickerId)),
        grid: dayGrid(pickerId),
        header: headerText(pickerId),
        overflow: overflow(cardId),
        clipped: clipped(cardId),
      };
      const suffix = cardId.replace(/^card-/, "");
      const footer = byId(`footer-${suffix}`);
      if (footer) {
        entry.footer = rect(footer);
        entry.footerClear = rect(byId(`footer-${suffix}-clear`));
        entry.footerDone = rect(byId(`footer-${suffix}-done`));
      }
      const timeInput = byId(`timeinput-${suffix}`);
      if (timeInput) {
        entry.timeRow = rect(byId(`timerow-${suffix}`));
        entry.timeControl = rect(timeInput);
        entry.meridiem = rect(byId(`timeinput-${suffix}-meridiem`));
      }
      out.cards[key] = entry;
    }

    for (const id of ["d-bg-12", "d-bg-24", "d-en-12"]) {
      const row = byId(id);
      if (!row) continue;
      const line = byId(`${id}-line`);
      const body = byId(`${id}-body`);
      const label = byId(`${id}-label`);
      const time = byId(`${id}-time`);
      const sw = byId(`${id}-switch`);
      const cardR = rect(byId("d-card"));
      out.rows[id] = {
        row: rect(row),
        line: rect(line),
        body: rect(body),
        label: rect(label),
        labelClipped: label ? label.scrollWidth > label.clientWidth + 1 : null,
        labelScrollW: label ? label.scrollWidth : null,
        time: rect(time),
        timeHh: rect(byId(`${id}-time-hh`)),
        timeMeridiem: rect(byId(`${id}-time-meridiem`)),
        switch: rect(sw),
        cardContentRight: cardR ? +(cardR.right - 16).toFixed(1) : null,
        stacked: body && line ? rect(body).h > 40 : null,
        overflow: overflow("d-card", 16),
      };
    }

    return out;
  });
}

(async () => {
  const browser = await chromium.launch();
  const results = [];
  const errors = [];
  const seen = new Set();
  const viewports = [...SHEET_VIEWPORTS, ...ROW_VIEWPORTS].filter(([w, h]) => {
    const k = `${w}x${h}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  for (const [w, h] of viewports) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    page.on("pageerror", (e) => errors.push(`${w}: ${e}`));
    await page.goto(URL, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="probe-root"]', { timeout: 30000 });
    await page.waitForTimeout(900);
    const data = await measurePage(page);
    results.push(data);
    await page.close();
  }
  console.log(JSON.stringify({ errors: errors.slice(0, 6), results }, null, 1));
  await browser.close();
})();
