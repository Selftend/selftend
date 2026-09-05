// test/no-unshipped-status-copy.test.ts
//
// The module and navigation surfaces must not announce functionality the binary
// does not ship (#1020).
//
// Apple rejected build 6 under Guideline 2.1 *App Completeness*. Nothing in the
// letter named a defect, and the single most plausible thing a reviewer pointed
// at was the DBT nav entry: a module badged "Soon", over a screen headed "On the
// roadmap". A copy change could not reach the build under review, so the reply
// pre-empted it and this guard keeps the next one clean.
//
// SCOPE IS DERIVED, NOT SUPPRESSED. This guard walks the surfaces above and
// nothing else, so a sibling namespace is out of range by construction rather
// than by exemption - a suppression list here would have exempted every future
// sibling too.
//
// The one string that used to need explaining, `getTheApp.comingSoon`, is gone:
// both apps are published, the store URLs default to the live listings, and a
// build with no store URL now drops the surface instead of promising it. The
// store surfaces keep their own `queryByText(/coming soon/i)` assertions.
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const LANGUAGES = ["en", "bg"] as const;

function readNamespace(language: string, namespace: string): Record<string, unknown> {
  const file = path.join(ROOT, "src", "i18n", "locales", language, `${namespace}.json`);
  return JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
}

/**
 * The surfaces that tell a user - or a reviewer - what the app contains: the
 * nav rows, the `/modules` index and its tiles, and the DBT module's own
 * namespace (which absorbed the overview screen's copy under #1980).
 */
function surfaceStrings(language: string): { key: string; value: string }[] {
  const navigation = readNamespace(language, "navigation") as {
    sidebar: unknown;
    modulesPage: unknown;
    today: { modules: unknown };
  };

  const roots: Record<string, unknown> = {
    "navigation.sidebar": navigation.sidebar,
    "navigation.modulesPage": navigation.modulesPage,
    "navigation.today.modules": navigation.today.modules,
    dbt: readNamespace(language, "dbt"),
  };

  const out: { key: string; value: string }[] = [];
  const walk = (node: unknown, prefix: string): void => {
    if (typeof node === "string") {
      out.push({ key: prefix, value: node });
      return;
    }
    if (node && typeof node === "object") {
      for (const [key, value] of Object.entries(node)) {
        walk(value, `${prefix}.${key}`);
      }
    }
  };
  for (const [prefix, node] of Object.entries(roots)) walk(node, prefix);
  return out;
}

// Both locales, because a Bulgarian reviewer reads the Bulgarian build. The
// Cyrillic terms are the ones this sweep actually removed - "Скоро", "В пътната
// карта", "В процес на дизайн", "очаквайте скоро", "следващото голямо издание" -
// so each pattern is evidenced by a string that really shipped, not guessed at.
const UNSHIPPED_STATUS: Record<(typeof LANGUAGES)[number], RegExp[]> = {
  en: [/coming soon/i, /\bsoon\b/i, /on the roadmap/i, /\bin design\b/i, /next major release/i],
  bg: [/скоро/i, /пътнат?а карта/i, /процес на дизайн/i, /следващото голямо издание/i],
};

describe("module and navigation copy promises nothing the build does not ship", () => {
  it.each(LANGUAGES)("%s carries no unshipped-status wording", (language) => {
    const offenders = surfaceStrings(language)
      .filter(({ value }) => UNSHIPPED_STATUS[language].some((pattern) => pattern.test(value)))
      .map(({ key, value }) => `${key}: ${value}`);

    expect(offenders).toEqual([]);
  });

  // A guard that only reads copy would pass if someone re-added the chip with
  // fresh wording. These are the two key sets the chips were driven by: the
  // sidebar's badge keys are gone outright, and `modulesPage.stats` now holds
  // exactly one value, the one the DBT tile uses to say what it is.
  it.each(LANGUAGES)("%s has no sidebar status-badge keys left", (language) => {
    const sidebar = readNamespace(language, "navigation").sidebar as Record<string, unknown>;

    expect(Object.keys(sidebar).filter((key) => key.startsWith("badge"))).toEqual([]);
  });

  // The module tile's footer went with #1887's one card (#1955): its sole occupant was
  // the neutral "Overview", and a status has no slot to come back to. So the key set is
  // asserted absent as a whole — a `stats` object reappearing here, under any wording,
  // is the chip's slot being rebuilt.
  it.each(LANGUAGES)("%s offers no module-tile status at all", (language) => {
    const modulesPage = readNamespace(language, "navigation").modulesPage as Record<
      string,
      unknown
    >;

    expect(modulesPage.stats).toBeUndefined();
  });

  it("both locales carry the same module-surface keys", () => {
    const [en, bg] = LANGUAGES.map((language) => surfaceStrings(language).map(({ key }) => key));

    expect(bg).toEqual(en);
  });
});
