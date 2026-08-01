import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { SettingsSectionCard } from "@/src/features/settings/components/settings-section-card";

/** Reminders section. Extracted verbatim from the screen. */
export function RemindersCard() {
  const { t } = useTranslation("settings");

  return (
    <SettingsSectionCard
      icon="notifications-active"
      iconClassName="text-muted-foreground"
      badgeClassName="bg-muted"
      title={t("reminders.title")}
      description={t("reminders.description")}
    >
      <Button
        variant="outline"
        className="justify-start"
        onPress={() => router.push("/notifications")}
      >
        <Icon name="tune" size={18} />
        <Text className="flex-1">{t("reminders.openNotifications")}</Text>
        <Icon name="chevron-right" size={18} className="text-muted-foreground" />
      </Button>
    </SettingsSectionCard>
  );
}
