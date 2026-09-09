import type { TFunction } from "i18next";

/**
 * Reads structured content stored as a JSON array of strings (AGENTS.md
 * § i18n conventions: steps, hints, cautions are arrays read with
 * `returnObjects`, never assembled from numbered keys). A key that names no
 * array — missing in the locale, or a plain string — yields `[]`, so a
 * technique without a caution passes its absent copy straight through.
 */
export function translatedLines(t: TFunction<string>, key: string): string[] {
  const list = t(key, { returnObjects: true });
  return Array.isArray(list) ? (list as string[]) : [];
}
