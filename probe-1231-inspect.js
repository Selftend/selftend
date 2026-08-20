// THROWAWAY — wayfinder #1231. Dumps the picker's real DOM so the measure script's
// day-cell selector is derived, not guessed.
const { chromium } = require("playwright");

const URL = process.env.PROBE_URL || "http://localhost:8123/probe-1231";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="probe-root"]', { timeout: 30000 });
  await page.waitForTimeout(1500);

  const dump = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="picker-a-375"]');
    if (!root) return { missing: true, testids: [...document.querySelectorAll("[data-testid]")].map((n) => n.getAttribute("data-testid")).slice(0, 60) };
    const lines = [];
    const walk = (node, depth) => {
      if (depth > 9) return;
      const r = node.getBoundingClientRect();
      const text = [...node.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent.trim()).join("");
      lines.push(
        `${"  ".repeat(depth)}<${node.tagName.toLowerCase()} tid=${node.getAttribute("data-testid") || "-"} cls="${(node.className.baseVal ?? node.className ?? "").toString().slice(0, 70)}" ${Math.round(r.width)}x${Math.round(r.height)} ${text ? `text="${text.slice(0, 14)}"` : ""}`,
      );
      for (const child of node.children) walk(child, depth + 1);
    };
    walk(root, 0);
    return { lines: lines.slice(0, 220) };
  });

  console.log(JSON.stringify({ errors: errors.slice(0, 10), dump }, null, 1));
  await browser.close();
})();
