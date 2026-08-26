import fs from "node:fs";
import path from "node:path";

import { computeBreadcrumbs, findUpCrumb } from "@/src/lib/breadcrumbs";

import { sourceFiles, stripComments, stripCommentsAndStrings } from "./source-scan";

/**
 * Every route reaches the Escape chrome, and every trail ends on the screen
 * itself (#1263 — clauses G3, G4, G5 and T1a of the escape spec, #1167).
 *
 * Construction already makes most omissions unrepresentable: the chrome
 * components render the Escape slot unconditionally, and a modal that forgets
 * its Escape is a type error. What construction cannot reach is COVERAGE — a
 * route that mounts no chrome at all, like the eleven screens #1254/#1255/#1256
 * retrofitted. That is the question this suite answers, from source, for the
 * whole population at once.
 *
 * Why a jest fs walk and not ESLint or e2e: most routes reach their chrome only
 * through a re-export hop (`export { default } from "@/src/features/…"`), so
 * any gate that greps `app/` alone is blind to most of the app — ESLint sees
 * one file at a time and cannot follow the hop or assert a population, and e2e
 * would be 135 authenticated navigations. `test/nav-singular.test.ts` is the
 * model; `./source-scan` supplies the comment-aware reading.
 *
 * What counts as reaching the Escape: rendering `ScreenHeader`, `ScreenTopBar`
 * or `ModuleHomeHeader` — each renders the slot unconditionally (G1) — or
 * rendering `ScreenEscape` itself, the shape `FocusSessionShell` ships (#1256).
 * ☠️ `ScreenBreadcrumb` is deliberately NOT on this list, although the spec's
 * G1 names it: #1250 lifted the Escape out of the trail, so a screen rendering
 * the bare trail would have no way out — accepting it here would be exactly the
 * "chrome or some pressable" widening G4 forbids. For the same reason there is
 * no discretionary exception mechanism: the two exempt classes below are
 * DERIVED from a route's shape, never listed by hand.
 *
 * ☠️ Platform forks are outside this walk's sight: a `.web.tsx` sibling is
 * never resolved (the one that exists, `avatar-crop-modal.web.tsx`, is a modal
 * and not on any route's chrome path). A future fork of a screen could drop
 * chrome on one platform invisibly — if one appears on a route path, this
 * resolver must learn to demand chrome of both variants.
 */

const REPO = path.join(__dirname, "..");

// ---------------------------------------------------------------------------
// The population: every route file under app/. Layouts are configuration, not
// screens. `+not-found` IS a route here — it renders UI and must carry chrome
// like any other screen (G4: it was converted, the assertion did not widen).
//
// `sourceFiles` admits `.ts` as well as `.tsx` — deliberately: a bare
// re-export needs no JSX, so a future `.ts` route file would otherwise never
// enter the population, the exact silent shrinkage G5 exists to catch. Tests
// are NOT excluded, because expo-router registers a stray test under `app/`
// as a route (#1255 moved one out for that reason) — here it would fail the
// pinned count and the chrome walk loudly, which is the point.
// ---------------------------------------------------------------------------

const ROUTES = sourceFiles(REPO, { dirs: ["app"], excludeTests: false })
  .filter((file) => !/\/_layout\.tsx?$/.test(file))
  .sort();

