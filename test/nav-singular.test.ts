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
  // Nine pieces of state driving a timed practice; re-entering mid-surf is not a resume.
  "modules/act/expansion/urge-surfing": "in-progress exercise",
  // ⚠️ `modules/act/values/bulls-eye` used to be here, for exactly the reason this list
  // exists: it held four ratings the user had typed and not saved. #1379 folded that
  // check-in onto `modules/act/values`, which is single-instance, so the entry is
  // REMOVED rather than moved - the ratings now live in a draft store, where a reused
  // instance hands the user back their own numbers and sign-out clears them. The route
  // itself survives as a redirect stub, so the "points at a real route" assertion below
  // would have kept passing on a stale entry: it checks that an exception names a
  // declared route, not that the route still deserves excusing.
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
    if (entry.isDirectory()) {
      return entry.name.startsWith("(") ? [entry.name] : routeNames(routesDir, name);
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

  const declared = new Set(
    declaredScreens("src/components/app/protected-layout.tsx").map(([name]) => name),
  );

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
