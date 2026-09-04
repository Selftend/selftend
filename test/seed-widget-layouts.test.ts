import { readFileSync } from "node:fs";
import { join } from "node:path";

import { WIDGET_META } from "@/src/features/home/widget-registry";
import type { ConcernKey } from "@/src/features/onboarding/concerns";
import {
  buildWidgetRecommendations,
  suggestSharedToolWidgetIds,
  type ModuleInterest,
  type SharedToolWidgetId,
} from "@/src/features/onboarding/recommendations";
import { buildStarterSteps, STARTER_STEP_CAP } from "@/src/features/routines/starter";

/**
 * #1352's gate: the two seeded Home layouts stay **derivable**, not hand-maintained.
 *
 * demo's positions 0-8 and every one of bob's four ids are defined as "exactly what
 * `buildWidgetRecommendations` emits for these onboarding answers". That is a claim about
 * two files nothing else compares - `scripts/seed-demo-data.mjs` and `supabase/seed.sql`
 * hold the ids as literals, because one is JavaScript and the other is SQL and neither
 * can import the builder. This test is the comparison.
 *
 * ☠️ `widget_preferences.widget_id` is bare `TEXT` with no FK and no check
 * (`20260539_widget_preferences.sql`), and `useWidgetTiers` filters on `isImplemented`,
 * which is just `widgetId in WIDGET_META`. So a typo does not fail the seed - it lands,
 * renders nothing, and reads as a missing Home row that gets blamed on the screen. Every
 * seeded id is checked against the registry here for exactly that reason.
 *
 * ⚠️ This reads the seed files as TEXT. A parse that silently found nothing would make
 * every assertion below vacuous, and would make alice's "zero rows" pass for the wrong
 * reason - so the parsers assert their own yield (14 ids for demo, 4 rows for bob)
 * before anything is concluded from what they returned.
 */

const REPO = join(__dirname, "..");
const DEMO_SEED = readFileSync(join(REPO, "scripts", "seed-demo-data.mjs"), "utf8");
const SQL_SEED = readFileSync(join(REPO, "supabase", "seed.sql"), "utf8");

const ALICE_USER_ID = "00000000-0000-0000-0000-000000000001";
const BOB_USER_ID = "00000000-0000-0000-0000-000000000002";

/** The ids `scripts/seed-demo-data.mjs` writes for demo, in the order it writes them. */
function readDemoWidgetIds(): string[] {
  const block = DEMO_SEED.match(/const DEMO_WIDGET_IDS = \[([\s\S]*?)\];/);
  if (!block) throw new Error("Could not find `const DEMO_WIDGET_IDS = [...]` in the demo seed.");
  return Array.from(block[1].matchAll(/"([a-z0-9-]+)"/g)).map((match) => match[1]);
}

/**
 * One `key: ["a", "b"]` array literal out of a JavaScript source file, parsed rather
 * than string-matched so Prettier's spacing is not part of the assertion.
 */
function readJsArray(source: string, key: string): string[] {
  const match = source.match(new RegExp(`\\b${key}:\\s*\\[([^\\]]*)\\]`));
  if (!match) throw new Error(`Could not find \`${key}: [...]\` in the demo seed.`);
  return Array.from(match[1].matchAll(/"([a-z0-9-]+)"/g)).map((entry) => entry[1]);
}

/** Every `widget_preferences` row `supabase/seed.sql` writes, whoever it belongs to. */
function readSqlWidgetRows(): { userId: string; widgetId: string; position: number }[] {
  const rows: { userId: string; widgetId: string; position: number }[] = [];
  for (const statement of SQL_SEED.matchAll(/insert into public\.widget_preferences[\s\S]*?;/g)) {
    for (const row of statement[0].matchAll(
      /\(\s*'([0-9a-f-]+)'\s*,\s*'([a-z0-9-]+)'\s*,\s*(\d+)\s*\)/g,
    )) {
      rows.push({ userId: row[1], widgetId: row[2], position: Number(row[3]) });
    }
  }
  return rows;
}

/** What onboarding emits for one account's answers, exactly as the wizard composes them. */
function recommendedIds(concerns: ConcernKey[], modules: ModuleInterest[]): string[] {
  return buildWidgetRecommendations({
    concerns,
    moduleInterests: modules,
    // The wizard's own derivation (`app-onboarding-wizard.tsx`): mood-checkin is
    // hardcoded first, then the concern suggestions, deduped.
    selectedToolWidgetIds: Array.from(
      new Set(["mood-checkin" as SharedToolWidgetId, ...suggestSharedToolWidgetIds(concerns)]),
    ),
  }).map((item) => item.widgetId);
}

