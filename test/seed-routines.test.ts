import { readFileSync } from "node:fs";
import { join } from "node:path";

import { STEPPABLE_TOOL_IDS, isSteppableToolId } from "@/src/features/routines/derive";
import { ROUTINE_CADENCES } from "@/src/features/routines/types";

/**
 * #1271's gate: the demo account's four seeded routines stay **valid against the
 * app**, not merely valid against themselves.
 *
 * `scripts/seed-demo-data.mjs` re-derives each routine's status and seven-day strip
 * out of the database before it finishes, so what a reviewer sees is already held
 * there. What it cannot hold is whether the strings it wrote mean anything to the
 * app, because it is plain `.mjs` and cannot import TypeScript:
 *
 * ☠️ `routine_steps.tool_id` is free text — `CHECK (length(btrim(tool_id)) > 0)` and
 * `char_length <= 64`, no enum and no FK (`20260715_routines.sql`) — and validity is
 * client-side only. A mistyped step id therefore inserts fine, is skipped by
 * `stepDoneOnDate`'s exhaustive switch, and leaves a routine that can never derive
 * complete. The seed's own read-back would agree with it, because it reads the same
 * typo back out. The same shape as `widget_preferences.widget_id` in
 * `seed-widget-layouts.test.ts`, and checked here for the same reason.
 *
 * ⚠️ This reads the seed as TEXT, so a parse that quietly matched nothing would make
 * every assertion below vacuous — the whole file would pass by finding no routines to
 * disagree with. The parser therefore asserts its own yield first, and the shape of
 * what it found (four routines, nine steps, one reminder) is checked before anything
 * is concluded from it.
 */

const REPO = join(__dirname, "..");
const DEMO_SEED = readFileSync(join(REPO, "scripts", "seed-demo-data.mjs"), "utf8");

interface SeededRoutine {
  name: string;
  createdDay: number;
  cadence: string;
  steps: string[];
  reminder: { hour: number; minute: number; timezone: string } | null;
}

/**
 * The `SEEDED_ROUTINES` array out of the demo seed, in source order.
 *
 * Sliced between `name:` fields rather than matched as brace-delimited objects: the
 * routine that carries a reminder holds a NESTED object literal, and a non-greedy
 * `{...}` match ends at its inner `},` and silently reads a routine as missing its
 * steps. Field-by-field from there, so a routine whose fields are reordered or
 * reformatted still parses, and one that is genuinely missing a field fails here
 * rather than being read as a neighbour's.
 */
function readSeededRoutines(): SeededRoutine[] {
  const block = DEMO_SEED.match(/const SEEDED_ROUTINES = \[([\s\S]*?)\n\];/);
  if (!block) throw new Error("Could not find `const SEEDED_ROUTINES = [...]` in the demo seed.");

  const literal = block[1];
  const starts = Array.from(literal.matchAll(/name:\s*"([^"]+)"/g));
  const routines: SeededRoutine[] = [];
  for (const [index, match] of starts.entries()) {
    const name = match[1];
    const body = literal.slice(
      match.index! + match[0].length,
      starts[index + 1]?.index ?? literal.length,
    );
    const createdDay = body.match(/createdDay:\s*(\d+)/);
    const cadence = body.match(/cadence:\s*"([a-z-]+)"/);
    const steps = body.match(/steps:\s*\[([^\]]*)\]/);
    if (!createdDay || !cadence || !steps) {
      throw new Error(`Seeded routine "${name}" is missing a createdDay, cadence or steps field.`);
    }
    const reminder = body.match(
      /reminder:\s*\{\s*hour:\s*(\d+),\s*minute:\s*(\d+),\s*timezone:\s*"([^"]+)"\s*\}/,
    );
    routines.push({
      name,
      createdDay: Number(createdDay[1]),
      cadence: cadence[1],
      steps: Array.from(steps[1].matchAll(/"([A-Za-z]+)"/g)).map((match) => match[1]),
      reminder: reminder
        ? { hour: Number(reminder[1]), minute: Number(reminder[2]), timezone: reminder[3] }
        : null,
    });
  }
  return routines;
}

const SEEDED = readSeededRoutines();

describe("the demo seed's routines", () => {
  it("parses as the four decided routines, so nothing below passes vacuously", () => {
    expect(SEEDED.map((routine) => routine.name)).toEqual([
      "When I need to slow down",
      "Back on my feet",
      "Morning reset",
      "Steadying myself",
    ]);
    expect(SEEDED.flatMap((routine) => routine.steps)).toHaveLength(9);
  });

  it("steps only through tools the app can actually derive completion for", () => {
    for (const routine of SEEDED) {
      expect(routine.steps.length).toBeGreaterThan(0);
      for (const step of routine.steps) {
        // Named in the failure rather than left to a bare `false`: a typo here is
        // invisible in the database and the message is the only place it surfaces.
        expect(isSteppableToolId(step) ? step : `${step} (not in STEPPABLE_TOOL_IDS)`).toBe(step);
      }
    }
    expect(STEPPABLE_TOOL_IDS).toContain("defusion");
  });

  it("gives each routine a real cadence, and never seeds `custom`", () => {
    for (const routine of SEEDED) {
      expect(ROUTINE_CADENCES).toContain(routine.cadence);
    }
    // The decided spread: two `daily`, one `weekdays`, one `on-demand`. `weekdays`
    // is what buys the strip's not-scheduled cell and `on-demand` the resting
    // card's schedule label, so losing either one silently costs a surface.
    expect(SEEDED.map((routine) => routine.cadence).sort()).toEqual([
      "daily",
      "daily",
      "on-demand",
      "weekdays",
    ]);
    expect(SEEDED.map((routine) => routine.cadence)).not.toContain("custom");
  });

  it("carries exactly one reminder, on the routine the continue sheet can show both branches with", () => {
    const armed = SEEDED.filter((routine) => routine.reminder !== null);
    expect(armed.map((routine) => routine.name)).toEqual(["Back on my feet"]);
    expect(armed[0].reminder).toEqual({ hour: 8, minute: 0, timezone: "Europe/Sofia" });
    // Not on the routine the sheet selects: `firstOpenRoutineView` prefers the
    // routine with progress, and `continue-routine-sheet.tsx` swaps its
    // reminder-OFFER card for a bare Close as soon as `reminderEnabled` is true.
    const morningReset = SEEDED.find((routine) => routine.name === "Morning reset");
    expect(morningReset?.reminder).toBeNull();
  });

  it("orders the roster so the FAB queues the richer routine first", () => {
    const day = (name: string) => SEEDED.find((routine) => routine.name === name)!.createdDay;
    // The list sorts by `created_at` DESC, and `firstOpenRoutineView` walks it in
    // that order. "Back on my feet" must sit below "Morning reset" so the sheet
    // opens on 2/3 rather than 1/2 and the button reads `+1` beside it.
    expect(day("Back on my feet")).toBeLessThan(day("Morning reset"));
    // The on-demand routine keeps the lowest, so it still sorts last.
    expect(day("When I need to slow down")).toBeLessThan(day("Back on my feet"));
  });

  it("keeps the reminder off the routine that would render it nowhere", () => {
    // `routine-detail-screen.tsx` and `routines-home-screen.tsx` never read
    // `reminderEnabled`, and a complete routine is never selected by the sheet, so
    // a reminder on "Steadying myself" renders on zero surfaces (#1541).
    const steadying = SEEDED.find((routine) => routine.name === "Steadying myself");
    expect(steadying?.reminder).toBeNull();
    expect(steadying?.cadence).toBe("weekdays");
  });
});
