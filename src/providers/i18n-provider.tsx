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

const LANGUAGE_STORAGE_KEY = "selftend:language";

interface I18nContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  /** True after the AsyncStorage hydration step has completed. */
  hydrated: boolean;
}

const I18nContext = createContext<I18nContextValue>({
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
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then(async (stored) => {
        if (!mounted) return;
        if (stored && supportedLanguages.includes(stored as SupportedLanguage)) {
          const lang = stored as SupportedLanguage;
          // Ensure the (lazily-loaded) bundle is registered before switching.
          await ensureLanguageBundle(lang);
          if (!mounted) return;
          setLanguageState(lang);
          void i18n.changeLanguage(lang);
        }
      })
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
