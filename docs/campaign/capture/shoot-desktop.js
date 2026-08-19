/* Campaign desktop re-shoot on live 0.14.x (map #612, ruling on #635 2026-08-18).
 * Usage: node shoot-desktop.js <shot> [<shot>...]
 * Output: Drive captures/desktop2/<SHOT>-v01.webm + <SHOT>-frame.png
 * Every shot: fresh context, morning clock (backward Date-shift to 09:41), ≥2s holds. */
const lib = require("./desktop-lib.js");
const path = require("path");
const fs = require("fs");

const DRIVE = "C:/Users/vasil/My Drive/Adobe Premiere Projects/Selftend";
const OUT = `${DRIVE}/captures/desktop2`;
const ORIGIN = "https://selftend.org";

async function goto(page, route, extra = 0) {
  await page.goto(ORIGIN + route, { waitUntil: "networkidle", timeout: 60000 });
  await lib.sleep(3000 + extra);
}

async function browse(h, route, scroll, holdEnd = 2500) {
  const { page } = h;
  await goto(page, route, 1200);
  await lib.cursorTo(page, 960, 700, 600);
  await lib.smoothScroll(page, scroll, 2400);
  await lib.sleep(2500);
  await lib.smoothScroll(page, -scroll, 2400);
  await lib.sleep(holdEnd);
}

