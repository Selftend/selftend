import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import {
  WIDGET_META,
  WIDGET_REGISTRY,
  isImplemented,
  metaForWidget,
  moduleTagFor,
} from "@/src/features/home/widget-registry";
import { CONCERN_KEYS, resolveConcernWidgetIds } from "@/src/features/onboarding/concerns";
import { SHARED_TOOL_WIDGET_IDS } from "@/src/features/onboarding/recommendations";
import enNavigation from "@/src/i18n/locales/en/navigation.json";
import bgNavigation from "@/src/i18n/locales/bg/navigation.json";

// Every static route Expo Router serves, read off the `app/` tree rather than
// restated here - a hand-written expectation would drift the moment a route
// moves. Route groups like `(app)` are invisible in the URL, and `index.tsx`
// collapses onto its directory.
//
// Dynamic segments are deliberately excluded. A dashboard row navigates to a
// fixed screen, so a route like `/tools/journal/[id]` is always a mistake -
// leaving `[id]` in the set would let that literal pass as if it resolved.
const isDynamic = (segment: string) => segment.includes("[");

function collectRoutes(dir: string, prefix: string, out: Set<string>): Set<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const { name } = entry;
    if (entry.isDirectory()) {
      if (isDynamic(name)) continue;
      const isGroup = name.startsWith("(") && name.endsWith(")");
      collectRoutes(join(dir, name), isGroup ? prefix : `${prefix}/${name}`, out);
      continue;
    }
    if (!name.endsWith(".tsx") || name.startsWith("_") || isDynamic(name)) continue;
    const base = name.slice(0, -".tsx".length);
    out.add(base === "index" ? prefix || "/" : `${prefix}/${base}`);
  }
  return out;
}

const APP_ROUTES = collectRoutes(join(__dirname, "../../../app"), "", new Set<string>());

// The (legacy, survivor) pairs the #973 migration rewrote, read off the
// migration itself so this file and that file cannot disagree. The pattern
// matches the `values` rows of its collapse loop:
//
//   ('cbt-module-shortcut', 'cbt-programme'),
//
// A parse that finds nothing would make the assertions below vacuous, so the
// count is asserted too.
const COLLAPSE_MIGRATION = join(
  __dirname,
  "../../../supabase/migrations/20260813000000_collapse_legacy_widget_ids.sql",
);
const COLLAPSED_WIDGET_IDS: [string, string][] = [
  ...readFileSync(COLLAPSE_MIGRATION, "utf8").matchAll(/\('([\w-]+)',\s*'([\w-]+)'\)/g),
].map((match) => [match[1], match[2]]);

// Where each survivor must still point. Stated here rather than derived,
// because this is the assertion: the migration moved rows onto these ids on
// the strength of them opening the screen the retired id opened.
const SURVIVOR_ROUTES: Record<string, string> = {
  "mood-checkin": "/tools/check-in",
  "cbt-programme": "/modules/cbt",
  "act-programme": "/modules/act",
};

// Both shipped locale bundles, for the module-tag guards below (#1247). Every widget
// title the tagged set can reach lives in `navigation.json`, in both languages - the
// guards read the real copy rather than a fixture, because the invariant they hold is
// about what a translator wrote, not about what this file expects them to write.
const LOCALE_BUNDLES = [
  { locale: "en", bundle: enNavigation as unknown },
  { locale: "bg", bundle: bgNavigation as unknown },
] as const;

/** The string at a dotted key path, or `undefined` if nothing string-shaped sits there. */
function copyAt(bundle: unknown, keyPath: string): string | undefined {
  const value = keyPath
    .split(".")
    .reduce<unknown>(
      (node, segment) =>
        node && typeof node === "object" ? (node as Record<string, unknown>)[segment] : undefined,
      bundle,
    );
  return typeof value === "string" ? value : undefined;
}

