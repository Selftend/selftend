import { readFileSync } from "node:fs";
import { join } from "node:path";

import { shouldShowModules } from "@/src/lib/module-visibility";
import { SITE_ORIGIN, canonicalUrl } from "@/src/lib/site";

import { sourceFiles } from "./source-scan";

/**
 * The index list is pinned to everything that reads it (docs/indexability.md
 * § 3, § 6.4-6.7; #2295).
 *
 * `scripts/lib/index-list.js` is the one list that decides which exported
 * HTML files survive, what the sitemap lists and therefore what is indexable.
 * Nothing else in the repo knows which routes are public, so the list is pinned
 * to the route tree here: every route file outside the `(app)` and `(auth)`
 * groups is on it, and nothing else is. A new public route cannot be silently
 * dropped from the index, and a gated route cannot be silently added.
 *
 * The rest of this file pins the pieces around the list - `robots.txt`, the
 * Worker configs' fallback mode, the export script and the staging strip -
 * each of which is read by an edge, a crawler or a workflow and by no test
 * otherwise.
 *
 * Text scans rather than YAML/TOML parses, for the reason
 * `test/web-deploy-public-env.test.ts` gives: neither parser is a declared
 * dependency.
 */
const ROOT = join(__dirname, "..");

const indexList = require("../scripts/lib/index-list") as {
  SITE_ORIGIN: string;
  INDEX_LIST: readonly string[];
  NOT_FOUND_FILE: string;
  SITEMAP_FILE: string;
  buildSitemap: () => string;
  sitemapUrlFor: (route: string) => string;
};

const { INDEX_LIST, SITEMAP_FILE, NOT_FOUND_FILE, buildSitemap, sitemapUrlFor } = indexList;

/** `app/faq.tsx` → `/faq`; `app/index.tsx` → `/`. */
const pathnameOf = (file: string): string => {
  const name = file.replace(/^app\//, "").replace(/\.tsx?$/, "");
  return name === "index" ? "/" : `/${name}`;
};

describe("the index list ↔ the route tree", () => {
  // Every route file outside the gated and auth groups, minus the layout, the
  // web document and the not-found file. Tests are not excluded: expo-router
  // registers a stray test under app/ as a route, and it would show up here.
  const publicRouteFiles = sourceFiles(ROOT, { dirs: ["app"], excludeTests: false })
    .filter((file) => !file.startsWith("app/(app)/") && !file.startsWith("app/(auth)/"))
    .filter((file) => !/\/(_layout|\+html|\+not-found)\.tsx?$/.test(file))
    .sort();

  it("lists every public route file, and nothing else", () => {
    expect([...INDEX_LIST].sort()).toEqual(publicRouteFiles.map(pathnameOf).sort());
  });

  // In the site footer's order (#2467): the crisis row, then the nav list -
  // the explainers, then the policies (#2469). The footer pin in
  // `src/components/app/site-footer.test.tsx` compares ordered arrays against
  // this list, so the two sequences cannot drift.
  it("holds the ten routes the spec's § 3 table names, explainers before policies", () => {
    expect(INDEX_LIST).toEqual([
      "/",
      "/crisis",
      "/meditation",
      "/habits",
      "/faq",
      "/privacy",
      "/terms",
      "/cookies",
      "/security",
      "/account-deletion",
    ]);
  });

  it("has no route file nested outside the two groups (a directory route would need a file-name rule the list does not have)", () => {
    for (const file of publicRouteFiles) {
      expect(file.split("/")).toHaveLength(2);
    }
  });
});

/**
 * ☠️ **The three module explainers ship with the gate that makes their modules
 * reachable - never before it, never after it** (#2715, decided on #2700;
 * `docs/brand-result.md` § 3.3, § 7.5, § 12 items 5-6).
 *
 * `/cbt`, `/dbt` and `/act` are fully decided pages (§ 3.2 sources and titles,
 * § 4 mechanism, § 5 head rows) that did not ship with `/meditation` and
 * `/habits` because the modules are gated. [#2473](https://github.com/Selftend/selftend/issues/2473)
 * has carried that requirement as an issue, kept alive by a `blocked_by` edge
 * that has rotted **twice** - re-wired #2448 → #2452, and #2452 closed too.
 * The reason is structural: every candidate is a decision ticket, and decision
 * tickets close as soon as they decide. The gate is an EVENT, and no issue
 * represents an event. Three documents have also failed to reach the person who
 * would open the gate - `brand-result.md` § 3.3, plus a § _Production
 * readiness_ and a readiness ADR that were specified and never written. So the
 * requirement is asserted here, where it can go red.
 *
 * ☠️ **An equality, not an implication, because § 3.3 forbids BOTH directions:**
 *
 * - gate open, pages missing → three decided pages are silently lost;
 * - pages listed early → a public route file exists iff it is indexable
 *   (`docs/indexability.md` § 3 - there is no third state such as "listed but
 *   hidden"), so the page would answer the not-found screen on production and
 *   **the sitemap would lie**. And a public page describing a module nobody can
 *   enter "fails the motive test as a set - its only reason to exist ahead of
 *   the module would be to be found."
 *
 * An implication would catch the first and stay vacuously green forever.
 *
 * ⚠️ The gate is asked the one question that decides it: can a person on an iOS
 * **production** build reach a module? Android and web have shown the three all
 * along, labelled beta, so "are modules visible" has no single answer - and the
 * pages are bound to the surface where a module is currently unreachable.
 *
 * ⚠️ The landing-card half of § 7.5 is already guarded by the two-link
 * assertion in `modules-section.test.tsx`; nothing is duplicated here.
 */
describe("the module explainers ↔ the module gate", () => {
  const MODULE_EXPLAINERS = ["/cbt", "/dbt", "/act"];

  it("lists all three explainers exactly when iOS production can reach a module", () => {
    const gateOpen = shouldShowModules("production", false, "ios");
    const listed = MODULE_EXPLAINERS.filter((route) => INDEX_LIST.includes(route));

    // Both sides are stated, so a failure says which way round it went rather
    // than just "false !== true".
    expect(listed).toEqual(gateOpen ? MODULE_EXPLAINERS : []);
  });

  it("asks a gate that still reads the platform and the environment", () => {
    // ☠️ The positive control. The assertion above is `[] === []` today, and
    // would stay green if `shouldShowModules` were replaced by `() => false` -
    // at which point the gate could open by another route with nothing red. So
    // the predicate is proved to still discriminate.
    expect(shouldShowModules("production", false, "ios")).toBe(false);
    expect(shouldShowModules("development", false, "ios")).toBe(true);
    expect(shouldShowModules("production", false, "android")).toBe(true);
  });
});

describe("the sitemap ↔ the canonical tags", () => {
  it("names the same origin as src/lib/site.ts", () => {
    expect(indexList.SITE_ORIGIN).toBe(SITE_ORIGIN);
  });

  it("writes each route exactly as its canonical tag does - the root with its slash, the rest without", () => {
    for (const route of INDEX_LIST) {
      expect(sitemapUrlFor(route)).toBe(canonicalUrl(route));
    }
  });

  it("lists the ten canonical URLs and no other loc", () => {
    const locs = [...buildSitemap().matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1]);
    expect(locs).toEqual(INDEX_LIST.map(canonicalUrl));
  });
});

