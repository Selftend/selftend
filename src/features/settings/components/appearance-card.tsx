import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { StylePicker } from "@/src/components/app/style-picker";
import { Text } from "@/src/components/react-native-reusables/text";
import { SettingsSectionCard } from "@/src/features/settings/components/settings-section-card";

/**
 * Settings' entry to the theme control (#583).
 *
 * It renders the SAME `<StylePicker />` the user menu does, rather than a
 * second implementation of the same grid — the spec's "a row that opens the
 * same control, not a copy". A copy is how two surfaces end up disagreeing
 * about which palette is selected.
 */
export function AppearanceCard() {
  const { t } = useTranslation("settings");

  return (
    <SettingsSectionCard
      icon="palette"
      // The app accent rather than a module hue: this card is chrome, and the
      // neutral retreat (#558) takes module hues out of chrome entirely. Picking
      // one here would only be something #586-#588 has to come back and remove.
      iconClassName="text-primary"
      badgeClassName="bg-[hsl(var(--primary)/0.10)]"
      title={t("appearance.title")}
    >
      <View className="gap-3">
        <Text className="text-sm text-muted-foreground">{t("appearance.description")}</Text>
        <StylePicker />
      </View>
    </SettingsSectionCard>
  );
}
