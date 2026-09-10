// Applies the index list to a web export (docs/indexability.md § 3, § 6.4-6.6;
// #2295). Runs as the second half of `npm run export:web`, right after
// `expo export`: deletes every HTML file off the list, moves `+not-found.html`
// to `404.html`, writes `sitemap.xml`. See scripts/lib/index-list.js.
//
//   node scripts/apply-index-list.js [dist]
//
// Run it once, on a fresh export: it refuses a directory that lacks
// `+not-found.html`, which an already-applied export does (its not-found file
// is `404.html` by then). `npm run export:web` always exports first, so the
// only way to hit that is running this script by hand twice.

const path = require("node:path");

const { applyIndexList } = require("./lib/index-list");

const dist = path.resolve(process.cwd(), process.argv[2] ?? "dist");

try {
  const { kept, deleted, sitemap } = applyIndexList(dist);
  console.log(
    `[index-list] ${dist}: kept ${kept.length} HTML files (${kept.join(", ")}), ` +
      `deleted ${deleted.length}, wrote ${sitemap}`,
  );
} catch (error) {
  console.error(`[index-list] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
