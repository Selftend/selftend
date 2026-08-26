import fs from "fs";
import path from "path";

/**
 * Every translated string in the repo, flattened to `namespace:dotted.key`, for the
 * guards that police copy rather than code.
 *
 * Read off disk rather than imported, so a namespace added tomorrow is covered by
 * every one of those guards the day its file lands - the property `restraint-copy`
 * was written for after a namespace-scoped version of it had been wrong twice, and
 * the one `show-all-door-copy` relies on to cover a module that has not adopted the
 * door pattern yet.
 */
export type Locale = "en" | "bg";

export interface LocaleString {
  namespace: string;
  /** Dotted path within the namespace, with `[n]` for array members. */
  key: string;
  text: string;
}

/** Every leaf string in a namespace, keyed by its dotted path. */
export function flatten(value: unknown, prefix = ""): [string, string][] {
  if (typeof value === "string") return [[prefix, value]];
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => flatten(item, `${prefix}[${i}]`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      flatten(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [];
}

/** Read the namespaces off disk so a newly-added one is covered without an import. */
export function loadLocale(locale: Locale): LocaleString[] {
  const dir = path.join(__dirname, "..", "src", "i18n", "locales", locale);
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .flatMap((file) => {
      const namespace = file.replace(/\.json$/, "");
      const parsed = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
      return flatten(parsed).map(([key, text]) => ({ namespace, key, text }));
    });
}

/** Both shipped locales, loaded once per suite. */
export const LOCALE_STRINGS: Record<Locale, LocaleString[]> = {
  en: loadLocale("en"),
  bg: loadLocale("bg"),
};
