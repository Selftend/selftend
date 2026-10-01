import fs from "node:fs";
import path from "node:path";

/**
 * Every navigable screen is single-instance, except the three classes that must not be
 * (#1027).
 *
 * expo-router's NAVIGATE reuses only the route it is already on, so pushing a screen that
 * already sits deeper in the stack mounts a SECOND copy of it. `dangerouslySingular` on
 * the `<Stack.Screen>` fixes that for every caller at once — but only for screens the
 * layout actually declares, and only where marking is safe. Declaring every route is
 * therefore part of the guard, not a tidiness preference; see the completeness check below.
 *
 * This guard DERIVES the first two exceptions instead of restating them, because a restated
 * list is satisfied forever by whatever it was written against:
 *
 * - a `[dynamic]` screen and a CREATION screen (a `new` route) are recognised by their names;
 * - a QUERY-keyed screen is recognised by reading the route file (and the one component it
 *   re-exports) for `useLocalSearchParams`. ☠️ `getSingularId` reads path segments only,
 *   so `?recordId=A` and `?recordId=B` collapse into one instance — and
 *   `/modules/cbt/new` additionally reads its check-in handoff once per MOUNT, so a
 *   reused instance drops the seeded emotions with nothing failing.
 *
 * The third — a screen whose MOUNT is the point, because it holds unsaved work or performs a
 * once-only side effect — cannot be derived, and is restated in `MUST_REMOUNT` below with the
 * reasoning for each entry.
 *
 * The rule this encodes: LIST and OVERVIEW screens are single-instance; screens holding
 * per-visit state — creation, editing, dynamic records, unsaved work — are not, because
 * singular reuses the route rather than remounting it.
 *
 * Adding a screen therefore forces a decision here rather than inheriting one.
 */

const REPO = path.join(__dirname, "..");

const readIfExists = (file: string) => (fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null);

/** `<Stack.Screen name="x" … />` → [name, the rest of the tag]. */
function declaredScreens(layoutFile: string): [string, string][] {
  const source = fs.readFileSync(path.join(REPO, layoutFile), "utf8");
  return [...source.matchAll(/<Stack\.Screen name="([^"]+)"([^/]*)\/>/g)].map((m) => [m[1], m[2]]);
}

/**
 * A child directory with its own `_layout.tsx` is a navigator BOUNDARY (#2847): the parent
 * owns ONE route by the directory's name, and the nested layout owns everything below it.
 * `app/(app)/modules` is that case since #2579 gave the module gate its own layout.
 */
const ownsItsOwnNavigator = (routesDir: string, name: string) =>
  fs.existsSync(path.join(REPO, routesDir, name, "_layout.tsx"));

