import * as Linking from "expo-linking";
import { router } from "expo-router";
import { Platform, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { SettingsSectionCard } from "@/src/features/settings/components/settings-section-card";
import { appEnv } from "@/src/lib/env";

/** Support section: support/legal/cookies[web]/github links. Extracted verbatim. */
export function SupportCard() {
  const { t } = useTranslation("settings");

  return (
    <SettingsSectionCard
      icon="help-outline"
      iconClassName="text-aqua"
      badgeClassName="bg-[hsl(var(--aqua)/0.10)]"
      title={t("support.title")}
    >
      <View className="gap-3">
        <Button variant="outline" className="justify-start" onPress={() => router.push("/support")}>
          <Icon name="support-agent" size={18} />
          <Text className="flex-1">{t("support.openSupport")}</Text>
          <Icon name="chevron-right" size={18} className="text-muted-foreground" />
        </Button>
        <Button variant="outline" className="justify-start" onPress={() => router.push("/legal")}>
          <Icon name="gavel" size={18} />
          <Text className="flex-1">{t("support.openLegal")}</Text>
          <Icon name="chevron-right" size={18} className="text-muted-foreground" />
        </Button>
        {Platform.OS === "web" ? (
          <Button
            variant="outline"
            className="justify-start"
            onPress={() => router.push("/cookies")}
          >
            <Icon name="cookie" size={18} />
            <Text className="flex-1">{t("support.cookiePreferences")}</Text>
            <Icon name="chevron-right" size={18} className="text-muted-foreground" />
          </Button>
        ) : null}
        <Button
          variant="ghost"
          className="justify-start"
          onPress={() => void Linking.openURL(appEnv.githubRepoUrl)}
        >
          <Icon name="code" size={18} />
          <Text className="flex-1">{t("support.openGithub")}</Text>
        </Button>
      </View>
    </SettingsSectionCard>
  );
}
