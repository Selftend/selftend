import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import i18n, { ensureLanguageBundle, type SupportedLanguage, supportedLanguages } from "@/src/i18n";
import { detectDeviceLanguage } from "@/src/i18n/detect-language";

const LANGUAGE_STORAGE_KEY = "selftend:language";

// Records that first-run locale detection has been considered, so it happens at most
// once per install and never reconsiders a user who has since been left in English.
const LANGUAGE_DETECTED_KEY = "selftend:language:detected";

/**
 * Whether this install has no app state of ours yet.
 *
 * Device-locale detection applies to **new installs only** (#538). An existing user on a
 * Bulgarian phone who has been happily reading the English UI must not be switched out
 * from under them - and having no stored language cannot distinguish them from a fresh
 * install on its own, so we look for any other trace of prior use.
 *
 * Two key shapes count: the `selftend:` namespace and the query cache's
 * `selftend-query-cache`. Nothing writes either before this provider hydrates, so a
 * genuinely fresh install still reads as fresh.
 *
 * Known limit: on web the query cache is deliberately not persisted, so a long-standing
 * web user who never changed a single setting looks identical to a new one and will get
 * the device language. That is the safe direction to be wrong in.
 */
async function isFreshInstall(): Promise<boolean> {
  const keys = await AsyncStorage.getAllKeys();
  return !keys.some((key) => key.startsWith("selftend") && key !== LANGUAGE_DETECTED_KEY);
}

interface I18nContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  /** True after the AsyncStorage hydration step has completed. */
  hydrated: boolean;
}

export const I18nContext = createContext<I18nContextValue>({
  language: "en",
  setLanguage: async () => {},
  hydrated: false,
});

export function useLanguage() {
  return useContext(I18nContext);
}

export function I18nProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<SupportedLanguage>("en");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;

    const apply = async (lang: SupportedLanguage) => {
      // Ensure the (lazily-loaded) bundle is registered before switching.
      await ensureLanguageBundle(lang);
      if (!mounted) return;
      setLanguageState(lang);
      void i18n.changeLanguage(lang);
    };

    const hydrate = async () => {
      const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored && supportedLanguages.includes(stored as SupportedLanguage)) {
        // An explicit choice always outranks the device locale, in both directions:
        // someone who picked English on a Bulgarian phone stays in English.
        await apply(stored as SupportedLanguage);
        return;
      }

      // No stored preference. Consider the device locale once, and only on a fresh
      // install - the marker is written either way so this never runs twice.
      if (await AsyncStorage.getItem(LANGUAGE_DETECTED_KEY)) return;
      const fresh = await isFreshInstall();
      await AsyncStorage.setItem(LANGUAGE_DETECTED_KEY, "1");
      if (!fresh) return;

      const detected = detectDeviceLanguage();
      if (detected === "en") return;

      await apply(detected);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, detected);
    };

    hydrate()
      .catch(() => {
        // A failed read just keeps the default language; .finally still marks hydrated.
      })
      .finally(() => {
        if (mounted) setHydrated(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const setLanguage = useCallback(async (lang: SupportedLanguage) => {
    await ensureLanguageBundle(lang);
    setLanguageState(lang);
    await i18n.changeLanguage(lang);
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // Persisting the language is best-effort; the in-memory switch already applied.
    }
  }, []);

  // Memoize the context value so consumers (useLanguage) don't re-render on every
  // unrelated provider render from a new object/function identity.
  const value = useMemo(
    () => ({ language, setLanguage, hydrated }),
    [language, setLanguage, hydrated],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
