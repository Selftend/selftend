import fs from "node:fs";
import path from "node:path";

/**
 * Every navigable screen is single-instance, except the two classes that must not be
 * (#1027).
 *
 * expo-router's NAVIGATE reuses only the route it is already on, so pushing a screen that
 * already sits deeper in the stack mounts a SECOND copy of it. `dangerouslySingular` on
 * the `<Stack.Screen>` fixes that for every caller at once — but only for screens the
 * layout actually declares, and only where marking is safe.
 *
 * This guard DERIVES both exceptions instead of restating them, because a restated list
 * is satisfied forever by whatever it was written against:
 *
 * - a `[dynamic]` screen and a CREATION screen (a `new` route) are recognised by their names;
 * - a QUERY-keyed screen is recognised by reading the route file (and the one component it
 *   re-exports) for `useLocalSearchParams`. ☠️ `getSingularId` reads path segments only,
 *   so `?recordId=A` and `?recordId=B` collapse into one instance — and
 *   `/modules/cbt/new` additionally reads its check-in handoff once per MOUNT, so a
 *   reused instance drops the seeded emotions with nothing failing.
 *
 * The rule this encodes: LIST and OVERVIEW screens are single-instance; screens holding
 * per-visit state — creation, editing, dynamic records — are not, because singular reuses
 * the route rather than remounting it.
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

describe.each([
  ["src/components/app/protected-layout.tsx", "app/(app)"],
  ["src/components/app/app-shell.tsx", "app"],
])("%s declares single-instance screens", (layoutFile, routesDir) => {
  const screens = declaredScreens(layoutFile);

  it("declares screens at all, so the assertions below cannot pass vacuously", () => {
    expect(screens.length).toBeGreaterThan(5);
  });

  it("marks every screen that is neither dynamic nor query-keyed", () => {
    const shouldBeMarked = screens.filter(([name]) => {
      // Groups route elsewhere and `index` is a landing/redirect route, never a push target.
      if (name.startsWith("(") || name === "index") return false;
      if (name.includes("[") || name.endsWith("/new")) return false;
      const file = routeFile(routesDir, name);
      return file !== null && !readsSearchParams(file);
    });

    const missing = shouldBeMarked
      .filter(([, rest]) => !rest.includes("dangerouslySingular"))
      .map(([name]) => name);

    expect(missing).toEqual([]);
  });

  it("leaves dynamic and query-keyed screens plain", () => {
    const wronglyMarked = screens
      .filter(([name, rest]) => {
        if (!rest.includes("dangerouslySingular")) return false;
        if (name.includes("[") || name.endsWith("/new")) return true;
        const file = routeFile(routesDir, name);
        return file !== null && readsSearchParams(file);
      })
      .map(([name]) => name);

    expect(wronglyMarked).toEqual([]);
  });
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
