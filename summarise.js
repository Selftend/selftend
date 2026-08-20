const d = require("./measure.json");
console.log("errors:", JSON.stringify(d.errors));
for (const r of d.results) {
  const keys = Object.keys(r.cards);
  if (!keys.length) continue;
  console.log(`\n===== viewport ${r.viewport.w}x${r.viewport.h}  pageOverflow=${r.horizontalPageOverflow} =====`);
  for (const k of keys) {
    const c = r.cards[k];
    const g = c.grid;
    console.log(
      `${k.padEnd(15)} card=${c.card.w}x${c.card.h} content=${c.contentWidth} maxWreached=${c.maxWidthReached} ` +
        `fitsV=${c.fitsVertically}(slack ${c.verticalSlackPx}) ` +
        `cellWrap=${g ? `${g.wrapper.w}x${g.wrapper.h}` : "-"} tap=${g && g.tapTarget ? `${g.tapTarget.w}x${g.tapTarget.h}` : "-"} ` +
        `perRow=${g ? JSON.stringify(g.perRow) : "-"} overflow=${c.overflow.px}`,
    );
    if (c.header && c.header.monthText)
      console.log(`   month="${c.header.monthText.t}" w=${c.header.monthText.w} clipped=${c.header.monthText.clipped}`);
    if (c.footer)
      console.log(`   footer=${c.footer.w}x${c.footer.h} clear=${c.footerClear ? c.footerClear.w : "-"} done=${c.footerDone ? c.footerDone.w : "-"}`);
    if (c.timeControl)
      console.log(`   timeControl=${c.timeControl.w}x${c.timeControl.h} meridiem=${c.meridiem ? c.meridiem.w : "none"}`);
    if (c.clipped.length) console.log(`   CLIPPED: ${JSON.stringify(c.clipped)}`);
  }
}
console.log("\n\n########## REMINDERS ROW ##########");
for (const r of d.results) {
  const keys = Object.keys(r.rows);
  if (!keys.length) continue;
  console.log(`\n--- viewport ${r.viewport.w} ---`);
  for (const k of keys) {
    const x = r.rows[k];
    console.log(
      `${k.padEnd(9)} stacked=${x.stacked} row=${x.row.w}x${x.row.h} body=${x.body.w} label=${x.label.w}(needs ${x.labelNeedsPx}, clipped=${x.labelClipped}) ` +
        `time=${x.time.w}x${x.time.h} meridiem=${x.meridiem ? x.meridiem.w : "none"} bodySlack=${x.bodySlackPx} switch=${x.switch ? x.switch.w : "-"} overflow=${x.overflow.px}`,
    );
  }
}
