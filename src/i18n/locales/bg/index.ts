// Barrel for the Bulgarian locale so it can be loaded as a single dynamic import()
// (deferred out of the startup path) rather than eagerly inlined into the initial bundle.
import bgCommon from "./common.json";
import bgAuth from "./auth.json";
import bgCbt from "./cbt.json";
import bgGratitude from "./gratitude.json";
import bgJournal from "./journal.json";
import bgMeditation from "./meditation.json";
import bgTimer from "./timer.json";
import bgMood from "./mood.json";
import bgModules from "./modules.json";
import bgSettings from "./settings.json";
import bgNavigation from "./navigation.json";
import bgPolicies from "./policies.json";
import bgErrors from "./errors.json";
import bgSleep from "./sleep.json";
import bgHabits from "./habits.json";
import bgAct from "./act.json";
import bgNotifications from "./notifications.json";
import bgHelp from "./help.json";

export const bgResources: Record<string, object> = {
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
  sleep: bgSleep,
  habits: bgHabits,
  act: bgAct,
  notifications: bgNotifications,
  help: bgHelp,
};