describe("seeded Home layouts", () => {
  const demoIds = readDemoWidgetIds();
  const sqlRows = readSqlWidgetRows();
  const bobRows = sqlRows.filter((row) => row.userId === BOB_USER_ID);

  it("parses both seed files (so nothing below is vacuous)", () => {
    expect(demoIds).toHaveLength(14);
    expect(bobRows).toHaveLength(4);
  });

  describe("demo@test.local", () => {
    // Restated from #1352 rather than read off the seed: the seed and this list share
    // no constant, so a nudge to either one has something to disagree with.
    const CONCERNS: ConcernKey[] = ["anxious-thoughts", "low-mood", "sleep"];
    const MODULES: ModuleInterest[] = ["cbt", "act"];
    /** The `/arrange` tail, in `WIDGET_META` declaration order (#1523). */
    const TAIL = [
      "self-care",
      "cbt-open-record",
      "act-drop-anchor",
      "grounding-log",
      "routines-today",
    ];

    it("opens with exactly what onboarding emits for her answers", () => {
      const head = recommendedIds(CONCERNS, MODULES);
      expect(head).toEqual([
        "cbt-programme",
        "act-programme",
        "mood-checkin",
        "breathing-suggested",
        "journal-week",
        "gratitude-latest",
        "habits-today",
        "sleep-latest",
        "meditation-pick",
      ]);
      expect(demoIds.slice(0, head.length)).toEqual(head);
    });

    it("closes with the /arrange tail in registry declaration order", () => {
      expect(demoIds.slice(9)).toEqual(TAIL);
      const declared = Object.keys(WIDGET_META);
      const tailRanks = TAIL.map((id) => declared.indexOf(id));
      expect(tailRanks).toEqual([...tailRanks].sort((a, b) => a - b));
    });

    it("seeds the answers the layout is explained by", () => {
      // Without these the id list is unexplainable - the state #1523 refused.
      // ⚠️ `selected_concerns` is read in SELECTION order, not `CONCERN_KEYS` order,
      // so the order seeded here is load bearing and is compared as a sequence.
      expect(readJsArray(DEMO_SEED, "selected_concerns")).toEqual(CONCERNS);
      expect(readJsArray(DEMO_SEED, "enabled_modules")).toEqual(MODULES);
      expect(DEMO_SEED).toContain("widgets_seeded: true");
    });

    it("leaves a non-trivial /arrange chip run (Rule 2, #1523)", () => {
      // `/arrange`'s add row is every registry id demo does not already own. A demo
      // owning all 25 empties the surface it exists to be reviewed on; the decided
      // target is 13-16 owned of 25. This is the number that rots silently when
      // someone adds an id to WIDGET_META or to demo.
      const chipRun = Object.keys(WIDGET_META).length - demoIds.length;
      expect(chipRun).toBe(11);
      expect(demoIds.length).toBeGreaterThanOrEqual(13);
      expect(demoIds.length).toBeLessThanOrEqual(16);
    });
  });

  describe("bob@test.local", () => {
    it("carries exactly what onboarding emits for anxious-thoughts + CBT, with no tail", () => {
      expect(bobRows.map((row) => row.widgetId)).toEqual(
        recommendedIds(["anxious-thoughts"], ["cbt"]),
      );
    });

    it("composes the three-step starter card that exists on no other account", () => {
      // Surface #45, the Routines-page empty-state starter card. It needs zero routines
      // AND at least two steppable stored ids - bob is the only fixture with both, which
      // is why he keeps zero routines permanently (#1550).
      const steps = buildStarterSteps(bobRows.map((row) => row.widgetId));
      expect(steps).toEqual(["mood", "breathing", "journal"]);
      expect(steps).toHaveLength(STARTER_STEP_CAP);
    });

    it("moves his onboarding answers with his rows, so the list is explainable", () => {
      // ☠️ Rows alone leave a *grandfathered* user holding four widgets: producible
      // through /arrange, but unexplainable. All five values are one atomic change.
      const prefs = SQL_SEED.slice(
        SQL_SEED.indexOf("-- bob: full onboarding done"),
        SQL_SEED.indexOf("-- demo: polished"),
      );
      expect(prefs).toContain("selected_concerns");
      expect(prefs).toContain("array['anxious-thoughts']::text[]");
      expect(prefs).toContain("widgets_seeded");
      expect(prefs).toContain("'finish'");
      expect(prefs).toContain("app_onboarding_completed_at");
      // Unlike demo, bob needs no module edit.
      expect(prefs).toContain("array['cbt']::text[]");
    });
  });

  describe("alice@test.local", () => {
    it("keeps zero widget preferences (the empty-dashboard fixture)", () => {
      // Once demo carries a layout, alice is the ONLY account on which the
      // empty-dashboard re-offer and the wizard's starter panel are reachable.
      // Emptiness preserves that offer; it does not cost it (#1528).
      expect(sqlRows.filter((row) => row.userId === ALICE_USER_ID)).toEqual([]);
      expect(sqlRows.map((row) => row.userId)).toEqual(Array(4).fill(BOB_USER_ID));
    });
  });

  describe("favourites (#1953)", () => {
    // Seeds run AFTER migrations, so the one-shot copy in
    // 20260908000000_favorites.sql has already run against an empty table by the time
    // either seed inserts its widget rows. Both seeds therefore write the favourites
    // the copy WOULD have produced, as literals - and this is the comparison that
    // keeps those literals derivable from the registry's `toolKey`, the way the
    // widget ids above are derivable from onboarding.
    function migrated(widgetIds: string[]): string[] {
      const out = new Set<string>();
      for (const id of widgetIds) {
        const { toolKey } = WIDGET_META[id as keyof typeof WIDGET_META];
        if (toolKey === "routines") continue; // /routines is on neither list
        // ☠️ Deliberately NOT `moduleTagFor` / `chipCategoryFor`: those answer what a
        // chip SAYS and where it GROUPS, and both gate on the `/modules/` route (the
        // first also exempts the two programme cards). The migration keys on `toolKey`
        // alone - `cbt-programme` → `module:cbt` - so this restates that rule, and the
        // integration suite proves it against the migration's own SQL.
        out.add(toolKey === "cbt" || toolKey === "act" ? `module:${toolKey}` : `tool:${toolKey}`);
      }
      return [...out].sort();
    }

    /** One `const NAME = [["kind", "key"], ...]` literal out of the demo seed. */
    function readJsPairs(name: string): string[] {
      const block = DEMO_SEED.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`));
      if (!block) throw new Error(`Could not find \`const ${name} = [...]\` in the demo seed.`);
      return Array.from(block[1].matchAll(/\[\s*"(tool|module)"\s*,\s*"([a-z]+)"\s*\]/g))
        .map((pair) => `${pair[1]}:${pair[2]}`)
        .sort();
    }

    /** Every `favorites` row `supabase/seed.sql` writes, as `userId` → sorted `kind:key`. */
    function readSqlFavorites(): Map<string, string[]> {
      const rows = new Map<string, string[]>();
      for (const statement of SQL_SEED.matchAll(/insert into public\.favorites[\s\S]*?;/g)) {
        for (const row of statement[0].matchAll(
          /\(\s*'([0-9a-f-]+)'\s*,\s*'(tool|module)'\s*,\s*'([a-z]+)'\s*\)/g,
        )) {
          rows.set(row[1], [...(rows.get(row[1]) ?? []), `${row[2]}:${row[3]}`].sort());
        }
      }
      return rows;
    }

    const sqlFavorites = readSqlFavorites();

    it("parses both seed files (so nothing below is vacuous)", () => {
      expect(readJsPairs("DEMO_FAVORITES")).toHaveLength(10);
      expect(readJsPairs("BOB_FAVORITES")).toHaveLength(4);
      expect(sqlFavorites.get(BOB_USER_ID)).toHaveLength(4);
    });

    it("demo's are exactly what the migration derives from her fourteen widget ids", () => {
      expect(readJsPairs("DEMO_FAVORITES")).toEqual(migrated(demoIds));
      // 8 tools + cbt + act, no DBT: nothing carries `toolKey: "dbt"`, so 10 of 11 is
      // the ceiling any migrated account can reach (#1889).
      expect(migrated(demoIds)).toHaveLength(10);
    });

    it("bob's are exactly what the migration derives from his four widget ids", () => {
      const bobIds = bobRows.map((row) => row.widgetId);
      expect(sqlFavorites.get(BOB_USER_ID)).toEqual(migrated(bobIds));
      // The demo script's read-back guard restates bob's rows; the two must agree.
      expect(readJsPairs("BOB_FAVORITES")).toEqual(sqlFavorites.get(BOB_USER_ID));
    });

    it("alice keeps zero favourites (the empty-Favourites fixture)", () => {
      expect(sqlFavorites.has(ALICE_USER_ID)).toBe(false);
      expect([...sqlFavorites.keys()]).toEqual([BOB_USER_ID]);
    });
  });

  describe("every seeded id", () => {
    const seeded = [
      ...demoIds.map((widgetId) => ["demo", widgetId] as const),
      ...bobRows.map((row) => ["bob", row.widgetId] as const),
    ];

    it.each(seeded)("%s's %s is a real registry id", (_account, widgetId) => {
      expect(WIDGET_META).toHaveProperty(widgetId);
    });

    it("sits at a contiguous 0-based position, the way the RPC assigns them", () => {
      // `apply_widget_recommendations` writes `min(ordinality)::integer - 1`, so a
      // direct insert has to use 0..n-1 to reproduce a real wizard run.
      expect(bobRows.map((row) => row.position)).toEqual([0, 1, 2, 3]);
      // demo's positions come from the array index, so the only way they can go wrong
      // is a repeated id; the seed script asserts the stored ones live.
      expect(new Set(demoIds).size).toBe(demoIds.length);
    });
  });
});