describe("public/robots.txt", () => {
  const robots = readFileSync(join(ROOT, "public", "robots.txt"), "utf8");
  const lines = robots.split("\n");

  it("is the spec's § 6.5 text: allow everything, point at the sitemap, block nothing", () => {
    expect(robots).toBe(`User-agent: *\nDisallow:\n\nSitemap: ${SITE_ORIGIN}/${SITEMAP_FILE}\n`);
  });

  it("carries one Sitemap line, whose URL is the sitemap the export writes on the one serving origin", () => {
    const sitemapLines = lines.filter((line) => line.startsWith("Sitemap:"));
    expect(sitemapLines).toEqual([`Sitemap: ${SITE_ORIGIN}/${SITEMAP_FILE}`]);
  });

  it("disallows no path (a blocked URL stays indexed as a bare URL; letting Google fetch a 404 removes it)", () => {
    const disallows = lines.filter((line) => /^Disallow:\s*\S/.test(line));
    expect(disallows).toEqual([]);
  });

  it("has no _headers rule of its own (the extension gives the content type; the default cache is right)", () => {
    const headers = readFileSync(join(ROOT, "public", "_headers"), "utf8");
    expect(headers).not.toMatch(/robots/i);
  });
});

describe("the Worker configs' fallback mode", () => {
  it.each(["wrangler.toml", "wrangler.staging.toml"])(
    "%s serves 404.html with a real 404 for every path off the list",
    (config) => {
      const toml = readFileSync(join(ROOT, config), "utf8");
      expect(toml).toMatch(/^not_found_handling = "404-page"$/m);
      expect(toml).not.toContain('"single-page-application"');
    },
  );

  it("is served the file the export step writes", () => {
    expect(NOT_FOUND_FILE).toBe("404.html");
  });
});

describe("the export step", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };

  it("applies the index list right after expo export, in the one script the deploy runs", () => {
    expect(pkg.scripts["export:web"]).toBe(
      "npm exec expo -- export --platform web --clear && node scripts/apply-index-list.js dist",
    );
  });

  it("is the script the web deploy runs", () => {
    const workflow = readFileSync(join(ROOT, ".github/workflows/web-deploy.yml"), "utf8");
    expect(workflow).toMatch(/^\s+run: npm run export:web$/m);
  });
});

describe("the staging strip (docs/indexability.md § 6.7)", () => {
  const workflow = readFileSync(join(ROOT, ".github/workflows/web-deploy.yml"), "utf8");

  /** The steps of the deploy job, each from its `- name:` to the next. */
  const steps = workflow.split(/\n(?=\s+- name: )/).filter((chunk) => /^\s+- name: /.test(chunk));

  const stagingOnly = steps.filter((step) =>
    step.includes("if: ${{ inputs.environment == 'staging' }}"),
  );

  it("deletes the sitemap and the Sitemap line from robots.txt, on staging only", () => {
    const strip = stagingOnly.find((step) => step.includes(`rm dist/${SITEMAP_FILE}`));
    expect(strip).toBeDefined();
    expect(strip).toContain("sed -i '/^Sitemap:/d' dist/robots.txt");
  });

  it("keeps the noindex header step beside it", () => {
    expect(stagingOnly.some((step) => step.includes("X-Robots-Tag: noindex"))).toBe(true);
  });

  it("adds no Disallow anywhere in the deploy (a disallowed URL's noindex is never read)", () => {
    expect(workflow).not.toMatch(/Disallow:\s*\//);
  });

  it("touches neither file on production - every step naming them is staging-conditioned", () => {
    for (const step of steps) {
      if (step.includes(SITEMAP_FILE) || step.includes("robots.txt")) {
        expect(step).toContain("if: ${{ inputs.environment == 'staging' }}");
      }
    }
  });
});
