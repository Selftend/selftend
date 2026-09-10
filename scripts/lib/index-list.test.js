const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  INDEX_LIST,
  NOT_FOUND_EXPORT_FILE,
  NOT_FOUND_FILE,
  SITEMAP_FILE,
  SITE_ORIGIN,
  applyIndexList,
  buildSitemap,
  exportedFileFor,
  htmlFilesUnder,
} = require("./index-list");

// A miniature of what `expo export` writes with `web.output = "static"`: the
// public files, the not-found file, the gated tree both with and without its
// group segment, the auth screens, and the non-HTML assets that must survive.
const EXPORT_FIXTURE = {
  "index.html": "<html>landing</html>",
  "faq.html": "<html>faq</html>",
  "crisis.html": "<html>crisis</html>",
  "privacy.html": "<html>privacy</html>",
  "terms.html": "<html>terms</html>",
  "cookies.html": "<html>cookies</html>",
  "security.html": "<html>security</html>",
  "account-deletion.html": "<html>account-deletion</html>",
  "+not-found.html": "<html>not found</html>",
  "sign-in.html": "<html>sign-in</html>",
  "(auth)/sign-in.html": "<html>sign-in</html>",
  "(app)/index.html": "<html>spinner</html>",
  "(app)/modules/cbt/index.html": "<html>spinner</html>",
  "modules/cbt/index.html": "<html>spinner</html>",
  "tools/journal/[id]/edit.html": "<html>spinner</html>",
  "_expo/static/js/web/index-abc.js": "js",
  _headers: "/*\n  X-Frame-Options: DENY\n",
  "robots.txt": "User-agent: *\n",
  "favicon.png": "png",
  "assets/fonts/x.ttf": "ttf",
  "tools/keep.txt": "a non-HTML file in a directory that otherwise empties",
};

function writeFixture(root, files = EXPORT_FIXTURE) {
  for (const [rel, body] of Object.entries(files)) {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  }
}

function allFilesUnder(root) {
  const walk = (rel) =>
    fs.readdirSync(path.join(root, rel), { withFileTypes: true }).flatMap((entry) => {
      const entryRel = rel ? `${rel}/${entry.name}` : entry.name;
      return entry.isDirectory() ? walk(entryRel) : [entryRel];
    });
  return walk("").sort();
}