/** The file backing a route name, following expo-router's `x` / `x/index` resolution. */
function routeFile(routesDir: string, name: string): string | null {
  for (const candidate of [`${name}.tsx`, `${name}/index.tsx`]) {
    const full = path.join(REPO, routesDir, candidate);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

/**
 * Route files in this repo are usually a one-line re-export of a feature screen, so the
 * param read lives one hop away. One hop is enough for every current route; the assertion
 * below fails loudly rather than silently if that ever stops being true.
 */
function readsSearchParams(file: string, depth = 0): boolean {
  const source = readIfExists(file);
  if (source === null) return false;
  if (source.includes("useLocalSearchParams")) return true;
  if (depth >= 2) return false;
  return [...source.matchAll(/from "@\/(src\/[^"]+)"/g)].some((m) =>
    [".ts", ".tsx"].some((ext) => readsSearchParams(path.join(REPO, m[1] + ext), depth + 1)),
  );
}

/**
 * The THIRD exception, and the only one that cannot be derived: screens whose MOUNT IS THE
 * POINT. Singular reuses a route rather than remounting it, so whatever these screens do or
 * hold on the way in simply does not happen the second time.
 *
 * Two shapes qualify, and neither is visible to the signals above — no dynamic segment, no
 * `new`, no `useLocalSearchParams`:
 *
 * - the screen holds the user's unsaved WORK, so reuse hands back something half-finished;
 * - the screen's mount RUNS something once, so reuse silently skips it.
 *
 * ☠️ `useState` is NOT the test, which is why this cannot be derived. Plenty of marked
 * overview screens hold benign view state — breathing's `helpOpen`, routines'
 * `starterDismissed`, the stage list's `openStage` — and reusing those is harmless or even
 * wanted. What disqualifies a screen is state that is the user's WORK, or a side effect the
 * route exists to perform.
 *
 * So this list is restated rather than derived, and the assertions below keep it honest:
 * every entry must be declared, and must actually be plain.
 */
const MUST_REMOUNT: Record<string, string> = {
  // ⚠️ Keys are screen names relative to the navigator that OWNS the screen (#2847): the
  // module entries lost their `modules/` prefix when their declarations moved from
  // protected-layout.tsx into `app/(app)/modules/_layout.tsx`, the navigator they are
  // actually children of.
  //
  // Nine pieces of state driving a timed practice; re-entering mid-surf is not a resume.
  // ⚠️ The route leaf became a directory in #1517 (it grew an `[id]` sibling for the detail
  // screen), so the screen name gained `/index`. The route PATH is unchanged; only the
  // Expo Router screen name moved, and this exception is keyed by the latter.
  "act/expansion/urge-surfing/index": "in-progress exercise",
  // ⚠️ `act/values/bulls-eye` used to be here, for exactly the reason this list
  // exists: it held four ratings the user had typed and not saved. #1379 folded that
  // check-in onto `act/values`, which is single-instance, so the entry is
  // REMOVED rather than moved - the ratings now live in a draft store, where a reused
  // instance hands the user back their own numbers and sign-out clears them. The route
  // itself survives as a redirect stub, so the "points at a real route" assertion below
  // would have kept passing on a stale entry: it checks that an exception names a
  // declared route, not that the route still deserves excusing.
  // The builder holds a whole coping plan the person has chosen and not yet
  // saved; a reused instance hands it back half-edited, over the plan they
  // did save. Seeded once from the query at mount, deliberately.
  "dbt/coping-plan/edit": "unsaved plan",
  // Four steps that record nothing: re-entering is starting again, and
  // reuse would drop the person back on step three of a run they left.
  "dbt/pause": "in-progress flow",
  // A timed session with a running clock; re-entering mid-run is not a
  // resume, and this session records on completion only.
  "dbt/sessions/muscle-relaxation": "in-progress session",
  // ☠️ Reads the callback URL and completes the redirect behind a once-only `useRef` guard,
  // then scrubs the auth material from history. A reused instance would never process a
  // second, different code — and it reads `window.location.href`, not `useLocalSearchParams`,
  // so the query-keyed derivation above is blind to it.
  "auth-callback": "mount performs the auth callback",
};

/** Every layout that declares screens, with the directory its route names resolve against. */
const LAYOUTS: [string, string][] = [
  ["src/components/app/protected-layout.tsx", "app/(app)"],
  ["src/components/app/app-shell.tsx", "app"],
  ["app/(auth)/_layout.tsx", "app/(auth)"],
  // The modules navigator (#2847): its 80 screens moved here from protected-layout.tsx,
  // which now declares only the `modules` boundary itself.
  ["app/(app)/modules/_layout.tsx", "app/(app)/modules"],
];

describe.each(LAYOUTS)("%s declares single-instance screens", (layoutFile, routesDir) => {
  const screens = declaredScreens(layoutFile);

  // Low enough to clear the smallest layout (the six auth routes) with room to spare: this
  // only has to catch a regex that stopped matching, not police how many routes exist.
  it("declares screens at all, so the assertions below cannot pass vacuously", () => {
    expect(screens.length).toBeGreaterThan(3);
  });

  it("marks every screen that is neither dynamic, query-keyed, nor required to remount", () => {
    const shouldBeMarked = screens.filter(([name]) => {
      // Groups route elsewhere and `index` is a landing/redirect route, never a push target.
      if (name.startsWith("(") || name === "index") return false;
      // A navigator boundary stays plain: the entry holds a whole nested stack, and that
      // stack is per-visit state by construction - a half-finished record can live
      // anywhere inside it - so singular's reuse is the `MUST_REMOUNT` hazard writ large.
      if (ownsItsOwnNavigator(routesDir, name)) return false;
      if (name.includes("[") || name.endsWith("/new")) return false;
      if (name in MUST_REMOUNT) return false;
      const file = routeFile(routesDir, name);
      return file !== null && !readsSearchParams(file);
    });

    const missing = shouldBeMarked
      .filter(([, rest]) => !rest.includes("dangerouslySingular"))
      .map(([name]) => name);

    expect(missing).toEqual([]);
  });

  it("leaves dynamic, query-keyed and must-remount screens plain", () => {
    const wronglyMarked = screens
      .filter(([name, rest]) => {
        if (!rest.includes("dangerouslySingular")) return false;
        if (name.includes("[") || name.endsWith("/new")) return true;
        if (name in MUST_REMOUNT) return true;
        // Singular on a navigator boundary would reuse the nested stack and whatever
        // per-visit state it holds - the same hazard `MUST_REMOUNT` names per screen.
        if (ownsItsOwnNavigator(routesDir, name)) return true;
        const file = routeFile(routesDir, name);
        return file !== null && readsSearchParams(file);
      })
      .map(([name]) => name);

    expect(wronglyMarked).toEqual([]);
  });
});

/**
 * ☠️ The assertions above only ever look at routes a layout DECLARES, so for years they said
 * nothing at all about the 76 routes it did not. An undeclared route is auto-registered with
 * default options — never single-instance — and silently absent from every check.
 *
 * Completeness is what closes that: every route file must appear in a layout, which forces
 * each one through the marking rules above rather than letting it inherit a default nobody
 * chose. Adding a screen now fails here until it is declared.
 */
/** Every route name a layout is responsible for, relative to its own directory. */
const routeNames = (routesDir: string, prefix = ""): string[] =>
  fs.readdirSync(path.join(REPO, routesDir, prefix), { withFileTypes: true }).flatMap((entry) => {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    // A `(group)` has its own layout and is declared by name as one entry, not walked into.
    // The same goes for any directory with its own `_layout.tsx` (#2847): it is a navigator
    // boundary, so the parent owns one route by its name and the nested layout - which must
    // itself be in `LAYOUTS` - owns everything below it. Walking through the boundary is how
    // this guard once demanded 80 `modules/*` declarations of a layout they were dead in.
    if (entry.isDirectory()) {
      if (entry.name.startsWith("(")) return [entry.name];
      if (ownsItsOwnNavigator(routesDir, name)) return [name];
      return routeNames(routesDir, name);
    }
    if (!entry.name.endsWith(".tsx")) return [];
    // `_layout` is configuration; `+not-found` is expo's catch-all, reached by failing to
    // match rather than by a push, so it has no second instance to prevent.
    if (entry.name.startsWith("_") || entry.name.startsWith("+")) return [];
    return [name.replace(/\.tsx$/, "")];
  });

describe.each(LAYOUTS)("%s declares every route it owns", (layoutFile, routesDir) => {
  const declared = new Set(declaredScreens(layoutFile).map(([name]) => name));
  const routes = routeNames(routesDir);

  it("finds the route files at all, so the assertion below cannot pass vacuously", () => {
    expect(routes.length).toBeGreaterThan(4);
  });

  it("declares each of them", () => {
    expect(routes.filter((route) => !declared.has(route))).toEqual([]);
  });
});

/**
 * ☠️ The INVERSE of completeness (#2847): a declared name that matches no child of the
 * navigator is DEAD. expo-router resolves a declaration against the navigator's own
 * children only (`route === name || route === `${name}/index``, `useScreens.tsx`), logs
 * `[Layout children]: No route named "…" exists in nested children` for anything else on
 * every mount, and silently applies NONE of the declaration's options. That is how #2579
 * left 80 `modules/*` declarations - `dangerouslySingular` included - dead in
 * protected-layout.tsx for weeks: the routes kept working off their files, so nothing
 * visible failed, and ~80 warnings buried every console read.
 */
describe.each(LAYOUTS)("%s declares no route it does not own", (layoutFile, routesDir) => {
  const owned = new Set(routeNames(routesDir));

  it("has no dead declaration", () => {
    const dead = declaredScreens(layoutFile)
      .map(([name]) => name)
      .filter((name) => !owned.has(name) && !owned.has(`${name}/index`));

    expect(dead).toEqual([]);
  });
});

/** Navigator boundaries under a routes dir: `(group)` dirs and dirs with a `_layout.tsx`. */
const nestedNavigators = (routesDir: string, prefix = ""): string[] =>
  fs.readdirSync(path.join(REPO, routesDir, prefix), { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isDirectory()) return [];
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.name.startsWith("(") || ownsItsOwnNavigator(routesDir, name)) return [name];
    return nestedNavigators(routesDir, name);
  });

