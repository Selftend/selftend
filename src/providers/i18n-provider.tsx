import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import i18n, { type SupportedLanguage, supportedLanguages } from "@/src/i18n";

const LANGUAGE_STORAGE_KEY = "selftend:language";

interface I18nContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
}

const I18nContext = createContext<I18nContextValue>({
  language: "en",
  setLanguage: async () => {},
});

export function useLanguage() {
  return useContext(I18nContext);
}

export function I18nProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<SupportedLanguage>("en");

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then((stored) => {
      if (stored && supportedLanguages.includes(stored as SupportedLanguage)) {
        const lang = stored as SupportedLanguage;
        setLanguageState(lang);
        i18n.changeLanguage(lang);
      }
    });
  }, []);

  const setLanguage = useCallback(async (lang: SupportedLanguage) => {
    setLanguageState(lang);
    await i18n.changeLanguage(lang);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  }, []);

  return (
    <I18nContext.Provider value={{ language, setLanguage }}>
      {children}
    </I18nContext.Provider>
  );
}
