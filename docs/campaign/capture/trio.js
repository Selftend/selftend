/* TRIO stills: Home at phone / tablet / desktop viewports, 2x. */
const { chromium } = require("@playwright/test");
const lib = require("./desktop-lib.js");

const OUT = "C:/Users/vasil/My Drive/Adobe Premiere Projects/Selftend/captures/desktop2";
const VIEWS = [
  ["phone", 390, 844],
  ["tablet", 834, 1112],
  ["desktop", 1440, 900],
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const [name, w, hgt] of VIEWS) {
    const context = await browser.newContext({
      viewport: { width: w, height: hgt },
      deviceScaleFactor: 2,
      colorScheme: "light",
      timezoneId: "Europe/Sofia",
      locale: "en-US",
      storageState: lib.AUTH,
    });
    const target = new Date("2026-08-18T09:41:00+03:00");
    const offset = target.getTime() - Date.now();
    await context.addInitScript((off) => {
      const RealDate = Date;
      const shifted = () => RealDate.now() + off;
      Date = class extends RealDate {
        constructor(...args) {
          if (args.length === 0) super(shifted());
          else super(...args);
        }
        static now() {
          return shifted();
        }
      };
      Date.parse = RealDate.parse;
      Date.UTC = RealDate.UTC;
    }, offset);
    await context.addInitScript(() => {
      try {
        localStorage.setItem(
          "selftend_cookie_consent",
          JSON.stringify({
            analytics: false,
            accepted: true,
            acceptedAt: new Date().toISOString(),
          }),
        );
      } catch {}
      const style = document.createElement("style");
      const add = () => {
        style.textContent =
          "::-webkit-scrollbar{display:none !important;width:0 !important}html,body{scrollbar-width:none !important}";
        document.head && document.head.appendChild(style);
      };
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add);
      else add();
    });
    const page = await context.newPage();
    await page.goto("https://selftend.org/", { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(4500);
    await page.screenshot({ path: `${OUT}/TRIO-${name}-v01.png` });
    console.log("saved TRIO-" + name);
    await context.close();
  }
  await browser.close();
})();
