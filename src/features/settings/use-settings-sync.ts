import { useEffect, useRef } from "react";

import { mergeUserPreferences, type UserPreferences } from "@/src/features/modules/types";
import { useUpdateUserPreferences } from "@/src/features/settings/queries";
import { supportedLanguages, type SupportedLanguage } from "@/src/i18n";
import { useLanguage } from "@/src/providers/i18n-provider";
import { isThemePreference, useThemeStore } from "@/src/stores/theme-store";

function isSupportedLanguage(value: string | null | undefined): value is SupportedLanguage {
  return Boolean(value) && (supportedLanguages as readonly string[]).includes(value as string);
}

export function useSettingsSync(userId: string | null, preferences: UserPreferences | undefined) {
  const { language, setLanguage, hydrated } = useLanguage();
  const themePreference = useThemeStore((s) => s.preference);
  const setThemePreference = useThemeStore((s) => s.setPreference);
  const { mutate: updatePreferences } = useUpdateUserPreferences(userId);
  // Track WHICH user was synced, not just whether a sync happened: on account switch
  // (sign out → sign in a different user without remounting this long-lived hook) the
  // initial DB-pull must run again, otherwise the previous user's local theme/language
  // gets pushed onto the new account.
  const syncedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!preferences || !userId || !hydrated) return;

    if (syncedUserId.current !== userId) {
      syncedUserId.current = userId;

      const dbLang = isSupportedLanguage(preferences.language) ? preferences.language : null;
      const dbTheme = isThemePreference(preferences.theme) ? preferences.theme : null;

      const needsLangUpdate = dbLang !== null && dbLang !== language;
      const needsThemeUpdate = dbTheme !== null && dbTheme !== themePreference;

      if (needsLangUpdate) void setLanguage(dbLang);
      if (needsThemeUpdate) setThemePreference(dbTheme);

      // Return early to let state updates settle before considering a push.
      if (needsLangUpdate || needsThemeUpdate) return;
    }

    if (language !== preferences.language || themePreference !== preferences.theme) {
      updatePreferences(mergeUserPreferences(preferences, { language, theme: themePreference }));
    }
  }, [
    hydrated,
    language,
    themePreference,
    preferences,
    userId,
    setLanguage,
    setThemePreference,
    updatePreferences,
  ]);
}
