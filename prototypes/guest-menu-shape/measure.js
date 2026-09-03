const { chromium } = require("C:/Users/vasil/Projects/selftend/node_modules/playwright-core");

const FILE = "file:///C:/Users/vasil/.claude/jobs/f86615e1/tmp/bench-wrapped.html";

async function readRack(page) {
  return page.evaluate(() => {
    const out = [];
    document.querySelectorAll(".col").forEach((col) => {
      if (col.dataset.theme !== "light") return;
      const dl = col.querySelector(".readout dl");
      const chip = col.querySelector(".readout .chip");
      const vals = {};
      const kids = [...dl.children];
      for (let i = 0; i < kids.length; i += 2) {
        vals[kids[i].textContent] = kids[i + 1].textContent;
      }
      out.push({ col: col.dataset.col, verdict: chip.textContent, ...vals });
    });
    return out;
  });
}

async function setSeg(page, id, attr, value) {
  await page.click(`#${id} button[data-${attr}="${value}"]`);
  await page.waitForTimeout(250);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await page.goto(FILE);
  await page.waitForTimeout(1200);

  const scenarios = [
    { loc: "en", vh: "667", named: "0" },
    { loc: "bg", vh: "667", named: "0" },
    { loc: "bg", vh: "932", named: "0" },
    { loc: "bg", vh: "568", named: "0" },
    { loc: "bg", vh: "667", named: "1" },
  ];

  for (const s of scenarios) {
    await setSeg(page, "loc", "loc", s.loc);
    await setSeg(page, "vh", "vh", s.vh);
    await setSeg(page, "named", "named", s.named);
    const rows = await readRack(page);
    console.log("\n### loc=" + s.loc + " vh=" + s.vh + " named=" + s.named);
    for (const r of rows) {
      console.log(
        "  " +
          r.col +
          " | " +
          r.verdict +
          " | h=" +
          r["Menu height"] +
          " | over=" +
          r["Over the cap"] +
          " | door=" +
          r["Sign in door"] +
          " | actions=" +
          r["Action row"] +
          " | min btn=" +
          r["Narrowest button"],
      );
    }
  }

  await browser.close();
})().catch((e) => {
  console.error("FAILED", e.message);
  process.exit(1);
});
