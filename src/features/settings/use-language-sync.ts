import { useEffect, useRef } from "react";

import { mergeUserPreferences, type UserPreferences } from "@/src/features/modules/types";
import { useUpdateUserPreferences } from "@/src/features/settings/queries";
import { supportedLanguages, type SupportedLanguage } from "@/src/i18n";
import { useLanguage } from "@/src/providers/i18n-provider";

function isSupportedLanguage(value: string | null | undefined): value is SupportedLanguage {
  return Boolean(value) && (supportedLanguages as readonly string[]).includes(value as string);
}

export function useLanguageSync(userId: string | null, preferences: UserPreferences | undefined) {
  const { language, setLanguage, hydrated, hasStoredLanguage } = useLanguage();
  const { mutate: updatePreferences } = useUpdateUserPreferences(userId);
  const initialPullDone = useRef(false);

  useEffect(() => {
    if (!preferences || !userId || !hydrated) {
      return;
    }

    if (!initialPullDone.current) {
      initialPullDone.current = true;
      // Local AsyncStorage wins on first load if it has a value — refresh must
      // preserve what the user chose. Pull from the DB only when the device
      // has no stored language (e.g. fresh install / new device sign-in).
      if (
        !hasStoredLanguage &&
        isSupportedLanguage(preferences.language) &&
        preferences.language !== language
      ) {
        void setLanguage(preferences.language);
        return;
      }
    }

    if (language !== preferences.language) {
      updatePreferences(mergeUserPreferences(preferences, { language }));
    }
  }, [hydrated, hasStoredLanguage, language, preferences, userId, setLanguage, updatePreferences]);
}