/**
 * ☠️ A navigator boundary that is not itself in `LAYOUTS` is a subtree NO assertion in
 * this file sees: its routes are auto-registered with default options and nothing demands
 * a singular/plain decision for them. #2579 opened exactly that hole - the day the module
 * gate's `_layout.tsx` landed, the modules subtree stopped being protected-layout's to
 * declare, every guard here kept passing against the dead declarations, and the next
 * nested layout would do the same silently. This closes the loop: every boundary the
 * walker stops at must appear in `LAYOUTS` as a routes dir of its own.
 */
it("lists every nested navigator in LAYOUTS, so no subtree escapes the guard", () => {
  const covered = new Set(LAYOUTS.map(([, dir]) => dir));
  const escaped = LAYOUTS.flatMap(([, routesDir]) =>
    nestedNavigators(routesDir).map((name) => `${routesDir}/${name}`),
  ).filter((dir) => !covered.has(dir));

  expect(escaped).toEqual([]);
});

// A restated list rots the moment a route is renamed, and a stale key would silently stop
// excusing anything. Every exception must still name a route some layout declares.
it("keeps the must-remount exceptions pointing at real routes", () => {
  const declared = new Set(
    LAYOUTS.flatMap(([file]) => declaredScreens(file).map(([name]) => name)),
  );

  expect(Object.keys(MUST_REMOUNT).filter((name) => !declared.has(name))).toEqual([]);
});