/**
 * A module acronym standing as its own word, in either script.
 *
 * ☠️ Case-sensitive and boundary-anchored, both deliberately. `Committed actions` and
 * `Behavioral activation` are shipped titles that contain the letters `act`, and a
 * loose match would condemn them; conversely `Practice` contains `act` mid-word. The
 * boundaries are `\p{L}\p{N}` rather than `\b`, because `\b` is ASCII-only and would
 * mis-anchor around Cyrillic `КПТ`.
 *
 * ☠️ `КПТ` must be here alongside the Latin pair: Bulgarian calls the CBT programme
 * `КПТ програма` but the ACT one `ACT програма`, so a single-script matcher would see
 * only one of the two titles this invariant exists to describe.
 */
const ACRONYM_AS_A_WORD = /(?<![\p{L}\p{N}])(CBT|ACT|КПТ)(?![\p{L}\p{N}])/gu;

/** Where the arrange chip's two strings per module live, as the screen composes them. */
const moduleTagLabelKey = (tag: string) => `home.arrange.moduleTag.${tag}`;
const moduleTagA11yKey = (tag: string) => `home.arrange.moduleTag.${tag}A11y`;

describe("widget registry", () => {
  it("exposes the daily check-in (mood-checkin) meta", () => {
    expect(WIDGET_META["mood-checkin"]).toBeDefined();
    expect(WIDGET_META["mood-checkin"].status).toBe("default");
  });

  it("every implemented widget has metadata", () => {
    for (const id of Object.keys(WIDGET_REGISTRY)) {
      expect(WIDGET_META[id]).toBeDefined();
    }
  });

  it("isImplemented reflects catalogue membership", () => {
    expect(isImplemented("mood-checkin")).toBe(true);
    expect(isImplemented("cbt-open-record")).toBe(true);
    expect(isImplemented("not-a-widget")).toBe(false);
  });

  it("registers cbt-distortion-guide as an available widget", () => {
    expect(isImplemented("cbt-distortion-guide")).toBe(true);
    expect(WIDGET_META["cbt-distortion-guide"].status).toBe("available");
    expect(WIDGET_META["cbt-distortion-guide"].toolKey).toBe("cbt");
  });

  it("registers cbt-programme as an available widget", () => {
    expect(isImplemented("cbt-programme")).toBe(true);
    expect(WIDGET_META["cbt-programme"].status).toBe("available");
    expect(WIDGET_META["cbt-programme"].toolKey).toBe("cbt");
  });

  it("registers act-committed-actions as an available widget", () => {
    expect(isImplemented("act-committed-actions")).toBe(true);
    expect(WIDGET_META["act-committed-actions"].status).toBe("available");
    expect(WIDGET_META["act-committed-actions"].toolKey).toBe("act");
  });

  it("registers act-defusion as an available widget", () => {
    expect(isImplemented("act-defusion")).toBe(true);
    expect(WIDGET_META["act-defusion"].status).toBe("available");
    expect(WIDGET_META["act-defusion"].toolKey).toBe("act");
  });

  it("registers the ACT programme widget but not the removed act-values widget", () => {
    expect(isImplemented("act-programme")).toBe(true);
    expect(WIDGET_META["act-programme"]?.status).toBe("available");
    expect(isImplemented("act-values")).toBe(false);
    expect(WIDGET_META["act-values"]).toBeUndefined();
  });

  it("registers act-drop-anchor as a default ACT widget", () => {
    expect(isImplemented("act-drop-anchor")).toBe(true);
    expect(WIDGET_META["act-drop-anchor"].status).toBe("default");
    expect(WIDGET_META["act-drop-anchor"].toolKey).toBe("act");
  });

  it("registers act-observing-self and act-choice-point as available ACT widgets", () => {
    for (const id of ["act-observing-self", "act-choice-point"]) {
      expect(isImplemented(id)).toBe(true);
      expect(WIDGET_META[id].status).toBe("available");
      expect(WIDGET_META[id].toolKey).toBe("act");
    }
  });

  it("registers act-acceptance-prompt as an available widget", () => {
    expect(isImplemented("act-acceptance-prompt")).toBe(true);
    expect(WIDGET_META["act-acceptance-prompt"].status).toBe("available");
    expect(WIDGET_META["act-acceptance-prompt"].toolKey).toBe("act");
  });

  it("registers journal-week as an available widget", () => {
    expect(isImplemented("journal-week")).toBe(true);
    expect(WIDGET_META["journal-week"].status).toBe("available");
    expect(WIDGET_META["journal-week"].toolKey).toBe("journal");
  });

  it("no longer registers the removed journal widgets", () => {
    expect(isImplemented("journal-latest")).toBe(false);
    expect(isImplemented("journal-prompt")).toBe(false);
    expect(isImplemented("journal-resurface")).toBe(false);
    expect(WIDGET_META["journal-latest"]).toBeUndefined();
    expect(WIDGET_META["journal-prompt"]).toBeUndefined();
    expect(WIDGET_META["journal-resurface"]).toBeUndefined();
  });

  it("no longer registers the removed gratitude/grounding widgets", () => {
    for (const id of [
      "gratitude-resurface",
      "gratitude-prompt",
      "gratitude-week",
      "grounding-54321",
      "grounding-library",
    ]) {
      expect(isImplemented(id)).toBe(false);
      expect(WIDGET_META[id]).toBeUndefined();
    }
  });

  it.each([["grounding-log", "grounding"]])(
    "registers %s as an available practice-tool widget",
    (id, toolKey) => {
      expect(isImplemented(id)).toBe(true);
      expect(WIDGET_META[id].status).toBe("available");
      expect(WIDGET_META[id].toolKey).toBe(toolKey);
    },
  );

  it("no longer registers the merged-away habits widgets", () => {
    for (const id of ["habits-quiet", "habits-one-deep"]) {
      expect(isImplemented(id)).toBe(false);
      expect(WIDGET_META[id]).toBeUndefined();
    }
  });

  it("registers habits-today as a default habits widget", () => {
    expect(isImplemented("habits-today")).toBe(true);
    expect(WIDGET_META["habits-today"].status).toBe("default");
    expect(WIDGET_META["habits-today"].toolKey).toBe("habits");
  });

  it("no longer registers the merged-away sleep widgets", () => {
    for (const id of ["sleep-last-night", "sleep-7-nights", "sleep-notes", "sleep-wind-down"]) {
      expect(isImplemented(id)).toBe(false);
      expect(WIDGET_META[id]).toBeUndefined();
    }
  });

  it("registers sleep-latest as a default sleep widget", () => {
    expect(isImplemented("sleep-latest")).toBe(true);
    expect(WIDGET_META["sleep-latest"].status).toBe("default");
    expect(WIDGET_META["sleep-latest"].toolKey).toBe("sleep");
  });

  it("no longer registers the merged-away meditation widgets", () => {
    for (const id of ["meditation-sit-time", "meditation-continue"]) {
      expect(isImplemented(id)).toBe(false);
      expect(WIDGET_META[id]).toBeUndefined();
    }
  });

  it("registers routines-today as an opt-in widget - available, never default-seeded", () => {
    expect(isImplemented("routines-today")).toBe(true);
    expect(WIDGET_META["routines-today"].toolKey).toBe("routines");
    // The exact flag difference to habits-today: habits-today is a
    // default-seeded widget ("default"); routines-today must stay "available"
    // (offered in the Add-Widget modal, never auto-added).
    expect(WIDGET_META["routines-today"].status).toBe("available");
    expect(WIDGET_META["habits-today"].status).toBe("default");
    expect(WIDGET_META["routines-today"].status).not.toBe(WIDGET_META["habits-today"].status);
  });

  it("keeps routines-today out of every auto-seeding surface", () => {
    // Onboarding's shared-tool widget offer (habits-today IS in this list).
    expect(SHARED_TOOL_WIDGET_IDS).not.toContain("routines-today");
    expect(SHARED_TOOL_WIDGET_IDS).toContain("habits-today");
    // Concern-based suggestions across every concern.
    expect(resolveConcernWidgetIds([...CONCERN_KEYS])).not.toContain("routines-today");
  });

  it("metaForWidget returns undefined for unknown ids", () => {
    expect(metaForWidget("nope")).toBeUndefined();
  });

  it("default widgets all carry a tint and a category", () => {
    for (const [id, meta] of Object.entries(WIDGET_META)) {
      expect({ id, tint: meta.tint }).toMatchObject({ tint: expect.any(String) });
      expect({ id, toolKey: meta.toolKey }).toMatchObject({ toolKey: expect.any(String) });
    }
  });

  // The registry is the dashboard catalogue (#972). `route` and `tier` are
  // required on WidgetMeta so a new id cannot be added without declaring where
  // its row goes and which tier renders it. Nothing reads them yet - this is
  // the expand step of an expand-contract.
  describe("dashboard catalogue", () => {
    it("every id declares a route and a tier", () => {
      for (const [id, meta] of Object.entries(WIDGET_META)) {
        expect({ id, route: meta.route }).toMatchObject({ route: expect.any(String) });
        expect({ id, tier: meta.tier }).toMatchObject({
          tier: expect.stringMatching(/^(tool|programme)$/),
        });
      }
    });

    it("every route resolves to a real Expo Router route", () => {
      // This is the assertion that earns its keep: the decided spec's row table
      // named `/tools/gratitude` and `/tools/routines`, neither of which the
      // router serves (`/tools/gratitude-log` and `/routines` do).
      for (const [id, meta] of Object.entries(WIDGET_META)) {
        expect({ id, route: meta.route, exists: APP_ROUTES.has(meta.route) }).toMatchObject({
          exists: true,
        });
      }
    });

    it("exactly two ids are the programme tier - CBT and ACT", () => {
      const programmeIds = Object.entries(WIDGET_META)
        .filter(([, meta]) => meta.tier === "programme")
        .map(([id]) => id)
        .sort();
      expect(programmeIds).toEqual(["act-programme", "cbt-programme"]);
    });

    it("the programme cards press to their module home", () => {
      expect(WIDGET_META["cbt-programme"].route).toBe("/modules/cbt");
      expect(WIDGET_META["act-programme"].route).toBe("/modules/act");
    });

    /**
     * The set the arrange chip run tags, as an exact sorted list (#1246).
     *
     * A list rather than a count, deliberately: the map that decided this feature
     * miscounted the set twice while charting it ("17 of 25", and "the untagged eight"
     * while naming nine). A count can be miscounted into agreement; a list cannot.
     *
     * It follows that adding a module-derived widget churns this array, and that is the
     * point rather than the cost - the tier-based exemption is a *proxy* for "the title
     * already says it", so a new entry deserves one human glance.
     *
     * ☠️ `self-care` belongs here despite carrying no `cbt-` prefix. Every other tagged id
     * is prefixed, which makes this one look like a mistake on sight. It is not: it routes
     * into the CBT module and declares the CBT tool key.
     */
    it("tags exactly these 14 module-derived tools", () => {
      const tagged = Object.keys(WIDGET_META)
        .filter((id) => moduleTagFor(id) !== undefined)
        .sort();

      expect(tagged).toEqual([
        "act-acceptance-prompt",
        "act-choice-point",
        "act-committed-actions",
        "act-defusion",
        "act-drop-anchor",
        "act-observing-self",
        "cbt-activities",
        "cbt-beliefs",
        "cbt-distortion-guide",
        "cbt-exposure",
        "cbt-goals",
        "cbt-open-record",
        "cbt-worry",
        "self-care",
      ]);
    });

    it("leaves the two programme cards untagged - their own titles carry the acronym", () => {
      expect(moduleTagFor("cbt-programme")).toBeUndefined();
      expect(moduleTagFor("act-programme")).toBeUndefined();
    });

    it("returns the module key rather than a display string", () => {
      expect(moduleTagFor("cbt-open-record")).toBe("cbt");
      expect(moduleTagFor("act-defusion")).toBe("act");
    });

    it("has no tag for a standalone tool or an unknown id", () => {
      expect(moduleTagFor("breathing-suggested")).toBeUndefined();
      expect(moduleTagFor("no-such-widget")).toBeUndefined();
    });

    /**
     * The proxy invariant (#1247): no tagged widget's own title already says its acronym.
     *
     * `moduleTagFor` exempts the two programme cards by TIER, and that exemption is a
     * *proxy* for the real reason - their titles (`CBT programme`, `КПТ програма`) already
     * carry the acronym, so tagging them would print it twice. The proxy holds today and
     * is the right rule (see the predicate's docblock: exempting by title *content* would
     * let a translation edit silently flip a widget's tagging). What it cannot see is the
     * opposite drift: a future `CBT quickstart` tool, correctly tier `tool` and correctly
     * tagged, would render `CBT quickstart · CBT` with nothing objecting.
     *
     * This is the guard for that, and it is why it reads the shipped copy in BOTH locales
     * rather than trusting English: the acronym a title carries is a translator's choice,
     * and the two programme titles already disagree about script.
     *
     * A title that resolves to nothing is a failure too, not a skip - the tagged set's
     * titles all live un-namespaced in `navigation.json` today, and a guard that quietly
     * passed over a key it could not read would be exactly the silence this ticket exists
     * to remove.
     */
    it("no tagged widget's own title already carries its acronym, in either locale", () => {
      const taggedIds = Object.keys(WIDGET_META).filter((id) => moduleTagFor(id) !== undefined);

      const offenders = taggedIds.flatMap((id) =>
        LOCALE_BUNDLES.flatMap(({ locale, bundle }) => {
          const { titleKey } = WIDGET_META[id];
          const title = copyAt(bundle, titleKey);
          if (title === undefined) {
            return [
              `${id} (${locale}): titleKey "${titleKey}" resolves to no string in navigation.json, so this guard cannot read the title it is meant to check. If the key moved to another namespace, teach LOCALE_BUNDLES about it.`,
            ];
          }
          return [...title.matchAll(ACRONYM_AS_A_WORD)].map(
            (match) =>
              `${id} (${locale}): the title "${title}" already says "${match[1]}", so its arrange chip would read "${title} · ${match[1]}". Either take the acronym out of the title, or exempt this widget in moduleTagFor - do not weaken this guard.`,
          );
        }),
      );

      // Non-vacuity gate, not a pinned count: with an empty tagged set the offender
      // list would be empty too and this guard would pass while checking nothing.
      // WHICH ids are tagged is pinned by "tags exactly these 14" above - restating
      // the number here would only make a legitimate widget addition fail twice, the
      // second time with no invariant named.
      expect(taggedIds.length).toBeGreaterThan(0);
      expect(offenders).toEqual([]);
    });

    /**
     * Third-module completeness, direction one (#1247): a tool routed into a module is
     * tagged with THAT module.
     *
     * ☠️ Latent, not hypothetical: DBT is already live in the sidebar and already has a
     * module route - it simply has no widgets yet. `moduleTagFor` returns `undefined` for
     * an unrecognised tool key, so a `/modules/dbt/...` widget would ship SILENTLY
     * untagged. Silence is the wrong failure, and this is where it becomes loud.
     *
     * The expectation is read off the route rather than restated, which is what keeps this
     * from being the predicate arguing with itself: `/modules/<module>/...` is the
     * router's own statement of which module a screen belongs to, and the guard holds the
     * predicate to it. That also catches a MIS-tag, not just a missing one.
     */
    it("every tool routed into a module yields that module's tag", () => {
      const moduleTools = Object.entries(WIDGET_META).filter(
        ([, meta]) => meta.tier === "tool" && meta.route.startsWith("/modules/"),
      );

      const offenders = moduleTools
        .map(([id, meta]) => ({ id, expected: meta.route.split("/")[2], actual: moduleTagFor(id) }))
        .filter(({ expected, actual }) => actual !== expected)
        .map(({ id, expected, actual }) =>
          actual === undefined
            ? `${id}: routes into /modules/${expected} but moduleTagFor returns no tag, so its arrange chip would ship untagged. If you just added a ${expected.toUpperCase()} widget, ${expected} needs to become a ModuleTagKey with copy behind it - that decision is the point of this failure, not an obstacle to it.`
            : `${id}: routes into /modules/${expected} but is tagged "${actual}", so its chip would name the wrong module.`,
        );

      expect(moduleTools.length).toBeGreaterThan(0);
      expect(offenders).toEqual([]);
    });

    /**
     * Third-module completeness, direction two (#1247): a tag the predicate can return
     * always has copy behind both of its keys.
     *
     * The two keys per module are not interchangeable - one is printed (`ACT`) and one is
     * heard (`ACT - Acceptance and Commitment Therapy`) - so a module with only the first
     * would leave a screen-reader user hearing a raw key path.
     *
     * ☠️ Nothing else catches this. `test/i18n-key-coverage.test.ts` matches string
     * literals sitting directly inside a `t(...)` call, and the arrange screen calls
     * `t(MODULE_TAG_KEYS[tag].label)` - a lookup, with no literal for the scanner to see.
     * Verified by mutation: deleting `home.arrange.moduleTag.cbt` from `en/navigation.json`
     * leaves that guard green.
     *
     * ⚠️ English only, and that is not an oversight. `src/i18n/locale-parity.test.ts`
     * enforces en↔bg key-path parity with an empty `KNOWN_GAPS`, so once a key exists in
     * English it cannot stay out of Bulgarian - verified by mutation there too. A
     * cross-locale sweep here would be a second, rotting copy of that guard.
     *
     * The tags are derived from the real registry rather than restated, so "can return"
     * means what a widget can actually make it return - a key in `ModuleTagKey` that no
     * widget reaches is unreachable copy, not a chip a user can meet. The length check is
     * the non-vacuity gate: an empty derivation would leave `missingCopy` empty too.
     */
    it("every tag the predicate can return has both of its strings", () => {
      const tags = [
        ...new Set(
          Object.keys(WIDGET_META)
            .map((id) => moduleTagFor(id))
            .filter((tag): tag is NonNullable<typeof tag> => tag !== undefined),
        ),
      ].sort();

      const missingCopy = tags.flatMap((tag) =>
        [
          { kind: "printed", key: moduleTagLabelKey(tag) },
          { kind: "spoken", key: moduleTagA11yKey(tag) },
        ]
          .filter(({ key }) => copyAt(enNavigation, key) === undefined)
          .map(
            ({ kind, key }) =>
              `${tag}: no ${kind} string at "${key}" in en/navigation.json, so a tagged chip would render that key path to a user. Coin the copy - do not drop the key.`,
          ),
      );

      expect(tags.length).toBeGreaterThan(0);
      expect(missingCopy).toEqual([]);
    });

    // S3 (#973) collapsed three ids away, and the migration that rewrote the
    // stored rows is the record of which. Reading the pairs off that file
    // rather than restating them here is the point: a restated list agrees
    // with the migration only until someone edits one of the two, and the
    // failure that hides is a registry id whose rows a shipped migration
    // already deleted from every user's dashboard.
    //
    // Each retired id must be GONE (its rows now carry the survivor's id), and
    // its survivor must still exist - a rename onto an id the registry does not
    // serve would strand every row the migration moved.
    it.each(COLLAPSED_WIDGET_IDS)(
      "%s is retired by the migration; %s survives it",
      (retired, survivor) => {
        expect(isImplemented(retired)).toBe(false);
        expect(WIDGET_META[retired]).toBeUndefined();
        expect(isImplemented(survivor)).toBe(true);
        expect(WIDGET_META[survivor].route).toBe(SURVIVOR_ROUTES[survivor]);
      },
    );

    it("reads three pairs off the migration, so an empty parse cannot pass", () => {
      expect(COLLAPSED_WIDGET_IDS).toHaveLength(3);
    });
  });
});
