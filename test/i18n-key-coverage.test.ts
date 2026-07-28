// test/i18n-key-coverage.test.ts
//
// Scans app/ and src/ for t("...") string-literal translation keys and asserts
// every one resolves in the en locale. Dynamic keys (template literals) are
// invisible to this guard - surfaces built on them need their own content tests
// (see test/cbt-dispute-prompts.test.ts).
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const LOCALE_DIR = path.join(ROOT, "src", "i18n", "locales", "en");

function flattenKeys(obj: Record<string, unknown>, prefix: string, into: Set<string>) {
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      flattenKeys(value as Record<string, unknown>, full, into);
    } else {
      into.add(full);
    }
  }
}

function loadNamespaces(): Map<string, Set<string>> {
  const namespaces = new Map<string, Set<string>>();
  for (const file of fs.readdirSync(LOCALE_DIR)) {
    if (!file.endsWith(".json")) continue;
    const ns = file.replace(/\.json$/, "");
    const keys = new Set<string>();
    flattenKeys(JSON.parse(fs.readFileSync(path.join(LOCALE_DIR, file), "utf8")), "", keys);
    namespaces.set(ns, keys);
  }
  return namespaces;
}

function collectSourceFiles(dir: string, into: string[]) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(full, into);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name) && !/\.(test|spec)\./.test(entry.name)) {
      into.push(full);
    }
  }
}

function hasKey(namespaces: Map<string, Set<string>>, ns: string, key: string): boolean {
  const keys = namespaces.get(ns);
  if (!keys) return false;
  return keys.has(key) || keys.has(`${key}_one`) || keys.has(`${key}_other`);
}

test("every t() string-literal key resolves in the en locale", () => {
  const namespaces = loadNamespaces();
  const files: string[] = [];
  collectSourceFiles(path.join(ROOT, "app"), files);
  collectSourceFiles(path.join(ROOT, "src"), files);

  const missing: string[] = [];
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    const fileNamespaces = [...source.matchAll(/useTranslation\(\s*"([^"]+)"\s*\)/g)].map(
      (m) => m[1],
    );
    // i18n.t("ns:key") direct calls (non-component code).
    for (const match of source.matchAll(/i18n\.t\(\s*"([^":]+):([^"]+)"/g)) {
      const [, ns, key] = match;
      if (namespaces.has(ns) && !hasKey(namespaces, ns, key)) {
        missing.push(`${path.relative(ROOT, file)}: ${ns}:${key}`);
      }
    }
    // The optional second capture is the literal options object, if the call has one, so
    // an explicit `t("key", { ns: "common" })` is checked against the namespace it names
    // rather than the file's. Shared helpers that take a caller's `t` rely on that
    // override (see src/utils/relative-time.ts), and they have no useTranslation() of
    // their own for the file-level inference below to find.
    for (const match of source.matchAll(/[^\w.]t\(\s*"([^"]+)"\s*(?:,\s*\{([^}]*)\})?/g)) {
      const key = match[1];
      const explicitNs = match[2]?.match(/\bns:\s*"([^"]+)"/)?.[1];
      // An explicit `{ ns: "..." }` names a namespace outright, so an unknown one is a
      // typo rather than something this scan cannot see - `{ ns: "commmon" }` renders
      // i18next's missing-key fallback at runtime. The `namespaces.has` guard below is
      // for the `"ns:key"` spelling, where a colon in the key is not necessarily a
      // namespace; it must not swallow this case, or the branch that exists to check
      // shared helpers passes them all.
      if (explicitNs && !namespaces.has(explicitNs)) {
        missing.push(`${path.relative(ROOT, file)}: unknown namespace "${explicitNs}" for ${key}`);
        continue;
      }
      if (key.includes(":") || explicitNs) {
        const [ns, bare] = key.includes(":") ? key.split(":") : [explicitNs as string, key];
        if (namespaces.has(ns) && !hasKey(namespaces, ns, bare)) {
          missing.push(`${path.relative(ROOT, file)}: ${ns}:${bare}`);
        }
        continue;
      }
      if (fileNamespaces.length === 0) continue;
      if (!fileNamespaces.some((ns) => hasKey(namespaces, ns, key))) {
        missing.push(`${path.relative(ROOT, file)}: [${fileNamespaces.join(",")}] ${key}`);
      }
    }
  }

  expect(missing).toEqual([]);
});