/** `app/(app)/tools/journal/index.tsx` → `/tools/journal`, the runtime pathname. */
const pathnameOf = (route: string): string => {
  const segments = route
    .replace(/^app\//, "")
    .replace(/\.tsx?$/, "")
    .split("/")
    .filter((segment) => !segment.startsWith("("));
  if (segments[segments.length - 1] === "index") segments.pop();
  return "/" + segments.join("/");
};

// ---------------------------------------------------------------------------
// Source reading. Imports are read with strings KEPT (the module specifier is
// a string); rendered tags with strings BLANKED, so a tag named in prose or in
// a message can never register as a render.
// ---------------------------------------------------------------------------

const sources = new Map<string, string>();
const sourceOf = (file: string): string => {
  let source = sources.get(file);
  if (source === undefined) {
    source = fs.readFileSync(path.join(REPO, file), "utf8");
    sources.set(file, source);
  }
  return source;
};

/**
 * Root names of every capitalized JSX tag in the file (`<Sortable.Grid` →
 * `Sortable`). The regex also matches uppercase TYPE arguments (`useRef<View>`)
 * — harmless for the terminal check (nobody writes chrome as a generic), and
 * for following it only widens the walk: a followed file still has to RENDER
 * chrome to count. ⚠️ That verdict is per FILE, not per render path — a route
 * rendering some non-chrome export of a file that also renders chrome would
 * pass. Today the chrome files export nothing but their chrome, so the vector
 * is theoretical; it is the precision this scanner trades for not being a
 * bundler.
 */
const renderedTags = (file: string): Set<string> =>
  new Set(
    [...stripCommentsAndStrings(sourceOf(file)).matchAll(/<([A-Z][A-Za-z0-9]*)/g)].map((m) => m[1]),
  );

/** Local binding name → module specifier, for default, named, and namespace imports. */
const importMap = (file: string): Map<string, string> => {
  const map = new Map<string, string>();
  const code = stripComments(sourceOf(file));
  for (const m of code.matchAll(/import\s+([^"';]+?)\s+from\s+["']([^"']+)["']/g)) {
    const [, clause, spec] = m;
    if (/^type\s/.test(clause)) continue;
    const namespace = clause.match(/\*\s+as\s+(\w+)/);
    if (namespace) map.set(namespace[1], spec);
    const defaultName = clause.match(/^(\w+)\s*(?:,|$)/);
    if (defaultName) map.set(defaultName[1], spec);
    const named = clause.match(/\{([^}]*)\}/);
    if (named) {
      for (const entry of named[1].split(",")) {
        const words = entry.trim().split(/\s+/).filter(Boolean);
        if (words.length === 0 || words[0] === "type") continue;
        map.set(words[words.length - 1], spec);
      }
    }
  }
  return map;
};

/** A repo-internal specifier resolved to a repo-relative file, or null. */
const resolveSpec = (spec: string, fromFile: string): string | null => {
  let base: string;
  if (spec.startsWith("@/")) {
    base = spec.slice(2);
  } else if (spec.startsWith(".")) {
    base = path.posix.join(path.posix.dirname(fromFile), spec);
  } else {
    return null;
  }
  for (const suffix of ["", ".tsx", ".ts", "/index.tsx", "/index.ts"]) {
    const candidate = base + suffix;
    if (candidate.endsWith(".tsx") || candidate.endsWith(".ts")) {
      if (fs.existsSync(path.join(REPO, candidate))) return candidate;
    }
  }
  return null;
};

/**
 * Where this file's default export actually lives, for the dominant route
 * shapes: `export { default } from "…"`, `export { X as default } from "…"`,
 * and `import X from "…"; export default X;`. A file defining its own default
 * (`export default function …`) matches none of these and resolves to itself.
 */
const defaultExportTarget = (file: string): string | null => {
  const code = stripComments(sourceOf(file));
  const reexport = code.match(
    /export\s+\{\s*(?:default|\w+\s+as\s+default)\s*\}\s+from\s+["']([^"']+)["']/,
  );
  if (reexport) return resolveSpec(reexport[1], file);
  const named = code.match(/export\s+default\s+(\w+)\s*;/);
  if (named) {
    const spec = importMap(file).get(named[1]);
    if (spec) return resolveSpec(spec, file);
  }
  return null;
};

// ---------------------------------------------------------------------------
// The walk. From each route file, follow the default-export chain and the
// components the file actually renders, up to MAX_HOPS files deep, looking for
// a render of the Escape chrome. A route that outruns the budget FAILS — it
// lands in the uncovered list below rather than dropping out of the
// population, so a 4th-hop refactor turns the suite red instead of silent.
// ---------------------------------------------------------------------------

const ESCAPE_CHROME = new Set(["ScreenHeader", "ScreenTopBar", "ModuleHomeHeader", "ScreenEscape"]);
const MAX_HOPS = 3;

const verdicts = new Map<string, boolean>();

const reachesEscape = (file: string, hopsLeft: number): boolean => {
  const key = `${file} ${hopsLeft}`;
  const cached = verdicts.get(key);
  if (cached !== undefined) return cached;
  verdicts.set(key, false); // Cycles terminate as "not found via this path".

  const tags = renderedTags(file);
  let found = [...tags].some((tag) => ESCAPE_CHROME.has(tag));

  if (!found && hopsLeft > 0) {
    const followables: string[] = [];
    const target = defaultExportTarget(file);
    if (target) followables.push(target);
    const imports = importMap(file);
    for (const tag of tags) {
      const spec = imports.get(tag);
      if (spec) {
        const resolved = resolveSpec(spec, file);
        if (resolved) followables.push(resolved);
      }
    }
    found = followables.some((next) => reachesEscape(next, hopsLeft - 1));
  }

  verdicts.set(key, found);
  return found;
};

// ---------------------------------------------------------------------------
// The two exempt classes, DERIVED from shape (G4) — never restated by hand.
// ---------------------------------------------------------------------------

/** Renders nothing but `<Redirect>`: a compatibility stub, not a screen. */
const isRedirectStub = (file: string): boolean => {
  const tags = renderedTags(file);
  return tags.size > 0 && [...tags].every((tag) => tag === "Redirect");
};

/** Resolves to `/`: a stack root, with nothing above it for an Escape to reach. */
const isStackRoot = (file: string): boolean => pathnameOf(file) === "/";

const redirectStubs = ROUTES.filter(isRedirectStub);
const stackRoots = ROUTES.filter((route) => !isRedirectStub(route) && isStackRoot(route));
const covered = ROUTES.filter((route) => !isRedirectStub(route) && !isStackRoot(route));

// ---------------------------------------------------------------------------
// Anti-vacuity (G5): the threat is not a bad assertion but the walk silently
// returning FEWER routes after a renamed directory or a new route shape. So
// the population and each class are pinned exactly — the small classes by
// content, the large ones by count — making any drift a deliberate edit here.
// ---------------------------------------------------------------------------

describe("the route population (pinned, G5)", () => {
  it("walks every route", () => {
    expect(ROUTES).toHaveLength(135);
  });

  it("derives exactly the eight <Redirect>-only stubs", () => {
    expect(redirectStubs).toEqual([
      // #1379 folded the alignment check-in onto the values screen, so this
      // route became a stub. The file is MANDATORY rather than deletable: the
      // `[domain]` sibling would otherwise swallow the segment and render the
      // save-error string as a not-found, with no way back out — see its own
      // docblock. Pinned here deliberately, which is what this block is for.
      "app/(app)/modules/act/values/bulls-eye.tsx",
      "app/(app)/modules/cbt/[id].tsx",
      "app/(app)/tools/act.tsx",
      "app/(app)/tools/meditation/stages/[n].tsx",
      "app/(app)/tools/mood-tracker/[id]/edit.tsx",
      "app/(app)/tools/mood-tracker/[id]/index.tsx",
      "app/(app)/tools/mood-tracker/index.tsx",
      "app/(app)/tools/mood-tracker/new.tsx",
    ]);
  });

  it("derives exactly the two stack roots", () => {
    expect(stackRoots).toEqual(["app/(app)/index.tsx", "app/index.tsx"]);
  });

  it("covers everything else", () => {
    // 126 → 125: the bulls-eye route moved from covered to stub above. The walk
    // still finds all 135 routes, which is the number this class exists to
    // protect — a drop there would mean the walk itself had gone blind.
    expect(covered).toHaveLength(125);
  });
});

describe("every covered route reaches the Escape chrome (G3)", () => {
  it(`renders ScreenHeader, ScreenTopBar, ModuleHomeHeader or ScreenEscape within ${MAX_HOPS} hops`, () => {
    const uncovered = covered.filter((route) => !reachesEscape(route, MAX_HOPS));
    expect(uncovered).toEqual([]);
  });
});

describe("every route's trail ends on the screen itself (T1a)", () => {
  // The label resolver is irrelevant here: the invariant is structural (which
  // crumb carries an href), so the key itself serves as the label.
  const t = (key: string) => key;

  it("computes a trail for every non-root route", () => {
    const trailless = covered
      .concat(redirectStubs)
      .filter((route) => computeBreadcrumbs(pathnameOf(route), t).length === 0);
    expect(trailless).toEqual([]);
  });

  it("terminates every trail in an href-less crumb, so Up is a strict ancestor", () => {
    // Asserted through `findUpCrumb`, the one definition of the Up rule: if a
    // terminal crumb ever carried an href, Up would BE the current screen —
    // the exact one-crumb-too-shallow bug #1251 fixed.
    const shallow = covered.concat(redirectStubs).filter((route) => {
      const crumbs = computeBreadcrumbs(pathnameOf(route), t);
      return findUpCrumb(crumbs) === crumbs[crumbs.length - 1];
    });
    expect(shallow).toEqual([]);
  });

  it("computes an empty trail at the roots, where there is nowhere up to go", () => {
    for (const route of stackRoots) {
      expect(computeBreadcrumbs(pathnameOf(route), t)).toEqual([]);
    }
  });
});
