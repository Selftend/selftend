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

// The header's stat run joins its items with "·" (#733), and the "last logged"
// subline is one of those items. A subline string that carries its own "·" -
// which every one of them did before #733, as `Last · {{when}}` - renders
//
//   12 entries · 3,400 words · Last · 5 Jun
//
// where two separators mean two different things and the reader cannot tell
// which. The strings were rewritten to the inline form #690 named
// ("last logged 4:50 pm"); this stops them drifting back.
//
// Scoped to the subline keys rather than all copy: a "·" is correct in plenty of
// other strings, and this suite would be noise if it flagged them.
test("no stat-run subline string carries its own separator", () => {
  const SUBLINE_KEY = /(^|\.)(stats|hero)\.(last|never)$/;
  const offenders: string[] = [];

  for (const lang of fs.readdirSync(path.join(ROOT, "src", "i18n", "locales"))) {
    const dir = path.join(ROOT, "src", "i18n", "locales", lang);
    if (!fs.statSync(dir).isDirectory()) continue;

    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith(".json")) continue;
      const json = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as Record<
        string,
        unknown
      >;
      const walk = (obj: Record<string, unknown>, prefix: string) => {
        for (const [key, value] of Object.entries(obj)) {
          const full = prefix ? `${prefix}.${key}` : key;
          if (value && typeof value === "object" && !Array.isArray(value)) {
            walk(value as Record<string, unknown>, full);
          } else if (typeof value === "string" && SUBLINE_KEY.test(full) && value.includes("·")) {
            offenders.push(`${lang}/${file}: ${full} = ${JSON.stringify(value)}`);
          }
        }
      };
      walk(json, "");
    }
  }

  expect(offenders).toEqual([]);
});

// Header stats form one inline, middle-dotted sentence. Labels and empty-state
// sublines therefore start lowercase even when their locale key is shared with
// no other surface (#828). `meditation:hero.stage` is the deliberate exception:
// it leads the row and carries the value in one phrase ("Stage 3").
test("stat-run labels do not introduce sentence case in the middle of the row", () => {
  const KEYS: Record<string, string[]> = {
    cbt: ["grounding.hero.takes", "grounding.hero.never", "breathing.overview.neverLogged"],
    gratitude: ["hero.thisWeek", "stats.never"],
    habits: ["hero.today", "stats.never"],
    journal: ["hero.never"],
    meditation: ["hero.never"],
    mood: ["stats.thisWeekLabel", "stats.avgLabel", "stats.never"],
    sleep: ["hero.avg", "hero.quality", "stats.never"],
  };
  const offenders: string[] = [];

  for (const lang of ["en", "bg"]) {
    for (const [namespace, keys] of Object.entries(KEYS)) {
      const json = JSON.parse(
        fs.readFileSync(
          path.join(ROOT, "src", "i18n", "locales", lang, `${namespace}.json`),
          "utf8",
        ),
      ) as Record<string, unknown>;

      for (const key of keys) {
        const value = key
          .split(".")
          .reduce<unknown>(
            (current, part) =>
              current && typeof current === "object"
                ? (current as Record<string, unknown>)[part]
                : undefined,
            json,
          );
        if (typeof value !== "string" || /^\p{Lu}/u.test(value)) {
          offenders.push(`${lang}/${namespace}.json: ${key} = ${JSON.stringify(value)}`);
        }
      }
    }
  }

  expect(offenders).toEqual([]);
});
