import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";
import { appEnv } from "@/src/lib/env";
import { openExternalUrl } from "@/src/lib/linking";

/**
 * Privacy-promise landing section: states the privacy stance in plain
 * language, then backs the claim with a link straight to the source so it's
 * checkable rather than just asserted. Single centered column, matching the
 * hero's body-copy treatment (same max width, size, and line height) so this
 * reads as the hero's closing note rather than a new visual register.
 */
export function PrivacySection() {
  const { t } = useTranslation("auth");

  return (
    <View className="items-center gap-6">
      <View className="gap-3">
        <Text variant="h2" className="text-center text-2xl sm:text-3xl">
          {t("landingPage.privacyTitle")}
        </Text>
        <Text className="mx-auto max-w-xl text-center text-base leading-[1.55] text-muted-foreground sm:text-lg">
          {t("landingPage.privacyBody")}
        </Text>
      </View>
      <Button variant="outline" onPress={() => openExternalUrl(appEnv.githubRepoUrl)}>
        <Text>{t("landingPage.viewSource")}</Text>
      </Button>
    </View>
  );
}
