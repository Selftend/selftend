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
 * takes `t` as a parameter, so its ~95 key references (`home.widgets.*` and six other
 * families) are invisible to the static scan and its own unit test stubs `t` as
 * `(k) => k`. Delete a launcher key and `verify` stays green while Android users get
 * raw key paths on their home screen.
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

/**
 * The namespace an un-prefixed key resolves in - the one the config screen's
 * `useTranslation("navigation")` binds. A cross-namespace key spells itself `ns:path`
 * (`routines:widget.metaTitle`) and i18next honours the prefix over this default.
 */
const NAMESPACE = "navigation";

/**
 * Whether `key` resolves to a non-empty string in `locale` alone. `fallbackLng: false`
 * is the whole point - without it i18next answers from `en` for a missing `bg` leaf and
 * `exists` reports true.
 */
function resolvesIn(locale: string, key: string, namespace: string = NAMESPACE): boolean {
  const options = { lng: locale, ns: namespace, fallbackLng: false as const, count: 1 };
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
   * The snapshot builder's own copy - the shortcut and prompt cards carry their title,
   * description and CTA keys as string literals beside the catalogue, not on it, and
   * the per-card builders name their CTA labels, hints and module labels inline. Same
   * blind spot, same cure: EVERY dotted key literal in the file has to resolve in both
   * locales, in the namespace of the translator that reads it. `count: 1` in
   * `resolvesIn` lets the plural-form keys (`loggedSummary_one`, `moreGoals_one`)
   * answer to their bare name, as they do at runtime.
   *
   * ☠️ Not `home.widgets.*` only (#2208). The file also names `today.dashboard.*`,
   * `home.programWidget.*`, `plan.wizard.tool*`, `today.plan.open`,
   * `home.categories.routines` and `module.label` - 28 keys a `home.widgets` regex
   * never saw, and the builder is the ONLY production reader of most of them since
   * #1959 deleted the Home surfaces. A prune of "dead" navigation keys deletes them
   * from both locales together, `locale-parity` stays green, the static key guard
   * skips this file, and Android launchers print `today.dashboard.open` as a button.
   */
  describe("every dotted key literal in the snapshot builder", () => {
    const source = readFileSync(join(ROOT, "src/features/widgets/snapshot-builder.ts"), "utf8");

    /**
     * The namespace each translator parameter is bound to, read off the one
     * production call site (`use-widget-snapshot-sync.ts`): `t` is `navigation`,
     * `ta` is `act`, `tc` is `cbt`, and `tm` is whichever module translator
     * `buildProgrammeCard` is handed, so it must resolve in both.
     */
    const TRANSLATOR_NAMESPACES: Record<string, readonly string[]> = {
      t: ["navigation"],
      ta: ["act"],
      tc: ["cbt"],
      tm: ["act", "cbt"],
    };

    /** Every `"a.b.c"` literal - a route starts with `/`, so paths never match. */
    const literals = [
      ...new Set([...source.matchAll(/"([A-Za-z]+(?:\.[A-Za-z_]+)+)"/g)].map((m) => m[1])),
    ];

    /**
     * The one templated key: `home.widgets.${module}Programme.title`. A template is
     * invisible to the literal scan, so it is expanded by hand for both modules and
     * the template's presence is asserted, so the expansion cannot outlive it.
     */
    const templated = [...source.matchAll(/`home\.widgets\.\$\{module\}([\w.]+)`/g)].flatMap((m) =>
      ["cbt", "act"].map((module) => `home.widgets.${module}${m[1]}`),
    );

    /**
     * Which namespaces a key must resolve in: every translator it is passed to
     * directly, else `navigation` - the table keys (`titleKey`, `descKey`, `ctaKey`,
     * `promptKey`) are read by `t` alone.
     */
    function namespacesFor(key: string): string[] {
      const escaped = key.replace(/\./g, "\\.");
      const callers = [
        ...source.matchAll(new RegExp(`\\b(t|ta|tc|tm)\\(\\s*"${escaped}"`, "g")),
      ].map((m) => m[1]);
      const namespaces = new Set(callers.flatMap((caller) => TRANSLATOR_NAMESPACES[caller]));
      return namespaces.size ? [...namespaces] : ["navigation"];
    }

    it("is a scan that sees every family the file names, not just home.widgets", () => {
      // Non-vacuity, per family: a regex that quietly narrowed back to one family
      // would still clear a bare count.
      expect(literals.length).toBeGreaterThan(80);
      expect(literals).toEqual(
        expect.arrayContaining([
          "home.widgets.selfCare.title",
          "today.dashboard.open",
          "home.programWidget.notEnrolled",
          "plan.wizard.toolBreathing",
          "today.plan.open",
          "home.categories.routines",
          "module.label",
        ]),
      );
      expect(templated).toEqual(
        expect.arrayContaining([
          "home.widgets.cbtProgramme.title",
          "home.widgets.actProgramme.title",
        ]),
      );
      // And the namespace binding is read, not assumed: `module.label` is a
      // module-namespace key, never a navigation one.
      expect(namespacesFor("module.label").sort()).toEqual(["act", "cbt"]);
      expect(namespacesFor("home.widgets.selfCare.title")).toEqual(["navigation"]);
    });

    it("resolves in both en and bg, in the namespace its translator reads", () => {
      const offenders = [...literals, ...templated].flatMap((key) =>
        namespacesFor(key).flatMap((namespace) =>
          supportedLanguages.flatMap((locale) =>
            resolvesIn(locale, key, namespace)
              ? []
              : [`${namespace}:${key} resolves to nothing in ${locale}`],
          ),
        ),
      );

      expect(offenders).toEqual([]);
    });
  });
});
