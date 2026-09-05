import { readFileSync } from "node:fs";
import { join } from "node:path";

import i18n, { supportedLanguages } from "@/src/i18n";
import { CARD_IDS } from "@/src/features/widgets/snapshot-types";
import { WIDGET_META } from "@/src/features/widgets/widget-meta";
import { setLanguage } from "@/test/i18n-language";

/**
 * The guard `test/i18n-key-coverage.test.ts` cannot be (#1952).
 *
 * That gate infers a file's namespaces from a same-file `useTranslation("…")`. The
 * launcher's copy never passes through one: `widget-config-screen.tsx` calls
 * `t(meta.titleKey)` on a key it READ off the catalogue, and `snapshot-builder.ts`
 * takes `t` as a parameter, so its 65 `home.widgets.*` references are invisible to the
 * static scan and its own unit test stubs `t` as `(k) => k`. Delete a launcher key and
 * `verify` stays green while Android users get raw key paths on their home screen.
 *
 * So this suite RESOLVES every key through the real i18next instance, in both shipped
 * locales, with the English fallback switched off per call - otherwise a missing `bg`
 * leaf would quietly answer in English and the Bulgarian half of the guard would be
 * vacuous. `bg` is registered lazily by the app, so it is pulled in through
 * `test/i18n-language.ts` (the app's own loader uses a dynamic `import()` jest cannot run).
 *
 * ⚠️ `descriptionKey` has no `t()` call site today. It is asserted anyway, on purpose:
 * it is a declared field on every entry, and a declared key that does not resolve is a
 * trap for the next reader who trusts the declaration. Do not fix a red here by
 * dropping the field from the walk.
 */

const ROOT = join(__dirname, "..", "..", "..");

/** i18next's own namespace separator; the catalogue spells a cross-namespace key `ns:path`. */
const NAMESPACE = "navigation";

/**
 * Whether `key` resolves to a non-empty string in `locale` alone. `fallbackLng: false`
 * is the whole point - without it i18next answers from `en` for a missing `bg` leaf and
 * `exists` reports true.
 */
function resolvesIn(locale: string, key: string): boolean {
  const options = { lng: locale, ns: NAMESPACE, fallbackLng: false as const, count: 1 };
  if (!i18n.exists(key, options)) return false;
  const copy = i18n.t(key, options);
  return typeof copy === "string" && copy.trim().length > 0;
}

beforeAll(async () => {
  await setLanguage("bg");
});

describe("the launcher's widget catalogue (#1952)", () => {
  it("lists exactly the catalogue's ids - the launcher renders every catalogued id", () => {
    expect([...CARD_IDS].sort()).toEqual(Object.keys(WIDGET_META).sort());
  });

  it("every card's titleKey and descriptionKey resolve in both en and bg", () => {
    const offenders = CARD_IDS.flatMap((id) =>
      supportedLanguages.flatMap((locale) =>
        (["titleKey", "descriptionKey"] as const).flatMap((field) => {
          const key = WIDGET_META[id][field];
          return resolvesIn(locale, key)
            ? []
            : [
                `${id} (${locale}): ${field} "${key}" resolves to nothing, so the launcher would render the raw key path. Restore the string in src/i18n/locales/${locale}/, or repoint the catalogue - do not drop the field from this walk.`,
              ];
        }),
      ),
    );

    // Non-vacuity gate: the id walk is the guard, so an empty walk is a broken guard.
    expect(CARD_IDS.length).toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });

  /**
   * The snapshot builder's own copy tables - the shortcut and prompt cards carry their
   * title, description and CTA keys as string literals beside the catalogue, not on
   * it. Same blind spot, same cure: every `home.widgets.*` literal in the file has to
   * resolve in both locales. `count: 1` in `resolvesIn` lets the plural-form keys
   * (`loggedSummary_one`) answer to their bare name, as they do at runtime.
   */
  it("every home.widgets.* literal in the snapshot builder resolves in both en and bg", () => {
    const source = readFileSync(join(ROOT, "src/features/widgets/snapshot-builder.ts"), "utf8");
    const keys = [...new Set([...source.matchAll(/"(home\.widgets\.[\w.]+)"/g)].map((m) => m[1]))];

    const offenders = keys.flatMap((key) =>
      supportedLanguages.flatMap((locale) =>
        resolvesIn(locale, key) ? [] : [`${key} resolves to nothing in ${locale}`],
      ),
    );

    // The file makes dozens of these references; a scan that found none is a broken regex.
    expect(keys.length).toBeGreaterThan(20);
    expect(offenders).toEqual([]);
  });
});
