// The index list, and the export step that applies it (docs/indexability.md
// § 3, § 6.4-6.6; glossary "Index list" in CONTEXT.md, #2295).
//
// One list decides three things at once: which exported HTML files survive,
// what the sitemap lists, and therefore what a search engine can index. They
// are one fact, never three - the files and the sitemap come from the same
// array below, so they cannot drift, and test/index-list.test.ts pins the array
// to the route tree so a public route cannot be dropped from the index (or a
// gated one added) without failing `verify`.
//
// `expo export` with `web.output = "static"` renders EVERY route into a file -
// the gated `(app)` tree, the `(auth)` screens, every dynamic route's
// placeholder - each one a loading state or a form no crawler should file as a
// page. `applyIndexList` runs right after the export (package.json
// `export:web`): it deletes every HTML file off the list, moves the not-found
// file to `404.html` (what Cloudflare serves, with a real 404 status, for every
// path off the list under `not_found_handling = "404-page"` - the file is the
// app shell and hydrates into the real screen), and writes `sitemap.xml`.
//
// Kept CommonJS like the rest of scripts/lib so `node scripts/apply-index-list.js`
// needs no loader; the origin is repeated from src/lib/site.ts, and the test
// asserts the two agree.

const fs = require("node:fs");
const path = require("node:path");

/**
 * The one serving origin (docs/indexability.md § 6.1). The same literal as
 * `SITE_ORIGIN` in src/lib/site.ts - hardcoded there for the canonical tags,
 * here for the sitemap, and pinned equal by test/index-list.test.ts. Not
 * `EXPO_PUBLIC_PUBLIC_APP_URL`: a staging deploy would write staging URLs into
 * a sitemap it then deletes, and a self-hosted mirror must not advertise
 * itself as the canonical site.
 */
const SITE_ORIGIN = "https://selftend.org";

/**
 * The index list: every public route, as its runtime pathname. Order is the
 * sitemap's order. Adding a public route means adding it here; nothing else
 * makes a page findable, and nothing off the list is (§ 3).
 */
const INDEX_LIST = Object.freeze([
  "/",
  "/faq",
  "/crisis",
  "/privacy",
  "/terms",
  "/cookies",
  "/security",
  "/account-deletion",
]);

/** What `expo export` names the `+not-found` route's file. */
const NOT_FOUND_EXPORT_FILE = "+not-found.html";

/** What Cloudflare's `404-page` mode serves for every path off the list. */
const NOT_FOUND_FILE = "404.html";

const SITEMAP_FILE = "sitemap.xml";

/** `/` → `index.html`; `/faq` → `faq.html`. What `expo export` writes for a route. */
function exportedFileFor(route) {
  return route === "/" ? "index.html" : `${route.replace(/^\//, "")}.html`;
}

/**
 * The URL the sitemap lists for a route: the root with its slash, every other
 * path without - byte for byte what `canonicalUrl` in src/lib/site.ts writes
 * into the page's canonical tag.
 */
function sitemapUrlFor(route) {
  return route === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${route}`;
}

/**
 * The sitemap, from the list (§ 6.6): absolute apex URLs and nothing else. No
 * `lastmod` (only truthful when it is per-page, and a release date stamped on
 * every page is not), no `hreflang` (English-only indexing is a ruling), no
 * `priority` or `changefreq` (ignored by Google and a claim either way).
 */
function buildSitemap() {
  const entries = INDEX_LIST.map(
    (route) => `  <url>\n    <loc>${sitemapUrlFor(route)}</loc>\n  </url>`,
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
    "",
  ].join("\n");
}

/** Every `.html` file under `dir`, as forward-slash paths relative to it. */
function htmlFilesUnder(dir) {
  const walk = (rel) =>
    fs.readdirSync(path.join(dir, rel), { withFileTypes: true }).flatMap((entry) => {
      const entryRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) return walk(entryRel);
      return entry.name.endsWith(".html") ? [entryRel] : [];
    });
  return walk("");
}

/** Removes `dir` and its ancestors up to (not including) `root` while they are empty. */
function removeEmptyDirsUpTo(dir, root) {
  let current = dir;
  while (current !== root && current.startsWith(root)) {
    if (fs.readdirSync(current).length > 0) return;
    fs.rmdirSync(current);
    current = path.dirname(current);
  }
}

/**
 * Applies the index list to an export directory, in place:
 *
 *   1. every HTML file that is neither on the list nor the not-found file is
 *      deleted, and the directories that emptied out with it;
 *   2. the not-found file becomes `404.html`;
 *   3. `sitemap.xml` is written from the list.
 *
 * Throws before touching anything if a listed file is missing from the export:
 * a public page silently absent from a deploy is exactly the failure the list
 * exists to make loud. Returns what it kept and deleted, for the log line.
 */
function applyIndexList(distDir) {
  const root = path.resolve(distDir);
  const listedFiles = new Set(INDEX_LIST.map(exportedFileFor));

  const missing = [...listedFiles, NOT_FOUND_EXPORT_FILE].filter(
    (file) => !fs.existsSync(path.join(root, file)),
  );
  if (missing.length > 0) {
    throw new Error(
      `applyIndexList: the export at ${root} is missing ${missing.join(", ")} - ` +
        "a route on the index list (scripts/lib/index-list.js) did not export.",
    );
  }

  const deleted = [];
  for (const rel of htmlFilesUnder(root)) {
    if (listedFiles.has(rel) || rel === NOT_FOUND_EXPORT_FILE) continue;
    const abs = path.join(root, rel);
    fs.rmSync(abs);
    removeEmptyDirsUpTo(path.dirname(abs), root);
    deleted.push(rel);
  }

  fs.renameSync(path.join(root, NOT_FOUND_EXPORT_FILE), path.join(root, NOT_FOUND_FILE));
  fs.writeFileSync(path.join(root, SITEMAP_FILE), buildSitemap());

  return {
    kept: [...listedFiles, NOT_FOUND_FILE],
    deleted,
    sitemap: SITEMAP_FILE,
  };
}

module.exports = {
  SITE_ORIGIN,
  INDEX_LIST,
  NOT_FOUND_EXPORT_FILE,
  NOT_FOUND_FILE,
  SITEMAP_FILE,
  exportedFileFor,
  sitemapUrlFor,
  buildSitemap,
  htmlFilesUnder,
  applyIndexList,
};
