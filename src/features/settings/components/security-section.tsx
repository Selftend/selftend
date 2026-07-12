import { router } from "expo-router";
import { Platform, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Switch } from "@/src/components/react-native-reusables/switch";
import { Text } from "@/src/components/react-native-reusables/text";
import { SettingsSectionCard } from "@/src/features/settings/components/settings-section-card";
import { useAppLock } from "@/src/features/settings/use-app-lock";

export function SecuritySection() {
  const { t } = useTranslation("settings");
  const { enabled, available, canToggle, toggle } = useAppLock();

  // Native-only: the app lock never appears on web (which relies on browser session + logout).
  if (Platform.OS === "web") {
    return null;
  }

  return (
    <SettingsSectionCard
      icon="shield"
      iconClassName="text-iris"
      badgeClassName="bg-[hsl(var(--iris)/0.10)]"
      title={t("security.title")}
      description={t("security.description")}
    >
      <View className="gap-3">
        <View className="flex-row items-center gap-3 rounded-xl border border-border p-3">
          <View className="flex-1 min-w-0">
            <Text className="text-sm font-semibold">{t("security.appLock")}</Text>
            <Text className="mt-1 text-xs leading-snug text-muted-foreground">
              {available === false
                ? t("security.appLockUnavailable")
                : t("security.appLockDescription")}
            </Text>
          </View>
          <Switch
            accessibilityLabel={t("security.appLock")}
            checked={enabled}
            disabled={!canToggle}
            onCheckedChange={(next) => void toggle(next)}
          />
        </View>

        <Button
          variant="outline"
          className="justify-start"
          onPress={() => router.push("/security")}
        >
          <Icon name="lock" size={18} />
          <Text className="flex-1">{t("security.openSecurity")}</Text>
          <Icon name="chevron-right" size={18} className="text-muted-foreground" />
        </Button>
      </View>
    </SettingsSectionCard>
  );
}
