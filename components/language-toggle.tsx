import { useTranslation } from "react-i18next";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type Option,
} from "@/components/ui/select";
import { supportedLanguages, type SupportedLanguage } from "@/src/i18n";
import { useLanguage } from "@/src/providers/i18n-provider";

export function LanguageToggle() {
  const { t } = useTranslation("navigation");
  const { language, setLanguage } = useLanguage();

  const currentOption: Option = {
    value: language,
    label: t(`languageToggle.${language}`),
  };

  function handleChange(option: Option | undefined) {
    if (
      option &&
      supportedLanguages.includes(option.value as SupportedLanguage)
    ) {
      void setLanguage(option.value as SupportedLanguage);
    }
  }

  return (
    <Select value={currentOption} onValueChange={handleChange}>
      <SelectTrigger
        size="sm"
        accessibilityLabel={t("languageToggle.toggle")}
        className="min-w-0 w-auto gap-1 px-2"
      >
        <SelectValue placeholder={t("languageToggle.toggle")} />
      </SelectTrigger>
      <SelectContent side="bottom" align="end">
        {supportedLanguages.map((code) => (
          <SelectItem key={code} value={code} label={t(`languageToggle.${code}`)}>
            {t(`languageToggle.${code}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