/**
 * ☠️ The assertions above only ever look at routes a layout DECLARES. A route it never
 * declares is auto-registered with default options — so it is never single-instance — and is
 * absent from `screens`, so it is not asserted about either. The blindness is silent.
 *
 * The rows linking a module out to the standalone tools are where that bit. They push a
 * plain `router.push(route)`, and their targets are lateral by nature: arriving at a tool
 * from a module while that tool already sits deeper in the stack is an ordinary flow, not a
 * contrived one. Six of `SharedToolsRow`'s eight destinations were undeclared (#1216).
 *
 * So this pins the set rather than the symptom: every shared-tool destination must be
 * declared, which hands it to the marking rules above — including the one that keeps
 * query-keyed `/tools/meditation` plain.
 *
 * The config is read as SOURCE, like everything else here, so the guard never depends on the
 * module graph loading under jest.
 */
describe("every shared-tool destination is declared", () => {
  const CONFIG = "src/features/cbt/cbt-home/cbt-home-config.ts";

  const toolRoutes = [
    ...fs
      .readFileSync(path.join(REPO, CONFIG), "utf8")
      .matchAll(/const \w+_SHARED_TOOLS: SharedTool\[\] = \[([\s\S]*?)\n\];/g),
  ].flatMap((block) => [...block[1].matchAll(/route: "([^"]+)"/g)].map((m) => m[1]));

  const declared = new Set([
    ...declaredScreens("src/components/app/protected-layout.tsx").map(([name]) => name),
    // Module destinations are declared by the modules navigator since #2847, under names
    // relative to it; re-prefix them so the config's absolute routes resolve.
    ...declaredScreens("app/(app)/modules/_layout.tsx").map(([name]) => `modules/${name}`),
  ]);

  it("finds the rows' routes at all, so the assertion below cannot pass vacuously", () => {
    expect(toolRoutes.length).toBeGreaterThan(5);
  });

  it("declares each of them, so the marking rules above apply to it", () => {
    // `/tools/journal` is declared as either `tools/journal` or `tools/journal/index`,
    // following the resolution expo-router itself uses.
    const undeclared = toolRoutes.filter((route) => {
      const name = route.replace(/^\//, "");
      return !declared.has(name) && !declared.has(`${name}/index`);
    });

    expect(undeclared).toEqual([]);
  });
});
