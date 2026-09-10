import { readFileSync } from "node:fs";
import { join } from "node:path";

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

  it("holds the eight routes the spec's § 3 table names", () => {
    expect(INDEX_LIST).toEqual([
      "/",
      "/faq",
      "/crisis",
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

describe("the sitemap ↔ the canonical tags", () => {
  it("names the same origin as src/lib/site.ts", () => {
    expect(indexList.SITE_ORIGIN).toBe(SITE_ORIGIN);
  });

  it("writes each route exactly as its canonical tag does - the root with its slash, the rest without", () => {
    for (const route of INDEX_LIST) {
      expect(sitemapUrlFor(route)).toBe(canonicalUrl(route));
    }
  });

  it("lists the eight canonical URLs and no other loc", () => {
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
