import { MoonIcon, SunIcon } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { Icon } from "@/components/ui/icon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  type Option,
} from "@/components/ui/select";
import { resolveThemePreference, useSystemColorScheme } from "@/src/lib/color-scheme";
import { useThemeStore, type ThemePreference } from "@/src/stores/theme-store";

const PREFERENCES: ThemePreference[] = ["system", "light", "dark"];

function isThemePreference(value: string): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function ThemeToggle() {
  const { t } = useTranslation("navigation");
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);
  const systemColorScheme = useSystemColorScheme();
  const resolved = resolveThemePreference(preference, systemColorScheme);
  const isDark = resolved === "dark";

  const currentOption: Option = {
    value: preference,
    label: t(`themeToggle.${preference}`),
  };

  function handleChange(option: Option | undefined) {
    if (option && isThemePreference(option.value)) {
      setPreference(option.value);
    }
  }

  return (
    <Select value={currentOption} onValueChange={handleChange}>
      <SelectTrigger
        size="sm"
        accessibilityLabel={t("themeToggle.toggle")}
        aria-valuetext={t(`themeToggle.${preference}`)}
        className="min-w-0 w-auto gap-1 px-2"
      >
        <Icon as={isDark ? MoonIcon : SunIcon} className="size-4 text-foreground" />
      </SelectTrigger>
      <SelectContent side="bottom" align="end">
        {PREFERENCES.map((value) => (
          <SelectItem key={value} value={value} label={t(`themeToggle.${value}`)}>
            {t(`themeToggle.${value}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
