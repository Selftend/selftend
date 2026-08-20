import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire("C:/Users/vasil/Projects/selftend/package.json");
const { chromium } = require("playwright");

const url = pathToFileURL("C:/Users/vasil/.claude/jobs/87469e23/tmp/focus-probe2.html").href;
const browser = await chromium.launch();
const page = await browser.newPage();

for (const variant of ["plain", "pressable", "focusable-false", "no-role"]) {
  await page.goto(url);
  const landed = await page.evaluate((v) => window.probe(v), variant);
  console.log(`scrim=${variant.padEnd(16)} -> focus lands on: ${landed}`);
}

await browser.close();
