import { getLocales } from "expo-localization";

import { supportedLanguages, type SupportedLanguage } from "@/src/i18n";

/**
 * The device's preferred language, when we support it.
 *
 * `getLocales()` returns the user's languages ranked most-preferred first, carrying
 * region codes (`bg-BG`, `en-GB`), so we match on the language *subtag* and walk the
 * whole list rather than judging the first entry alone: a device set to
 * `de-DE, bg-BG` should land on Bulgarian, not fall back to English.
 *
 * Anything unsupported resolves to `en`.
 */
export function detectDeviceLanguage(): SupportedLanguage {
  let locales: ReturnType<typeof getLocales>;
  try {
    locales = getLocales();
  } catch {
    // Never let locale detection break startup; English is always a valid answer.
    return "en";
  }

  for (const locale of locales ?? []) {
    const subtag = (locale?.languageCode ?? locale?.languageTag?.split("-")[0] ?? "")
      .trim()
      .toLowerCase();
    if ((supportedLanguages as readonly string[]).includes(subtag)) {
      return subtag as SupportedLanguage;
    }
  }

  return "en";
}