describe("scripts/lib/index-list", () => {
  let dist;

  beforeEach(() => {
    dist = fs.mkdtempSync(path.join(os.tmpdir(), "selftend-index-list-"));
  });

  afterEach(() => {
    fs.rmSync(dist, { recursive: true, force: true });
  });

  describe("the list", () => {
    it("is the eight public routes, the root first", () => {
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

    it("maps each route to the file expo export writes for it", () => {
      expect(exportedFileFor("/")).toBe("index.html");
      expect(exportedFileFor("/faq")).toBe("faq.html");
      expect(exportedFileFor("/account-deletion")).toBe("account-deletion.html");
    });
  });

  describe("buildSitemap", () => {
    const sitemap = buildSitemap();

    it("lists exactly the eight apex URLs, the root with its slash and the rest without", () => {
      const locs = [...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1]);
      expect(locs).toEqual([
        `${SITE_ORIGIN}/`,
        `${SITE_ORIGIN}/faq`,
        `${SITE_ORIGIN}/crisis`,
        `${SITE_ORIGIN}/privacy`,
        `${SITE_ORIGIN}/terms`,
        `${SITE_ORIGIN}/cookies`,
        `${SITE_ORIGIN}/security`,
        `${SITE_ORIGIN}/account-deletion`,
      ]);
    });

    it("is a sitemaps.org urlset with an XML declaration and a trailing newline", () => {
      expect(
        sitemap.startsWith(
          '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n',
        ),
      ).toBe(true);
      expect(sitemap.endsWith("</urlset>\n")).toBe(true);
      expect(sitemap.match(/<url>/g)).toHaveLength(INDEX_LIST.length);
    });

    it("carries no lastmod, hreflang, priority or changefreq", () => {
      for (const tag of ["lastmod", "hreflang", "priority", "changefreq", "xhtml:link"]) {
        expect(sitemap).not.toContain(tag);
      }
    });

    it("names only the one serving origin", () => {
      const locs = [...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1]);
      for (const loc of locs) expect(loc.startsWith(`${SITE_ORIGIN}/`)).toBe(true);
      expect(sitemap).not.toContain("www.selftend.org");
      expect(sitemap).not.toContain("http://selftend.org");
    });
  });

  describe("applyIndexList", () => {
    it("leaves exactly the eight listed files plus 404.html as the HTML of the export", () => {
      writeFixture(dist);

      applyIndexList(dist);

      expect(htmlFilesUnder(dist).sort()).toEqual(
        [...INDEX_LIST.map(exportedFileFor), NOT_FOUND_FILE].sort(),
      );
    });

    it("moves the not-found file to 404.html, content intact", () => {
      writeFixture(dist);

      applyIndexList(dist);

      expect(fs.existsSync(path.join(dist, NOT_FOUND_EXPORT_FILE))).toBe(false);
      expect(fs.readFileSync(path.join(dist, NOT_FOUND_FILE), "utf8")).toBe(
        EXPORT_FIXTURE[NOT_FOUND_EXPORT_FILE],
      );
    });

    it("writes sitemap.xml from the list", () => {
      writeFixture(dist);

      applyIndexList(dist);

      expect(fs.readFileSync(path.join(dist, SITEMAP_FILE), "utf8")).toBe(buildSitemap());
    });

    it("deletes the gated and auth files and the directories that emptied with them, and nothing else", () => {
      writeFixture(dist);

      const result = applyIndexList(dist);

      expect(result.deleted.sort()).toEqual(
        [
          "sign-in.html",
          "(auth)/sign-in.html",
          "(app)/index.html",
          "(app)/modules/cbt/index.html",
          "modules/cbt/index.html",
          "tools/journal/[id]/edit.html",
        ].sort(),
      );
      expect(allFilesUnder(dist)).toEqual(
        [
          ...INDEX_LIST.map(exportedFileFor),
          NOT_FOUND_FILE,
          SITEMAP_FILE,
          "_expo/static/js/web/index-abc.js",
          "_headers",
          "robots.txt",
          "favicon.png",
          "assets/fonts/x.ttf",
          "tools/keep.txt",
        ].sort(),
      );
      // The directories that held only pruned HTML are gone; one that still
      // holds a non-HTML file stays.
      expect(fs.existsSync(path.join(dist, "(app)"))).toBe(false);
      expect(fs.existsSync(path.join(dist, "(auth)"))).toBe(false);
      expect(fs.existsSync(path.join(dist, "modules"))).toBe(false);
      expect(fs.existsSync(path.join(dist, "tools", "journal"))).toBe(false);
      expect(fs.existsSync(path.join(dist, "tools"))).toBe(true);
    });

    it("reports what it kept", () => {
      writeFixture(dist);

      const result = applyIndexList(dist);

      expect(result.kept).toEqual([...INDEX_LIST.map(exportedFileFor), NOT_FOUND_FILE]);
      expect(result.sitemap).toBe(SITEMAP_FILE);
    });

    it("refuses an export missing a listed file, and touches nothing", () => {
      const { "faq.html": _faq, ...withoutFaq } = EXPORT_FIXTURE;
      writeFixture(dist, withoutFaq);
      const before = allFilesUnder(dist);

      expect(() => applyIndexList(dist)).toThrow(/missing faq\.html/);

      expect(allFilesUnder(dist)).toEqual(before);
      expect(fs.existsSync(path.join(dist, SITEMAP_FILE))).toBe(false);
    });

    it("refuses an export missing the not-found file", () => {
      const { "+not-found.html": _notFound, ...withoutNotFound } = EXPORT_FIXTURE;
      writeFixture(dist, withoutNotFound);

      expect(() => applyIndexList(dist)).toThrow(/missing \+not-found\.html/);
    });
  });
});