const SHOTS = {
  // HOME — greeting + mood card + tool rows (trailer b2, GS-1)
  async home(h) {
    const { page } = h;
    await goto(page, "/", 1000); // 4s opening hold on greeting + Right now
    await lib.cursorTo(page, 960, 640, 700);
    await lib.smoothScroll(page, 450, 2400); // drift to tool rows + programmes
    await lib.sleep(2600);
    await lib.smoothScroll(page, -450, 2400);
    await lib.sleep(3200); // closing hold on greeting
  },

  async tools(h) {
    await browse(h, "/tools", 750, 3000);
  },

  // SETTINGS — palette, privacy rows, then account menu (theme/language) (GS-4, XX-90)
  async settings(h) {
    const { page } = h;
    await goto(page, "/settings", 500);
    await lib.smoothScroll(page, 800, 2600); // to YOUR DATA: Export / Privacy
    await lib.sleep(3000);
    await lib.smoothScroll(page, -800, 2400);
    await lib.sleep(1500);
    await lib.clickAt(page, page.locator('[aria-label="Open account menu"]'), 700);
    await lib.sleep(3200); // language + theme + palette visible
    await page.keyboard.press("Escape");
    await lib.sleep(2000);
  },

  async crisis(h) {
    await browse(h, "/crisis", 500, 3000);
  },

  // NOTIF-DEFAULTS — the all-off thesis shot (RW-1)
  async notifdefaults(h) {
    const { page } = h;
    await goto(page, "/notifications", 1500); // hold on header + master off
    await lib.smoothScroll(page, 700, 2600);
    await lib.sleep(2500);
    await lib.smoothScroll(page, -700, 2400);
    await lib.sleep(2500);
  },

  // NOTIF-OPTIN — master on, one reminder on (RW-2)
  async notifoptin(h) {
    const { page, context } = h;
    await context.grantPermissions(["notifications"], { origin: ORIGIN }).catch(() => {});
    await goto(page, "/notifications", 800);
    const master = page.locator('[aria-label="Notifications enabled"]');
    await lib.clickAt(page, master, 800);
    // let the master mutation persist + invalidate before the next write, or the
    // check-in toggle's stale snapshot rolls the master back
    await lib.sleep(4500);
    const masterOn = async () =>
      (await master.getAttribute("aria-checked").catch(() => "false")) === "true";
    if (!(await masterOn())) {
      console.log("master reverted — clicking again");
      await lib.clickAt(page, master, 500);
      await lib.sleep(4000);
    }
    const checkin = page.locator('[role="switch"][aria-label="Check-in"]');
    await lib.clickAt(page, checkin.first(), 800);
    await lib.sleep(4000);
    console.log(
      "end state:",
      await master.getAttribute("aria-checked"),
      await checkin.first().getAttribute("aria-checked"),
    );
    const time = page.locator('[aria-label="Check-in reminder time"]');
    if ((await time.count()) > 0) {
      const box = await time
        .first()
        .boundingBox()
        .catch(() => null);
      if (box) await lib.cursorTo(page, box.x + box.width / 2, box.y + box.height / 2, 700);
    }
    await lib.sleep(3500); // hold: one chosen reminder
  },

  // NOTIF-OFF — the easy exit (RW-4)
  async notifoff(h) {
    const { page } = h;
    await goto(page, "/notifications", 1000);
    const checkin = page.locator('[role="switch"][aria-label="Check-in"]');
    if ((await checkin.count()) > 0) {
      await lib.clickAt(page, checkin.first(), 800);
      await lib.sleep(1800);
    }
    const master = page.locator('[aria-label="Notifications enabled"]');
    await lib.clickAt(page, master, 800);
    await lib.sleep(3500); // hold on quiet
  },

  // CHECKIN — mood + emotion + note + save (trailer b3, GS-3, MJ-1)
  async checkin(h) {
    const { page } = h;
    await goto(page, "/tools/check-in/new", 500);
    await lib.clickAt(page, page.locator('[aria-label="Good"]'), 800);
    await lib.sleep(1400);
    await lib.clickAt(page, page.locator('[aria-label="Grateful"]'), 700);
    await lib.sleep(1200);
    const notes = page.locator("textarea").last();
    await lib.typeInto(page, notes, "Quiet morning. Feeling steady.", 55);
    await lib.sleep(1300);
    await lib.clickAt(page, page.getByText("Save check-in", { exact: true }).last(), 700);
    await lib.sleep(3800);
  },

  // JOURNAL — title + body + save (trailer b5, MJ-2)
  async journal(h) {
    const { page } = h;
    await goto(page, "/tools/journal/new", 500);
    await lib.typeInto(page, page.locator('[aria-label="Title (optional)"]'), "A quiet win", 60);
    await lib.sleep(600);
    await lib.typeInto(
      page,
      page.locator('[aria-label="Body"]'),
      "Finished the thing I kept postponing. It took twenty minutes - it always takes twenty minutes. Tea and an early night to celebrate.",
      42,
    );
    await lib.sleep(1400);
    await lib.clickAt(page, page.getByText("Save", { exact: true }).last(), 700);
    await lib.sleep(3800);
  },

  // GRATITUDE — three questions + save (MJ-3)
  async gratitude(h) {
    const { page } = h;
    await goto(page, "/tools/gratitude-log/new", 500);
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
    await lib.clickAt(page, page.getByText("Save entry", { exact: true }).last(), 700);
    await lib.sleep(3800);
  },

  // LOOKBACK — insights + journal history (MJ-4)
  async lookback(h) {
    const { page } = h;
    await goto(page, "/progress", 1800); // mood trend hold
    await lib.smoothScroll(page, 400, 1800);
    await lib.sleep(2500);
    await goto(page, "/tools/journal", 800);
    await lib.smoothScroll(page, 650, 2400);
    await lib.sleep(3000);
  },

  // CBT — 8-step thought record, exact walker from probe-cbt2 (trailer b6, CB-1..4)
  async cbt(h) {
    const { page } = h;
    const title = async () =>
      await page.evaluate(() => {
        const t = document.body.innerText;
        const i = t.indexOf("8. Afterward");
        if (i < 0) return "?";
        const lines = t
          .slice(i + 12)
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        return lines[0] || "?";
      });
    const cont = async () => {
      await lib.clickAt(page, page.getByText("Continue", { exact: true }).last(), 650);
      await lib.sleep(2200);
    };
    const fillTa = async (idx, text) => {
      const ta = page.locator("textarea").nth(idx);
      await lib.typeInto(page, ta, text, 38);
      await lib.sleep(900);
    };
    const checkbox = async (label) => {
      const cb = page.locator(`[role="checkbox"][aria-label="${label}"]`).first();
      await lib.clickAt(page, cb, 650);
      await lib.sleep(1000);
    };

    await goto(page, "/modules/cbt/new", 500);
    const gotIt = page.getByText("Got it", { exact: true }).first();
    if ((await gotIt.count()) > 0 && (await gotIt.isVisible().catch(() => false))) {
      await lib.clickAt(page, gotIt, 600);
    }
    await lib.sleep(1500);

    // 1. Situation
    console.log("step:", await title());
    await fillTa(0, "Sent a message with a typo to the whole team chat.");
    await cont();
    // 2. Your thoughts: thought + belief 70 + Add thought
    console.log("step:", await title());
    await fillTa(0, "Everyone will think I'm careless.");
    await lib.clickAt(page, page.getByText("70", { exact: true }).last(), 550);
    await lib.sleep(700);
    await lib.clickAt(page, page.getByText("Add thought", { exact: true }).last(), 600);
    await lib.sleep(1400);
    await cont();
    // 3. Hot thought (single thought is pre-marked; brief hold)
    console.log("step:", await title());
    await lib.sleep(2200);
    await cont();
    // 4. Emotions: checkbox Anxious
    console.log("step:", await title());
    await checkbox("Anxious");
    await cont();
    // 5. Put the thought on trial: evidence for / against
    console.log("step:", await title());
    await fillTa(0, "A couple of people reacted with joke emojis.");
    await fillTa(1, "Nobody mentioned it an hour later. Everyone sends typos sometimes.");
    await cont();
    // 6. Thinking patterns: checkbox Catastrophizing + Mind reading
    console.log("step:", await title());
    await checkbox("Catastrophizing");
    await checkbox("Mind reading");
    await cont();
    // 7. Balanced thought (summary visible)
    console.log("step:", await title());
    await fillTa(0, "It was a small slip that most people forgot within minutes.");
    await lib.sleep(1200);
    await cont();
    // 8. Afterward: intensity 30 + outcome note + Save record
    console.log("step:", await title());
    await lib.clickAt(page, page.getByText("30", { exact: true }).last(), 550);
    await lib.sleep(800);
    await fillTa(0, "Feeling lighter about it.");
    await lib.clickAt(page, page.getByText("Save record", { exact: true }).last(), 650);
    await lib.sleep(4200); // saved state hold
  },

  // CBT — legacy adaptive walker (unused)
  async cbt_legacy(h) {
    const { page } = h;
    const STEP_TEXT = {
      situation: "Sent a message with a typo to the whole team chat.",
      thought: "Everyone will think I'm careless.",
      "evidence for": "A couple of people reacted with joke emojis.",
      "evidence against": "Nobody mentioned it an hour later. Everyone sends typos sometimes.",
      balanced: "It was a small slip that most people forgot within minutes.",
      afterward: "Feeling lighter about it.",
    };
    await goto(page, "/modules/cbt/new", 500);
    const gotIt = page.getByText("Got it", { exact: true }).first();
    if ((await gotIt.count()) > 0 && (await gotIt.isVisible().catch(() => false))) {
      await lib.clickAt(page, gotIt, 600);
    }
    await lib.sleep(1500);
    const title = async () => {
      return await page.evaluate(() => {
        const t = document.body.innerText;
        const i = t.indexOf("8. Afterward");
        if (i < 0) return "?";
        const lines = t
          .slice(i + 12)
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        return lines[0] || "?";
      });
    };
    let last = "";
    for (let iter = 0; iter < 14; iter++) {
      const cur = await title();
      console.log("wizard step:", JSON.stringify(cur));
      const lower = cur.toLowerCase();

      const fillFirstEmpty = async (text) => {
        const tas = page.locator("textarea");
        const n = await tas.count();
        for (let i = 0; i < n; i++) {
          const ta = tas.nth(i);
          if (!(await ta.isVisible().catch(() => false))) continue;
          const v = await ta.inputValue().catch(() => "x");
          if (v === "") {
            await lib.typeInto(page, ta, text, 38);
            await lib.sleep(900);
            return true;
          }
        }
        return false;
      };

      if (lower.startsWith("situation")) {
        await fillFirstEmpty(STEP_TEXT.situation);
      } else if (lower.startsWith("your thoughts")) {
        await fillFirstEmpty(STEP_TEXT.thought);
        const add = page.getByText(/^Add( thought)?$/).last();
        if ((await add.count()) > 0 && (await add.isVisible().catch(() => false))) {
          await lib.clickAt(page, add, 500);
          await lib.sleep(1100);
        }
      } else if (lower.startsWith("hot thought")) {
        const th = page.getByText(STEP_TEXT.thought, { exact: false }).last();
        if ((await th.count()) > 0 && (await th.isVisible().catch(() => false))) {
          await lib.clickAt(page, th, 600);
          await lib.sleep(1000);
        }
      } else if (lower.startsWith("emotions")) {
        const emo = page.getByText("Anxious", { exact: true }).last();
        if ((await emo.count()) > 0 && (await emo.isVisible().catch(() => false))) {
          await lib.clickAt(page, emo, 600);
          await lib.sleep(900);
        }
        const chip70 = page.getByText("70", { exact: true }).last();
        if ((await chip70.count()) > 0 && (await chip70.isVisible().catch(() => false))) {
          await lib.clickAt(page, chip70, 500);
          await lib.sleep(700);
        }
        const add = page.getByText(/^Add( emotion)?$/).last();
        if ((await add.count()) > 0 && (await add.isVisible().catch(() => false))) {
          await lib.clickAt(page, add, 500);
          await lib.sleep(1000);
        }
      } else if (lower.startsWith("evidence")) {
        await fillFirstEmpty(STEP_TEXT["evidence for"]);
        await fillFirstEmpty(STEP_TEXT["evidence against"]);
      } else if (lower.startsWith("patterns")) {
        for (const p of ["Mind reading", "Catastrophizing", "All-or-nothing"]) {
          const chip = page.getByText(p, { exact: false }).first();
          if ((await chip.count()) > 0 && (await chip.isVisible().catch(() => false))) {
            await lib.clickAt(page, chip, 600);
            await lib.sleep(1000);
            break;
          }
        }
        await lib.sleep(1500);
      } else if (lower.startsWith("balanced")) {
        await fillFirstEmpty(STEP_TEXT.balanced);
      } else if (lower.startsWith("afterward")) {
        const chip35 = page.getByText("35", { exact: true }).last();
        if ((await chip35.count()) > 0 && (await chip35.isVisible().catch(() => false))) {
          await lib.clickAt(page, chip35, 500);
          await lib.sleep(800);
        }
        await fillFirstEmpty(STEP_TEXT.afterward);
      } else {
        await lib.sleep(2200);
      }

      const done = page.getByText(/^(Save record|Save|Finish)$/).last();
      const cont = page.getByText("Continue", { exact: true }).last();
      if ((await cont.count()) > 0 && (await cont.isVisible().catch(() => false))) {
        await lib.clickAt(page, cont, 600);
      } else if ((await done.count()) > 0 && (await done.isVisible().catch(() => false))) {
        await lib.clickAt(page, done, 600);
        await lib.sleep(3800);
        break;
      }
      await lib.sleep(2000);
      const after = await title();
      if (after === cur && lower.startsWith("afterward")) {
        const save = page.getByText(/^(Save record|Save|Finish)$/).last();
        if ((await save.count()) > 0) {
          await lib.clickAt(page, save, 600);
          await lib.sleep(3500);
          break;
        }
      }
      if (after === cur && after === last) {
        console.log("stalled at", after, "- stopping walker");
        break;
      }
      last = cur;
    }
    await lib.sleep(2000);
  },

  async cbtindex(h) {
    await browse(h, "/modules/cbt", 1100, 3000);
  },

  async cbthist(h) {
    const { page } = h;
    await goto(page, "/modules/cbt/history", 2000);
    await lib.smoothScroll(page, 450, 2000);
    await lib.sleep(2800);
    await lib.smoothScroll(page, -450, 1800);
    await lib.sleep(2800);
  },

  async actindex(h) {
    await browse(h, "/modules/act", 1100, 3000);
  },

  // ACT-BULLSEYE — rate four domains, save (AC-1)
  async actbullseye(h) {
    const { page } = h;
    await goto(page, "/modules/act/values/bulls-eye", 1000);
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
    await lib.sleep(600);
    await lib.clickAt(page, page.getByText("Save ratings", { exact: true }), 700);
    await lib.sleep(3800);
  },

  // ACT-ANCHOR — ACE read + log (AC-2)
  async actanchor(h) {
    const { page } = h;
    await goto(page, "/modules/act/connection/drop-anchor", 1800);
    await lib.smoothScroll(page, 350, 1900);
    await lib.sleep(2600);
    await lib.clickAt(page, page.getByText("Log this practice", { exact: true }), 700);
    await lib.sleep(3600);
  },

  // ACT-CHOICE — hooks/away/toward + save (AC-3)
  async actchoice(h) {
    const { page } = h;
    await goto(page, "/modules/act/choice-point/new", 700);
    const fill = async (label, text, addIdx) => {
      await lib.typeInto(page, page.locator('[aria-label="' + label + '"]'), text, 45);
      await lib.sleep(600);
      await lib.clickAt(page, page.locator('[aria-label="Add"]').nth(addIdx), 500);
      await lib.sleep(1000);
    };
    await fill("What hooks you?", "Sunday-evening dread about the week ahead", 0);
    await fill("Away moves", "Doomscrolling in bed", 1);
    await fill("Toward moves", "Prep tomorrow's one thing, then read", 2);
    await lib.sleep(800);
    await lib.clickAt(page, page.getByText("Save", { exact: true }).last(), 700);
    await lib.sleep(3800);
  },

  // ACT-COMMIT — 3-step wizard (AC-4)
  async actcommit(h) {
    const { page } = h;
    await goto(page, "/modules/act/committed-action/new", 700);
    await lib.clickAt(
      page,
      page.getByText("Health & personal growth", { exact: true }).first(),
      700,
    );
    await lib.sleep(1300);
    await lib.clickAt(page, page.getByText("Continue", { exact: true }).last(), 700);
    await lib.sleep(2500);
    const stepTexts = [
      "Ten quiet minutes outside before screens",
      "Rainy evenings, and phones that live within reach",
      "One small step at a time",
    ];
    for (let i = 0; i < 4; i++) {
      const tas = page.locator("textarea, input[type=text]");
      const n = await tas.count();
      for (let j = 0; j < n; j++) {
        const ta = tas.nth(j);
        if (!(await ta.isVisible().catch(() => false))) continue;
        const v = await ta.inputValue().catch(() => "x");
        if (v === "") {
          await lib.typeInto(page, ta, stepTexts[Math.min(i, stepTexts.length - 1)], 45);
          await lib.sleep(900);
          break;
        }
      }
      const cont = page.getByText("Continue", { exact: true }).last();
      const save = page.getByText(/^(Save|Finish|Create)$/).last();
      if ((await cont.count()) > 0 && (await cont.isVisible().catch(() => false))) {
        await lib.clickAt(page, cont, 600);
        await lib.sleep(2300);
      } else if ((await save.count()) > 0 && (await save.isVisible().catch(() => false))) {
        await lib.clickAt(page, save, 600);
        await lib.sleep(3400);
        break;
      }
    }
    await lib.sleep(2000);
  },

  // BREATHE — index → Box breathing → intro → ~2.5 pacer cycles (trailer b4, BG-1)
  async breathe(h) {
    const { page } = h;
    await goto(page, "/tools/breathing", 500);
    await lib.clickAt(page, page.locator('[aria-label="Start Box breathing"]'), 800);
    await lib.sleep(3800); // intro: cycle breakdown + duration chips
    await lib.clickAt(page, page.getByText("Start", { exact: true }).last(), 700);
    await lib.sleep(42000); // pacer runs ~2.5 cycles
    await lib.sleep(2000);
  },

  // GROUND — 5-4-3-2-1, three steps (BG-2)
  async ground(h) {
    const { page } = h;
    await goto(page, "/tools/grounding", 1200);
    await lib.clickAt(page, page.locator('[aria-label="5-4-3-2-1"]'), 800);
    await lib.sleep(4200); // SIGHT step hold
    for (let i = 0; i < 3; i++) {
      const next = page.getByText("Next", { exact: true }).last();
      if ((await next.count()) > 0 && (await next.isVisible().catch(() => false))) {
        await lib.clickAt(page, next, 700);
        await lib.sleep(4200);
      }
    }
    await lib.sleep(2200);
  },

  // MEDITATE — index practice section, then a sit (BG-3)
  async meditate(h) {
    const { page } = h;
    await goto(page, "/tools/meditation", 1500);
    await lib.smoothScroll(page, 500, 2200); // YOUR PRACTICE: stages + learn
    await lib.sleep(3000);
    await lib.smoothScroll(page, -500, 2000);
    await lib.sleep(1500);
    await lib.clickAt(page, page.getByText("Begin", { exact: true }).last(), 800);
    await lib.sleep(14000); // sit countdown hold
    await lib.sleep(2000);
  },

  // HABIT-NEW — create the habit live (HA-1); seeded habit deleted via SQL first
  async habitnew(h) {
    const { page } = h;
    await goto(page, "/tools/habits/new", 700);
    await lib.typeInto(
      page,
      page.locator('[aria-label="Habit name"]'),
      "Drink a glass of water",
      55,
    );
    await lib.sleep(1000);
    await lib.typeInto(
      page,
      page.locator('[aria-label="Two-minute version (Make It Easy)"]'),
      "Pour one glass right after waking up",
      45,
    );
    await lib.sleep(1200);
    await lib.smoothScroll(page, 350, 1500);
    await lib.sleep(1200);
    await lib.clickAt(page, page.getByText("Save", { exact: true }).last(), 700);
    await lib.sleep(3800);
  },

  // HABIT-LOG — one-tap tick on the habits index (HA-2); today untucked via SQL
  async habitlog(h) {
    const { page } = h;
    await goto(page, "/tools/habits", 1200);
    const row = page
      .locator('[aria-label^="Drink a glass of water"]:not([aria-label*="open habit details"])')
      .first();
    await lib.clickAt(page, row, 900);
    await lib.sleep(4000); // ticked state + stat flip hold
  },

  // HABIT-HIST — rhythm + history incl. missed days (HA-3)
  async habithist(h) {
    const { page } = h;
    await goto(page, "/tools/habits", 1200);
    await lib.smoothScroll(page, 650, 2400); // weekly rhythm + recent activity
    await lib.sleep(2600);
    await goto(page, "/tools/habits/history", 800);
    await lib.smoothScroll(page, 600, 2400);
    await lib.sleep(3000);
  },

  // ROUTINE-NEW — build Evening wind-down live (RO-1); seeded routine deleted via SQL first
  async routinenew(h) {
    const { page } = h;
    await goto(page, "/routines/new", 700);
    // the name input arrives PREFILLED ("My daily routine") — clear before typing
    const nameInput = page.locator('[aria-label="Routine name"]');
    await lib.clickAt(page, nameInput, 600);
    await page.keyboard.press("Control+a");
    await lib.sleep(200);
    await page.keyboard.press("Delete");
    await lib.sleep(400);
    await page.keyboard.type("Evening wind-down", { delay: 55 });
    await lib.sleep(1000);
    await lib.clickAt(page, page.locator('[aria-label="Add Breathing"]'), 700);
    await lib.sleep(1300);
    await lib.clickAt(page, page.locator('[aria-label="Add Journal"]'), 700);
    await lib.sleep(1600);
    await lib.clickAt(page, page.getByText("Save", { exact: true }).last(), 700);
    await lib.sleep(3800);
  },

  // ROUTINE — run both steps to 2/2 (trailer b7, RO-2)
  async routine(h) {
    const { page } = h;
    const openRoutine = async () => {
      await goto(page, "/routines", 500);
      await lib.clickAt(page, page.locator('[aria-label="Open routine"]').first(), 700);
      await lib.sleep(2500);
    };
    const doNextStep = async () => {
      await lib.clickAt(page, page.locator('[aria-label^="Continue"]').first(), 700);
      await lib.sleep(2200);
      await lib.clickAt(page, page.getByText("Do next step", { exact: false }).last(), 700);
      await lib.sleep(3000);
    };
    await openRoutine(); // steps + non-punitive copy hold
    await lib.sleep(1500);
    // step 1: breathing — 1-minute box session run to natural completion
    await doNextStep();
    const startPattern = page.locator('[aria-label="Start Box breathing"]');
    if ((await startPattern.count()) > 0 && (await startPattern.isVisible().catch(() => false))) {
      await lib.clickAt(page, startPattern, 700);
      await lib.sleep(2500);
    }
    const oneMin = page.getByText("1 min", { exact: true }).last();
    if ((await oneMin.count()) > 0 && (await oneMin.isVisible().catch(() => false))) {
      await lib.clickAt(page, oneMin, 600);
      await lib.sleep(1500);
    }
    await lib.clickAt(page, page.getByText("Start", { exact: true }).last(), 700);
    await lib.sleep(72000); // 1-minute session completes naturally
    console.log(
      "after breathing:",
      (await page.evaluate(() => document.body.innerText.slice(0, 300))).replace(/\n+/g, " | "),
    );
    for (const label of ["Log session", "Save", "Done", "Back to breathing", "Back"]) {
      const b = page.getByText(label, { exact: true }).last();
      if ((await b.count()) > 0 && (await b.isVisible().catch(() => false))) {
        await lib.clickAt(page, b, 500);
        await lib.sleep(2000);
        break;
      }
    }
    // step 2: journal
    await openRoutine();
    await doNextStep();
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
    // completed state hold: 2/2 + filled day
    await openRoutine();
    await lib.sleep(4500);
  },

  // ROUTINE-EDIT — open edit, adjust, save (RO-3)
  async routineedit(h) {
    const { page } = h;
    await goto(page, "/routines", 500);
    await lib.clickAt(page, page.locator('[aria-label="Open routine"]').first(), 700);
    await lib.sleep(2500);
    await lib.clickAt(page, page.getByText("Edit", { exact: true }).first(), 700);
    await lib.sleep(3500);
    await lib.smoothScroll(page, 400, 1600);
    await lib.sleep(2200);
    await lib.smoothScroll(page, -400, 1600);
    await lib.sleep(1000);
    await lib.clickAt(page, page.getByText("Save", { exact: true }).last(), 700);
    await lib.sleep(3200);
  },
};

async function finishShot(h, name) {
  const video = h.page.video();
  await h.page.screenshot({ path: path.join(OUT, `${name}-frame.png`) }).catch(() => {});
  await h.context.close();
  const vpath = await video.path();
  fs.copyFileSync(vpath, path.join(OUT, `${name}-v01.webm`));
  fs.unlinkSync(vpath);
  await h.browser.close();
  console.log("saved", `${name}-v01.webm`);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  await lib.refreshAuth();
  const keys = process.argv.slice(2);
  for (const key of keys) {
    if (!SHOTS[key]) {
      console.error("unknown shot", key);
      continue;
    }
    const noShift = false;
    const h = await lib.launch({ outDir: OUT, noShift });
    try {
      console.log("== shot:", key);
      await SHOTS[key](h);
      await finishShot(h, key.toUpperCase());
    } catch (e) {
      console.error(`SHOT ${key} FAILED:`, e.message.split("\n")[0]);
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
