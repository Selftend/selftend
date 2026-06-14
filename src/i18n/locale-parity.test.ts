import fs from "fs";
import path from "path";

// Asserts the en and bg locale bundles stay structurally in sync: the same namespace
// files, and the same key paths within each (so a key added/removed in one locale but
// not the other is caught in CI). Existing, intentional translation debt is listed in
// KNOWN_GAPS - the test allows those and fails on any NEW drift. Shrink the list as gaps
// are translated. Background: docs/superpowers/audits/2026-06-03-cbt-module-audit.md.

const LOCALES_DIR = path.join(__dirname, "locales");

// Each entry is a key-path prefix: it matches that exact path or any child beneath it.
const KNOWN_GAPS: Record<string, { enOnly: string[]; bgOnly: string[] }> = {};

function leafPaths(value: unknown, prefix = ""): string[] {
  if (value !== null && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      leafPaths(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [prefix];
}

function matchesGap(prefixes: string[], leaf: string): boolean {
  return prefixes.some((prefix) => leaf === prefix || leaf.startsWith(`${prefix}.`));
}

function namespaceFiles(lang: string): string[] {
  return fs
    .readdirSync(path.join(LOCALES_DIR, lang))
    .filter((name) => name.endsWith(".json"))
    .sort();
}

function loadNamespace(lang: string, file: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, lang, file), "utf8"));
}

describe("i18n locale parity (en <-> bg)", () => {
  it("exposes the same namespace files in both locales", () => {
    expect(namespaceFiles("bg")).toEqual(namespaceFiles("en"));
  });

  it.each(namespaceFiles("en"))(
    "%s has matching key paths in en and bg (modulo documented gaps)",
    (file) => {
      const enPaths = new Set(leafPaths(loadNamespace("en", file)));
      const bgPaths = new Set(leafPaths(loadNamespace("bg", file)));
      const gaps = KNOWN_GAPS[file] ?? { enOnly: [], bgOnly: [] };

      const enOnly = [...enPaths].filter((p) => !bgPaths.has(p) && !matchesGap(gaps.enOnly, p));
      const bgOnly = [...bgPaths].filter((p) => !enPaths.has(p) && !matchesGap(gaps.bgOnly, p));

      expect({ file, enOnly, bgOnly }).toEqual({ file, enOnly: [], bgOnly: [] });
    },
  );
});
