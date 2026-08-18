/* Desktop (1920x1080) capture plumbing for the #612 re-shoot on live 0.14.x.
 * Modeled on Drive scripts/capture-lib.js minus the phone-2x shim. */
const { chromium } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const DRIVE = "C:/Users/vasil/My Drive/Adobe Premiere Projects/Selftend";
const AUTH = path.join(DRIVE, "scripts", "auth-state-desktop.json");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function refreshAuth() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: "en-US",
  });
  const page = await context.newPage();
  await page.goto("https://selftend.org/sign-in", { timeout: 60000 });
  const email = page.locator('input[type="email"]');
  await email.waitFor({ state: "visible", timeout: 30000 });
  try {
    await page.locator('button:has-text("Accept all")').click({ timeout: 3000 });
  } catch {}
  await email.fill("demo@selftend.org");
  await page.locator('input[type="password"]').fill("Meadow-Lantern-42-demo");
  await page.locator('button:has-text("Continue")').last().click();
  await page.waitForURL("https://selftend.org/", { timeout: 30000 });
  await page.waitForTimeout(3000);
  await context.storageState({ path: AUTH });
  await browser.close();
  console.log("auth refreshed (desktop)");
}

async function launch({ outDir, record = true, noShift = false }) {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ...(record ? { recordVideo: { dir: outDir, size: { width: 1920, height: 1080 } } } : {}),
    colorScheme: "light",
    timezoneId: "Europe/Sofia",
    locale: "en-US",
    ...(fs.existsSync(AUTH) ? { storageState: AUTH } : {}),
  });
  if (!noShift) {
    // capture-morning pinned to the shoot's fiction date, so takes that run past
    // real midnight keep showing the same "today"
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
  }
  await context.addInitScript(() => {
    try {
      localStorage.setItem(
        "selftend_cookie_consent",
        JSON.stringify({ analytics: false, accepted: true, acceptedAt: new Date().toISOString() }),
      );
    } catch {}
    const attach = () => {
      if (document.getElementById("__demo_cursor")) return;
      const style = document.createElement("style");
      style.textContent =
        "::-webkit-scrollbar{display:none !important;width:0 !important}" +
        "html,body{scrollbar-width:none !important}" +
        "*{caret-color:#7c4fd0}";
      document.head && document.head.appendChild(style);
      const c = document.createElement("div");
      c.id = "__demo_cursor";
      Object.assign(c.style, {
        position: "fixed",
        left: "960px",
        top: "540px",
        width: "30px",
        height: "30px",
        marginLeft: "-15px",
        marginTop: "-15px",
        borderRadius: "50%",
        background: "rgba(124, 79, 208, 0.30)",
        border: "2px solid rgba(255,255,255,0.85)",
        boxShadow: "0 1px 6px rgba(40,20,80,0.35)",
        pointerEvents: "none",
        zIndex: "2147483647",
        opacity: "0",
        transition: "opacity 220ms",
      });
      document.body.appendChild(c);
      window.addEventListener(
        "mousemove",
        (e) => {
          window.__cursorPos = { x: e.clientX, y: e.clientY };
          c.style.opacity = "1";
          c.style.left = e.clientX + "px";
          c.style.top = e.clientY + "px";
        },
        true,
      );
      window.addEventListener(
        "mousedown",
        () => {
          c.animate(
            [
              { transform: "scale(1)", background: "rgba(124,79,208,0.30)" },
              { transform: "scale(0.65)", background: "rgba(124,79,208,0.55)" },
              { transform: "scale(1)", background: "rgba(124,79,208,0.30)" },
            ],
            { duration: 280, easing: "ease-out" },
          );
        },
        true,
      );
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", attach);
    } else {
      attach();
    }
  });
  const page = await context.newPage();
  return { browser, context, page };
}

async function cursorTo(page, x, y, ms = 420) {
  const steps = Math.max(8, Math.round(ms / 16));
  const pos = await page.evaluate(() => window.__cursorPos || null).catch(() => null);
  const from = pos || { x: 960, y: 540 };
  for (let i = 1; i <= steps; i++) {
    const k = i / steps;
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    await page.mouse.move(from.x + (x - from.x) * e, from.y + (y - from.y) * e);
    await sleep(ms / steps);
  }
}

async function clickAt(page, locator, ms = 420) {
  await locator.waitFor({ state: "visible", timeout: 15000 });
  const box = await locator.boundingBox();
  if (!box) throw new Error("no box for locator");
  await cursorTo(page, box.x + box.width / 2, box.y + box.height / 2, ms);
  await sleep(120);
  await page.mouse.down();
  await sleep(90);
  await page.mouse.up();
}

async function smoothScroll(page, dy, ms = 1200) {
  const steps = Math.round(ms / 40);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, dy / steps);
    await sleep(40);
  }
}

async function typeInto(page, locator, text, delay = 45) {
  await clickAt(page, locator);
  await sleep(250);
  await page.keyboard.type(text, { delay });
}

module.exports = { refreshAuth, launch, cursorTo, clickAt, smoothScroll, typeInto, sleep, AUTH };
