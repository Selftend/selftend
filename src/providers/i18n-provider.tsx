import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import i18n, { type SupportedLanguage, supportedLanguages } from "@/src/i18n";

const LANGUAGE_STORAGE_KEY = "selftend:language";

interface I18nContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  /** True after the AsyncStorage hydration step has completed. */
  hydrated: boolean;
  /** True if AsyncStorage held a stored language at hydration time. */
  hasStoredLanguage: boolean;
}

const I18nContext = createContext<I18nContextValue>({
  language: "en",
  setLanguage: async () => {},
  hydrated: false,
  hasStoredLanguage: false,
});

export function useLanguage() {
  return useContext(I18nContext);
}

export function I18nProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<SupportedLanguage>("en");
  const [hydrated, setHydrated] = useState(false);
  const [hasStoredLanguage, setHasStoredLanguage] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then((stored) => {
        if (!mounted) return;
        if (stored && supportedLanguages.includes(stored as SupportedLanguage)) {
          const lang = stored as SupportedLanguage;
          setLanguageState(lang);
          void i18n.changeLanguage(lang);
          setHasStoredLanguage(true);
        }
      })
      .finally(() => {
        if (mounted) setHydrated(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const setLanguage = async (lang: SupportedLanguage) => {
    setLanguageState(lang);
    await i18n.changeLanguage(lang);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    setHasStoredLanguage(true);
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, hydrated, hasStoredLanguage }}>
      {children}
    </I18nContext.Provider>
  );
}
