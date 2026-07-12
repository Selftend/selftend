import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";

/**
 * Settings hero: eyebrow + title + intro. Extracted verbatim from the screen.
 */
export function SettingsHero() {
  const { t } = useTranslation("settings");

  return (
    <View className="mt-2">
      <Text variant="eyebrow">{t("account.eyebrow")}</Text>
      <Text variant="h1" className="mt-2 text-[36px] font-extrabold leading-[1.1] tracking-tight">
        {t("title")}
      </Text>
      <Text className="mt-2.5 text-[15px] leading-[1.55] text-muted-foreground max-w-[60ch]">
        {t("account.intro")}
      </Text>
    </View>
  );
}
