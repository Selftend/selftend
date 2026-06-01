import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "./locales/en/common.json";
import enAuth from "./locales/en/auth.json";
import enCbt from "./locales/en/cbt.json";
import enGratitude from "./locales/en/gratitude.json";
import enJournal from "./locales/en/journal.json";
import enMeditation from "./locales/en/meditation.json";
import enTimer from "./locales/en/timer.json";
import enMood from "./locales/en/mood.json";
import enModules from "./locales/en/modules.json";
import enSettings from "./locales/en/settings.json";
import enNavigation from "./locales/en/navigation.json";
import enPolicies from "./locales/en/policies.json";
import enErrors from "./locales/en/errors.json";
import enSleep from "./locales/en/sleep.json";
import enHabits from "./locales/en/habits.json";
import enAct from "./locales/en/act.json";
import enNotifications from "./locales/en/notifications.json";
import enHelp from "./locales/en/help.json";

export const supportedLanguages = ["en", "bg"] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

// eslint-disable-next-line import/no-named-as-default-member
i18n.use(initReactI18next).init({
  fallbackLng: "en",
  defaultNS: "common",
  ns: [
    "common",
    "auth",
    "cbt",
    "gratitude",
    "journal",
    "meditation",
    "timer",
    "mood",
    "modules",
    "settings",
    "navigation",
    "policies",
    "errors",
    "sleep",
    "habits",
    "act",
    "notifications",
    "help",
  ],
  interpolation: { escapeValue: false },
  resources: {
    en: {
      common: enCommon,
      auth: enAuth,
      cbt: enCbt,
      gratitude: enGratitude,
      journal: enJournal,
      meditation: enMeditation,
      timer: enTimer,
      mood: enMood,
      modules: enModules,
      settings: enSettings,
      navigation: enNavigation,
      policies: enPolicies,
      errors: enErrors,
      sleep: enSleep,
      habits: enHabits,
      act: enAct,
      notifications: enNotifications,
      help: enHelp,
    },
    // bg is registered lazily via ensureLanguageBundle() so its ~377 KB of JSON is not
    // parsed/inlined on the startup path for the majority-English audience.
  },
});

const loadedBundles = new Set<SupportedLanguage>(["en"]);

// Ensure a language's resource bundles are registered before switching to it. en is always
// present; bg is fetched as a single dynamic import the first time it's needed.
export async function ensureLanguageBundle(lang: SupportedLanguage): Promise<void> {
  if (loadedBundles.has(lang)) return;

  if (lang === "bg") {
    const { bgResources } = await import("./locales/bg");
    for (const ns of Object.keys(bgResources)) {
      if (!i18n.hasResourceBundle("bg", ns)) {
        i18n.addResourceBundle("bg", ns, bgResources[ns], true, true);
      }
    }
  }

  loadedBundles.add(lang);
}

export default i18n;
