/* Campaign shot runner — map #612, baseline #623.
 * Usage: node shoot.js <shot> [<shot>...]   (shots: home, checkin, journal, breathe, cbt, routine)
 * Every shot: fresh context, morning clock (Date-shift only), human-paced, ≥2s hold at both ends.
 * Output: Drive captures/shared/<SHOT>-v01.webm + <SHOT>-frame.png review frame.
 */
// The capture lib lives with the media in the owner-held Drive folder (see #621's
// source-of-truth split); this runner executes on the owner's machine only. The
// require stays non-literal so import/no-unresolved doesn't chase a machine-local path.

const DRIVE = "C:/Users/vasil/My Drive/Adobe Premiere Projects/Selftend";
const lib = require(`${DRIVE}/scripts/capture-lib.js`);
const path = require("path");
const fs = require("fs");

const OUT = `${DRIVE}/captures/shared`;

async function launchShot() {
  const h = await lib.launch({ outDir: OUT, useAuth: true });
  const target = new Date();
  target.setHours(9, 41, 0, 0); // capture-morning
  const offset = target.getTime() - Date.now();
  await h.context.addInitScript((off) => {
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
  // context already created before init script? addInitScript applies to future pages
  const page = await h.context.newPage();
  await h.page.close(); // discard the pre-initscript page
  return { ...h, page };
}

async function finishShot(h, name, beats) {
  const video = h.page.video();
  await h.page.screenshot({ path: path.join(OUT, `${name}-frame.png`) }).catch(() => {});
  await h.context.close();
  const vpath = await video.path();
  fs.copyFileSync(vpath, path.join(OUT, `${name}-v01.webm`));
  fs.unlinkSync(vpath);
  await h.browser.close();
  console.log("saved", `${name}-v01.webm`);
}

async function browse(h, url, scroll) {
  const { page } = h;
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await lib.sleep(4000);
  await lib.smoothScroll(page, scroll, 2200);
  await lib.sleep(2500);
  await lib.smoothScroll(page, -scroll, 2200);
  await lib.sleep(2500);
}

const SHOTS = {
  // HOME — dashboard hold + gentle scroll (trailer b2, GS-1)
  async home(h) {
    const { page } = h;
    await page.goto("https://selftend.org/", { waitUntil: "networkidle", timeout: 60000 });
    await lib.sleep(3500); // opening hold
    await lib.cursorTo(page, 540, 900, 600);
    await lib.smoothScroll(page, 700, 2200); // drift down the dashboard
    await lib.sleep(2200);
    await lib.smoothScroll(page, -700, 2200); // drift back up
    await lib.sleep(3000); // closing hold on greeting
  },

  // CHECKIN — pick "Good", short note, save (trailer b3, GS-3, MJ-1)
  async checkin(h) {
    const { page } = h;
    await page.goto("https://selftend.org/tools/check-in/new", {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await lib.sleep(3000);
    await lib.clickAt(page, page.locator('[aria-label="Good"]'), 700);
    await lib.sleep(1500);
    const notes = page.locator("textarea").last();
    await lib.typeInto(page, notes, "Quiet morning. Feeling steady.", 55);
    await lib.sleep(1200);
    await lib.clickAt(page, page.getByText("Save", { exact: true }).last(), 700);
    await lib.sleep(3500); // saved state / navigation hold
  },

  // JOURNAL — title + body + save (trailer b5, MJ-2)
  async journal(h) {
    const { page } = h;
    await page.goto("https://selftend.org/tools/journal/new", {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await lib.sleep(3000);
    await lib.typeInto(page, page.locator('[aria-label="Title (optional)"]'), "A quiet win", 60);
    await lib.sleep(600);
    await lib.typeInto(
      page,
      page.locator('[aria-label="Body"]'),
      "Finished the thing I kept postponing. It took twenty minutes — it always takes twenty minutes. Tea and an early night to celebrate.",
      42,
    );
    await lib.sleep(1400);
    await lib.clickAt(page, page.getByText("Save", { exact: true }).last(), 700);
    await lib.sleep(3500);
  },

  // BREATHE — index → Start a session → ~2.5 pacer cycles (trailer b4, BG-1)
  async breathe(h) {
    const { page } = h;
    await page.goto("https://selftend.org/tools/breathing", {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await lib.sleep(3000);
    await lib.clickAt(page, page.locator('[aria-label="Start a session"]'), 700);
    await lib.sleep(3500); // config beat: pattern + cycles visible
    await lib.clickAt(page, page.getByText("Start", { exact: true }).last(), 700);
    await lib.sleep(42000); // pacer runs: ~2.5 cycles of 4-4-4-4
    await lib.sleep(2000);
  },

  // CBT — 8-step thought record, adaptive walker (trailer b6, CB-1..4)
  async cbt(h) {
    const { page } = h;
    const CONTENT = [
      ["situation", "Sent a message with a typo to the whole team chat."],
      ["thought", "Everyone will think I'm careless."],
      ["evidence for", "A couple of people reacted with joke emojis."],
      ["evidence against", "Nobody mentioned it an hour later. Everyone sends typos sometimes."],
      ["balanced", "It was a small slip that most people forgot within minutes."],
      ["outcome", "Feeling lighter about it."],
    ];
    await page.goto("https://selftend.org/modules/cbt/new", {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await lib.sleep(3000);
    await lib.clickAt(page, page.getByText("Got it", { exact: true }).first(), 600).catch(() => {});
    await lib.sleep(1500);
    for (let step = 0; step < 9; step++) {
      const info = await page.evaluate(() => {
        const t = document.body.innerText;
        const m = t.match(/Step (\d) of 8 · ([^\n]+)/);
        return { step: m ? m[1] : "?", title: m ? m[2].trim() : "?", text: t.slice(0, 200) };
      });
      console.log("wizard:", JSON.stringify(info.step + " " + info.title));
      const lower = info.title.toLowerCase();
      const entry = CONTENT.find(
        ([k]) =>
          lower.includes(k.split(" ")[0]) &&
          (k.split(" ").length === 1 || lower.includes(k.split(" ")[1])),
      );
      const ta = page.locator("textarea").first();
      if (entry && (await ta.count()) > 0) {
        const val = await ta.inputValue().catch(() => "x");
        if (val === "") {
          await lib.typeInto(page, ta, entry[1], 40);
          await lib.sleep(900);
        }
      } else {
        await lib.sleep(2500); // non-text step: hold so the viewer sees it
      }
      // rating chips (belief/intensity 0..100): pick 70
      const chip70 = page.getByText("70", { exact: true }).last();
      if ((await chip70.count()) > 0 && (await chip70.isVisible().catch(() => false))) {
        await lib.clickAt(page, chip70, 500);
        await lib.sleep(700);
      }
      // add-pattern steps: commit the item before continuing
      const addBtn = page.getByText(/^Add (thought|emotion|entry)$/).last();
      if ((await addBtn.count()) > 0 && (await addBtn.isVisible().catch(() => false))) {
        await lib.clickAt(page, addBtn, 500);
        await lib.sleep(1000);
      }
      const done = page.getByText(/^(Save record|Save|Finish)$/).last();
      const cont = page.getByText("Continue", { exact: true }).last();
      if ((await cont.count()) > 0 && (await cont.isVisible().catch(() => false))) {
        await lib.clickAt(page, cont, 600);
      } else if ((await done.count()) > 0) {
        await lib.clickAt(page, done, 600);
        await lib.sleep(3500);
        break;
      }
      await lib.sleep(1800);
      const after = await page.evaluate(
        () => (document.body.innerText.match(/Step (\d) of 8/) || [])[1] || "end",
      );
      if (after === info.step) {
        console.log("stalled at step", after, "- forcing Continue");
        await page
          .getByText("Continue", { exact: true })
          .last()
          .click({ force: true })
          .catch(() => {});
        await lib.sleep(1500);
      }
    }
    await lib.sleep(2000);
  },

  // ROUTINE — open Evening wind-down, run both steps, end on 2/2 (trailer b7, RO-2)
  async routine(h) {
    const { page } = h;
    await page.goto("https://selftend.org/routines", { waitUntil: "networkidle", timeout: 60000 });
    await lib.sleep(2800);
    await lib.clickAt(page, page.locator('[aria-label="Open routine"]').first(), 700);
    await lib.sleep(3500); // steps + non-punitive copy hold
    // step 1: breathing — via the continue-routine FAB sheet
    await lib.clickAt(page, page.locator('[aria-label^="Continue"]').first(), 700);
    await lib.sleep(2200);
    await lib.clickAt(page, page.getByText("Do next step", { exact: false }).last(), 700);
    await lib.sleep(3000); // lands on the breathing INDEX
    await lib.clickAt(page, page.locator('[aria-label="Start a session"]'), 700);
    await lib.sleep(3000); // session config
    // shrink to 1 cycle so the session completes naturally (Finish early discards)
    const dec = page.locator('[aria-label="Decrease cycles"]');
    for (let i = 0; i < 7; i++) {
      await dec.click({ timeout: 2500 }).catch(() => {});
      await lib.sleep(220);
    }
    const start = page.getByText("Start", { exact: true }).last();
    if ((await start.count()) > 0 && (await start.isVisible().catch(() => false))) {
      await lib.clickAt(page, start, 600);
    }
    await lib.sleep(21000); // one full 4-4-4-4 cycle completes
    await lib.sleep(3000);
    console.log(
      "after breathing:",
      (await page.evaluate(() => document.body.innerText.slice(0, 300))).replace(/\n+/g, " | "),
    );
    // possible completion dialog: try common affirmatives
    for (const label of ["Log session", "Save", "Done", "Back"]) {
      const b = page.getByText(label, { exact: true }).last();
      if ((await b.count()) > 0 && (await b.isVisible().catch(() => false))) {
        await lib.clickAt(page, b, 500);
        await lib.sleep(2000);
        break;
      }
    }
    // step 2: journal — navigate back to the routine and open the step
    await page.goto("https://selftend.org/routines", { waitUntil: "networkidle", timeout: 60000 });
    await lib.sleep(2500);
    await lib.clickAt(page, page.locator('[aria-label="Open routine"]').first(), 700);
    await lib.sleep(2500);
    await lib.clickAt(page, page.locator('[aria-label^="Continue"]').first(), 700);
    await lib.sleep(2200);
    await lib.clickAt(page, page.getByText("Do next step", { exact: false }).last(), 700);
    await lib.sleep(3000);
    const body = page.locator('[aria-label="Body"]');
    if ((await body.count()) > 0) {
      await lib.typeInto(
        page,
        body,
        "Slow start, clear head. Writing this before the day gets loud.",
        45,
      );
      await lib.sleep(1200);
      await lib.clickAt(page, page.getByText("Save", { exact: true }).last(), 700);
      await lib.sleep(3000);
    }
    // completed state hold
    await page.goto("https://selftend.org/routines", { waitUntil: "networkidle", timeout: 60000 });
    await lib.sleep(2000);
    await lib.clickAt(page, page.locator('[aria-label="Open routine"]').first(), 700);
    await lib.sleep(4500); // 2/2 + filled day hold
  },

  // ---- read-mostly walkthrough shots: navigate, hold, gentle scroll ----
  async tools(h) {
    await browse(h, "https://selftend.org/tools", 900);
  },
  async lookback(h) {
    const { page } = h;
    await page.goto("https://selftend.org/progress", { waitUntil: "networkidle", timeout: 60000 });
    await lib.sleep(4500);
    await lib.smoothScroll(page, 500, 1800);
    await lib.sleep(2500);
    await page.goto("https://selftend.org/tools/journal", {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await lib.sleep(3500);
    await lib.smoothScroll(page, 600, 2000);
    await lib.sleep(2500);
  },
  async cbtindex(h) {
    await browse(h, "https://selftend.org/modules/cbt", 1100);
  },
  async actindex(h) {
    await browse(h, "https://selftend.org/modules/act", 1100);
  },
  async notifdefaults(h) {
    await browse(h, "https://selftend.org/notifications", 800);
  },
  async habithist(h) {
    await browse(h, "https://selftend.org/tools/habits/history", 700);
  },
  async cbthist(h) {
    await browse(h, "https://selftend.org/modules/cbt/history", 700);
  },

  // HABIT-NEW — create "Drink a glass of water" live (HA-1)
  async habitnew(h) {
    const { page } = h;
    await page.goto("https://selftend.org/tools/habits/new", {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await lib.sleep(3200);
    await lib.typeInto(
      page,
      page.locator('input[placeholder^="Read"]'),
      "Drink a glass of water",
      55,
    );
    await lib.sleep(1000);
    await lib.typeInto(
      page,
      page.locator('input[placeholder^="Make the starter"]'),
      "Pour one glass right after waking up",
      45,
    );
    await lib.sleep(1000);
    await lib.smoothScroll(page, 500, 1500);
    await lib.sleep(1500);
    await lib.clickAt(page, page.getByText("Save", { exact: true }).last(), 700);
    await lib.sleep(3500);
  },

  // HABIT-LOG — one-tap tick on the habits index (HA-2)
  async habitlog(h) {
    const { page } = h;
    await page.goto("https://selftend.org/tools/habits", {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await lib.sleep(3500);
    const tick = page.locator('[aria-label*="ick"]').first();
    await lib.clickAt(page, tick, 800);
    await lib.sleep(3500);
  },

  // ROUTINE-NEW — build Evening wind-down live (RO-1)
  async routinenew(h) {
    const { page } = h;
    await page.goto("https://selftend.org/routines/new", {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await lib.sleep(3200);
    await lib.typeInto(page, page.locator('[aria-label="Routine name"]'), "Evening wind-down", 55);
    await lib.sleep(1000);
    await lib.clickAt(page, page.locator('[aria-label="Add Breathing"]'), 700);
    await lib.sleep(1200);
    await lib.clickAt(page, page.locator('[aria-label="Add Journal"]'), 700);
    await lib.sleep(1500);
    await lib.clickAt(page, page.getByText("Save", { exact: true }).last(), 700);
    await lib.sleep(3500);
  },

  // ROUTINE-EDIT — open edit, adjust, save (RO-3)
  async routineedit(h) {
    const { page } = h;
    await page.goto("https://selftend.org/routines", { waitUntil: "networkidle", timeout: 60000 });
    await lib.sleep(2500);
    await lib.clickAt(page, page.locator('[aria-label="Open routine"]').first(), 700);
    await lib.sleep(2500);
    await lib.clickAt(page, page.getByText("Edit", { exact: true }).first(), 700);
    await lib.sleep(3500);
    await lib.smoothScroll(page, 400, 1500);
    await lib.sleep(2000);
    await lib.smoothScroll(page, -400, 1500);
    await lib.clickAt(page, page.getByText("Save", { exact: true }).last(), 700);
    await lib.sleep(3000);
  },

  // GRATITUDE — three prompts + save (MJ-3)
  async gratitude(h) {
    const { page } = h;
    await page.goto("https://selftend.org/tools/gratitude-log/new", {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await lib.sleep(3200);
    await lib.typeInto(
      page,
      page.locator('[aria-label="What made you laugh?"]'),
      "The neighbour's dog chasing leaves",
      48,
    );
    await lib.sleep(700);
    await lib.typeInto(
      page,
      page.locator('[aria-label="Who was kind to you?"]'),
      "The barista remembered my order",
      48,
    );
    await lib.sleep(700);
    await lib.typeInto(
      page,
      page.locator('[aria-label="What simple pleasure did you enjoy?"]'),
      "First coffee on the balcony",
      48,
    );
    await lib.sleep(1400);
    await lib.clickAt(page, page.getByText("Save", { exact: true }).last(), 700);
    await lib.sleep(3500);
  },

  // GROUND — 5-4-3-2-1 guided steps (BG-2)
  async ground(h) {
    const { page } = h;
    await page.goto("https://selftend.org/tools/grounding", {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await lib.sleep(3500);
    await lib.clickAt(page, page.locator('[aria-label="5-4-3-2-1"]'), 700);
    await lib.sleep(4000);
    for (let i = 0; i < 3; i++) {
      const next = page.getByText(/^(Next|Continue|Start)$/).last();
      if ((await next.count()) > 0 && (await next.isVisible().catch(() => false))) {
        await lib.clickAt(page, next, 600);
        await lib.sleep(3500);
      }
    }
    await lib.sleep(2500);
  },

  // MEDITATE — index, stages, start a sit (BG-3)
  async meditate(h) {
    const { page } = h;
    await page.goto("https://selftend.org/tools/meditation", {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await lib.sleep(3500);
    await lib.clickAt(
      page,
      page.getByText("Explore the ten stages", { exact: false }).first(),
      700,
    );
    await lib.sleep(4000);
    await lib.smoothScroll(page, 500, 1800);
    await lib.sleep(2000);
    await page.goto("https://selftend.org/tools/meditation", {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await lib.sleep(2500);
    await lib.clickAt(page, page.getByText("Start", { exact: true }).last(), 700);
    await lib.sleep(14000);
    await lib.sleep(2000);
  },

  // NOTIF-OPTIN — enable one reminder, save (RW-2)
  async notifoptin(h) {
    const { page, context } = h;
    await context
      .grantPermissions(["notifications"], { origin: "https://selftend.org" })
      .catch(() => {});
    await page.goto("https://selftend.org/notifications", {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await lib.sleep(3500);
    await lib.smoothScroll(page, 900, 2000);
    await lib.sleep(2000);
    const toggles = page.locator('[role="switch"]');
    const n = await toggles.count();
    console.log("switch count:", n);
    if (n > 1) {
      await lib.clickAt(page, toggles.nth(1), 700);
      await lib.sleep(2000);
      const save = page.getByText("Save", { exact: true }).first();
      if ((await save.count()) > 0 && (await save.isVisible().catch(() => false))) {
        await lib.clickAt(page, save, 600);
      }
      await lib.sleep(3000);
    }
  },

  // NOTIF-OFF — switch it back off (RW-4)
  async notifoff(h) {
    const { page } = h;
    await page.goto("https://selftend.org/notifications", {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await lib.sleep(3500);
    await lib.smoothScroll(page, 900, 2000);
    await lib.sleep(1500);
    const toggles = page.locator('[role="switch"]');
    if ((await toggles.count()) > 1) {
      await lib.clickAt(page, toggles.nth(1), 700);
      await lib.sleep(2500);
    }
    await lib.sleep(2000);
  },

  // ACT-BULLSEYE — rate four domains, save (AC-1)
  async actbullseye(h) {
    const { page } = h;
    // The check-in folded onto the values screen (#1379); it sits BELOW the four
    // domain rows, so this shot may need to scroll before the tracks are in frame.
    await page.goto("https://selftend.org/modules/act/values", {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await lib.sleep(3500);
    const picks = [
      ["7", 0],
      ["5", 1],
      ["8", 2],
      ["6", 3],
    ];
    for (const [num, row] of picks) {
      await lib.clickAt(page, page.getByText(num, { exact: true }).nth(row), 550);
      await lib.sleep(900);
    }
    await lib.clickAt(page, page.getByText("Save ratings", { exact: true }), 700);
    await lib.sleep(3500);
  },

  // ACT-ANCHOR — ACE read + log (AC-2)
  async actanchor(h) {
    const { page } = h;
    await page.goto("https://selftend.org/modules/act/connection/drop-anchor", {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await lib.sleep(4500);
    await lib.smoothScroll(page, 400, 1800);
    await lib.sleep(2500);
    await lib.clickAt(page, page.getByText("Log this practice", { exact: true }), 700);
    await lib.sleep(3500);
  },

  // ACT-CHOICE — hooks/away/toward + save (AC-3)
  async actchoice(h) {
    const { page } = h;
    await page.goto("https://selftend.org/modules/act/choice-point/new", {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await lib.sleep(3200);
    const fill = async (label, text, addIdx) => {
      await lib.typeInto(page, page.locator('[aria-label="' + label + '"]'), text, 45);
      await lib.sleep(600);
      await lib.clickAt(page, page.locator('[aria-label="Add"]').nth(addIdx), 500);
      await lib.sleep(900);
    };
    await fill("What hooks you?", "Sunday-evening dread about the week ahead", 0);
    await fill("Away moves", "Doomscrolling in bed", 1);
    await fill("Toward moves", "Prep tomorrow's one thing, then read", 2);
    await lib.sleep(800);
    await lib.clickAt(page, page.getByText("Save", { exact: true }).last(), 700);
    await lib.sleep(3500);
  },

  // ACT-COMMIT — 3-step wizard (AC-4)
  async actcommit(h) {
    const { page } = h;
    await page.goto("https://selftend.org/modules/act/committed-action/new", {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await lib.sleep(3200);
    await lib.clickAt(
      page,
      page.getByText("Health & personal growth", { exact: true }).first(),
      700,
    );
    await lib.sleep(1200);
    await lib.clickAt(page, page.getByText("Continue", { exact: true }).last(), 700);
    await lib.sleep(2500);
    for (let i = 0; i < 3; i++) {
      const ta = page.locator("textarea, input[type=text]").first();
      if ((await ta.count()) > 0) {
        const v = await ta.inputValue().catch(() => "x");
        if (v === "") {
          await lib.typeInto(page, ta, "Ten quiet minutes outside before screens", 45);
          await lib.sleep(900);
        }
      }
      const cont = page.getByText("Continue", { exact: true }).last();
      const save = page.getByText(/^(Save|Finish|Create)$/).last();
      if ((await cont.count()) > 0 && (await cont.isVisible().catch(() => false))) {
        await lib.clickAt(page, cont, 600);
        await lib.sleep(2200);
      } else if ((await save.count()) > 0) {
        await lib.clickAt(page, save, 600);
        await lib.sleep(3200);
        break;
      }
    }
    await lib.sleep(2000);
  },
};

async function refreshAuth() {
  const { chromium } = require("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 540, height: 960 },
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
  await page.waitForTimeout(2500);
  await context.storageState({ path: lib.AUTH });
  await browser.close();
  console.log("auth refreshed");
}

(async () => {
  await refreshAuth();
  const keys = process.argv.slice(2);
  for (const key of keys) {
    if (!SHOTS[key]) {
      console.error("unknown shot", key);
      continue;
    }
    const h = await launchShot();
    const beats = lib.makeBeats();
    beats.start();
    try {
      await SHOTS[key](h);
      await finishShot(h, key.toUpperCase(), beats);
    } catch (e) {
      console.error(`SHOT ${key} FAILED:`, e.message);
      try {
        await h.page.screenshot({ path: path.join(OUT, `${key}-FAIL.png`) });
      } catch {}
      try {
        await h.context.close();
        await h.browser.close();
      } catch {}
    }
  }
})();
