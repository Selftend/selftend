import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";
import { appEnv } from "@/src/lib/env";
import { openExternalUrl } from "@/src/lib/linking";

/**
 * Landing page footer: the same full safety disclaimer and crisis/terms/
 * privacy/cookies link row as `AuthLandingBlock` (the auth screen's version
 * of this notice), extended with FAQ and, when configured, Discord.
 *
 * Deliberately the quietest thing on the page: a hairline top border sets it
 * off as closing material rather than another pitch, and the tighter gap (3,
 * vs. the 6-8 used by content sections above) keeps it from competing for
 * attention. Link buttons wrap so the row never forces horizontal scroll on
 * narrow screens.
 */
export function LandingFooter() {
  const { t } = useTranslation(["auth", "common", "policies", "navigation"]);

  return (
    <View className="items-center gap-3 border-t border-border pt-8">
      <Text className="max-w-xl text-center text-xs leading-[1.55] text-muted-foreground">
        {t("common:safety.description")}
      </Text>
      <View className="flex-row flex-wrap items-center justify-center">
        <Button onPress={() => router.push("/crisis")} variant="link" size="sm">
          <Text className="text-xs">{t("common:safety.openCrisis")}</Text>
        </Button>
        <Button onPress={() => router.push("/terms")} variant="link" size="sm">
          <Text className="text-xs">{t("policies:terms.pageTitle")}</Text>
        </Button>
        <Button onPress={() => router.push("/privacy")} variant="link" size="sm">
          <Text className="text-xs">{t("policies:privacy.pageTitle")}</Text>
        </Button>
        <Button onPress={() => router.push("/cookies")} variant="link" size="sm">
          <Text className="text-xs">{t("policies:cookies.pageTitle")}</Text>
        </Button>
        <Button onPress={() => router.push("/faq")} variant="link" size="sm">
          <Text className="text-xs">{t("auth:landingPage.footerFaq")}</Text>
        </Button>
        {appEnv.discordUrl ? (
          <Button onPress={() => openExternalUrl(appEnv.discordUrl)} variant="link" size="sm">
            <Text className="text-xs">{t("navigation:header.joinDiscord")}</Text>
          </Button>
        ) : null}
      </View>
    </View>
  );
}
