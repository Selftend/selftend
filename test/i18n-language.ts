import i18n, { type SupportedLanguage } from "@/src/i18n";
import { bgResources } from "@/src/i18n/locales/bg";

/**
 * Switch the app language for a test, with the target language's bundles
 * actually loaded.
 *
 * ☠️ `i18n.changeLanguage("bg")` ON ITS OWN DOES NOT GIVE YOU BULGARIAN. Only
 * `en` is registered at init - bg's ~377 KB of JSON is deferred off the startup
 * path and registered lazily by `ensureLanguageBundle()`. Change the language
 * without it and every lookup falls through `fallbackLng: "en"` and hands back
 * English, silently. A "renders in Bulgarian" assertion written against English
 * copy passes no matter what the code does, which is the worst kind of green.
 *
 * `ensureLanguageBundle()` itself cannot be reused here: it loads the barrel
 * through a dynamic `import()`, and jest runs without `--experimental-vm-modules`,
 * so calling it from a test throws "A dynamic import callback was invoked
 * without --experimental-vm-modules". This registers the same barrel statically.
 */
export async function setLanguage(language: SupportedLanguage): Promise<void> {
  if (language === "bg") {
    for (const [namespace, resources] of Object.entries(bgResources)) {
      if (!i18n.hasResourceBundle("bg", namespace)) {
        i18n.addResourceBundle("bg", namespace, resources, true, true);
      }
    }
  }

  await i18n.changeLanguage(language);
}
