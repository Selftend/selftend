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

import bgCommon from "./locales/bg/common.json";
import bgAuth from "./locales/bg/auth.json";
import bgCbt from "./locales/bg/cbt.json";
import bgGratitude from "./locales/bg/gratitude.json";
import bgJournal from "./locales/bg/journal.json";
import bgMeditation from "./locales/bg/meditation.json";
import bgTimer from "./locales/bg/timer.json";
import bgMood from "./locales/bg/mood.json";
import bgModules from "./locales/bg/modules.json";
import bgSettings from "./locales/bg/settings.json";
import bgNavigation from "./locales/bg/navigation.json";
import bgPolicies from "./locales/bg/policies.json";
import bgErrors from "./locales/bg/errors.json";

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
    },
    bg: {
      common: bgCommon,
      auth: bgAuth,
      cbt: bgCbt,
      gratitude: bgGratitude,
      journal: bgJournal,
      meditation: bgMeditation,
      timer: bgTimer,
      mood: bgMood,
      modules: bgModules,
      settings: bgSettings,
      navigation: bgNavigation,
      policies: bgPolicies,
      errors: bgErrors,
    },
  },
});

export default i18n;
