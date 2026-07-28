/**
 * Guards the caching rules in public/_headers (issue #393). Cloudflare Workers
 * static assets applies this file natively, so a rule that silently matches
 * nothing is invisible until someone reads response headers off the live edge.
 * Two such rules shipped:
 *
 *   - /assets/* covered the fonts and images but NOT /_expo/static/*, where
 *     Expo's web export puts the content-hashed entry bundle and stylesheet.
 *     Both fell through to Cloudflare's default max-age=0, must-revalidate and
 *     cost a revalidation round-trip on every page load.
 *   - /index.html never matched a real response at all: that path 307s to /.
 *
 * These tests pin the fixed shape so neither mistake can come back unnoticed.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

type HeaderRule = { pattern: string; headers: Map<string, string> };

const HEADERS_FILE = join(__dirname, "public", "_headers");

/**
 * Parses the Cloudflare _headers format: a left-aligned path pattern followed
 * by indented "Name: value" lines, blocks separated by blank lines.
 */
function parseHeaders(source: string): HeaderRule[] {
  const rules: HeaderRule[] = [];
  for (const raw of source.split("\n")) {
    const line = raw.trimEnd();
    if (line.trim() === "" || line.trim().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      rules.push({ pattern: line.trim(), headers: new Map() });
      continue;
    }
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    rules
      .at(-1)
      ?.headers.set(
        line.slice(0, separator).trim().toLowerCase(),
        line.slice(separator + 1).trim(),
      );
  }
  return rules;
}

const rules = parseHeaders(readFileSync(HEADERS_FILE, "utf8"));

/** Resolves a request path against the rules the way Cloudflare does: all
 *  matching blocks apply, and the most specific pattern wins a collision. */
function headerFor(path: string, name: string): string | undefined {
  const matches = rules
    .filter((rule) => {
      if (!rule.pattern.endsWith("*")) return rule.pattern === path;
      return path.startsWith(rule.pattern.slice(0, -1));
    })
    .filter((rule) => rule.headers.has(name));
  // Longest (most specific) pattern last, so it takes precedence.
  const winner = matches.sort((a, b) => a.pattern.length - b.pattern.length).at(-1);
  return winner?.headers.get(name);
}

const IMMUTABLE = "public, max-age=31536000, immutable";

describe("public/_headers caching", () => {
  // Real paths from an `npx expo export -p web` run. Every filename carries an
  // MD5 of its own contents, so a changed file is always a changed URL.
  it.each([
    ["the entry bundle", "/_expo/static/js/web/index-cc448bf983ad0edd46be825ce8b166d1.js"],
    ["the stylesheet", "/_expo/static/css/web-26b16bac3dc6b0e59b5fce302f6e46d9.css"],
    ["fonts and images", "/assets/assets/icon.415df6c5c4ff865daca6ab65d882a80a.png"],
  ])("caches %s immutably", (_label, path) => {
    expect(headerFor(path, "cache-control")).toBe(IMMUTABLE);
  });

  it("does not cache the service worker, which keeps a stable filename", () => {
    expect(headerFor("/selftend-push-worker.js", "cache-control")).toBe("no-cache");
  });

  it("carries no rule for /index.html, a path that only ever 307s to /", () => {
    expect(rules.map((rule) => rule.pattern)).not.toContain("/index.html");
  });

  it("leaves the HTML shell to revalidate by default on every route", () => {
    // A rule on "/" would cover only the root, never the SPA fallback that
    // serves the same shell for /journal, /settings/..., and friends - so
    // pinning one here would be misleading rather than useful.
    for (const path of ["/", "/journal", "/settings/about"]) {
      expect(headerFor(path, "cache-control")).toBeUndefined();
    }
  });

  it("still applies the security headers to every path", () => {
    expect(headerFor("/journal", "content-security-policy")).toContain("default-src 'self'");
    expect(headerFor("/journal", "x-frame-options")).toBe("DENY");
  });
});
