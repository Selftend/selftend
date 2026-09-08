import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { ACT_PROGRAM } from "@/src/features/act/program-definition";
import { CBT_PROGRAM } from "@/src/features/cbt/program-definition";

/**
 * Every destination the Android launcher can mint resolves to a real Expo Router
 * route (#2207).
 *
 * ☠️ NOTHING ELSE CHECKS THESE. The launcher's paths are string literals in
 * `snapshot-builder.ts`, typed as plain `string` on `Clickable` / `CardCta` (so
 * `typedRoutes` buys nothing), and the task handler hands them to
 * `Linking.openURL(Linking.createURL(path))` unvalidated. Until #1959 a guard on
 * the since-deleted `WIDGET_META.route` walked the `app/` tree and caught exactly
 * this class of mistake - its own comment cites the spec's `/tools/gratitude` and
 * `/tools/routines`, neither of which the router served - and it covered the
 * builder's literals by string coincidence only. This is that walk, re-homed on
 * the file that actually mints the paths. The builder's own test restates two of
 * its literals against its own output and never consults `app/`.
 *
 * The cost of a miss is a home-screen widget whose tap opens `+not-found` in a
 * shipped build, with `verify` green throughout.
 */

const ROOT = join(__dirname, "..", "..", "..");
const BUILDER = join(ROOT, "src/features/widgets/snapshot-builder.ts");

// Every static route Expo Router serves, read off the `app/` tree rather than
// restated here - a hand-written expectation would drift the moment a route
// moves. Route groups like `(app)` are invisible in the URL, and `index.tsx`
// collapses onto its directory.
//
// Dynamic segments are deliberately excluded. A launcher card navigates to a
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
    if (!name.endsWith(".tsx") || name.startsWith("_") || name.startsWith("+")) continue;
    if (isDynamic(name)) continue;
    const base = name.slice(0, -".tsx".length);
    out.add(base === "index" ? prefix || "/" : `${prefix}/${base}`);
  }
  return out;
}

const APP_ROUTES = collectRoutes(join(ROOT, "app"), "", new Set<string>());

/** A minted path, less any query string - the router matches the pathname alone. */
const pathname = (path: string) => path.split("?")[0];

/** Every `"/…"` literal the builder names, deduplicated, in file order. */
const MINTED_PATHS = [
  ...new Set(
    [...readFileSync(BUILDER, "utf8").matchAll(/"(\/[a-z0-9/-]+(?:\?[^"]*)?)"/g)].map((m) => m[1]),
  ),
];

/**
 * The programme goals the programme card renders as `path: String(task.route)` -
 * sourced from the two programme definitions rather than the builder's text, and
 * typed `Href` there, but the launcher stringifies them into the same unvalidated
 * channel, so they are walked too.
 */
const PROGRAMME_TASK_ROUTES = [
  ...new Set(
    [...CBT_PROGRAM, ...ACT_PROGRAM].flatMap((phase) =>
      [...(phase.dailyPractice ? [phase.dailyPractice] : []), ...phase.milestones].map((task) =>
        String(task.route),
      ),
    ),
  ),
];

describe("the launcher's destinations resolve against the app/ tree (#2207)", () => {
  it("reads a non-vacuous route set and a non-vacuous path set", () => {
    // Both halves of the guard are scans, and a scan that finds nothing passes
    // everything. The floors are well under the real counts (150+ routes, 30
    // literals, 24 programme routes) and well over zero.
    expect(APP_ROUTES.size).toBeGreaterThan(50);
    expect(APP_ROUTES.has("/")).toBe(true);
    expect(APP_ROUTES.has("/tools/journal/new")).toBe(true);
    expect(MINTED_PATHS.length).toBeGreaterThan(20);
    expect(PROGRAMME_TASK_ROUTES.length).toBeGreaterThan(10);
  });

  it("excludes dynamic routes, so a literal with an id in it cannot pass", () => {
    expect([...APP_ROUTES].filter((route) => route.includes("["))).toEqual([]);
  });

  it.each(MINTED_PATHS)("%s is a static route the router serves", (path) => {
    expect(APP_ROUTES.has(pathname(path))).toBe(true);
  });

  it.each(PROGRAMME_TASK_ROUTES)(
    "programme goal %s is a static route the router serves",
    (route) => {
      expect(APP_ROUTES.has(pathname(route))).toBe(true);
    },
  );
});
