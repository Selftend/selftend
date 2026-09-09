// node probe-diff.js <url> <outPrefix>: writes the server-rendered #root innerHTML and the
// post-hydration client #root innerHTML to <outPrefix>-server.html / -client.html so they can
// be diffed to find what the hydration mismatch is.
const fs = require("node:fs");
const { chromium } = require("playwright");
const [url, out] = process.argv.slice(2);

function pretty(html) {
  return html.replace(/></g, ">\n<").replace(/\s+class="[^"]*"/g, (m) => m); // keep classes
}

(async () => {
  const res = await fetch(url);
  const server = await res.text();
  const serverRoot = server.match(/<div id="root">([\s\S]*)<\/div>\s*<script/)?.[1] ?? "(no root)";
  fs.writeFileSync(`${out}-server.html`, pretty(serverRoot));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ locale: "en-GB" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const clientRoot = await page.evaluate(() => document.getElementById("root").innerHTML);
  fs.writeFileSync(`${out}-client.html`, pretty(clientRoot));
  console.log(`server=${serverRoot.length} client=${clientRoot.length} errors=${errors.length}`);
  await browser.close();
})();
