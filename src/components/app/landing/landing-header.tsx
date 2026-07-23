import { Image, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { LinkButton } from "@/src/components/app/link-button";
import { useAppColorScheme } from "@/src/lib/color-scheme";
import { useThemeStore } from "@/src/stores/theme-store";

/**
 * Landing page top bar: brand on the left; theme toggle plus the two auth
 * CTAs on the right. Rendered outside the page ScrollView so it stays pinned
 * while the page scrolls (the web equivalent of the design's sticky header).
 *
 * The toggle writes an explicit "light"/"dark" preference to the shared theme
 * store - the same one Settings uses - so a visitor's choice here survives
 * into the app after they sign in.
 */
export function LandingHeader() {
  const { t } = useTranslation("auth");
  const colorScheme = useAppColorScheme();
  const setPreference = useThemeStore((s) => s.setPreference);
  const nextScheme = colorScheme === "dark" ? "light" : "dark";

  return (
    <View className="flex-row items-center justify-between gap-3 border-b border-border bg-card px-4 py-2 sm:px-6">
      <View className="flex-row items-center gap-2.5">
        <Image
          source={require("../../../../assets/icon.png")}
          accessibilityLabel="Selftend"
          resizeMode="contain"
          style={{ width: 26, height: 26, borderRadius: 8 }}
        />
        <Text className="text-base font-bold tracking-tight">Selftend</Text>
      </View>
      <View className="flex-row items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          accessibilityLabel={
            nextScheme === "dark" ? t("landingPage.switchToDark") : t("landingPage.switchToLight")
          }
          onPress={() => setPreference(nextScheme)}
        >
          <Icon
            name={colorScheme === "dark" ? "light-mode" : "dark-mode"}
            size={18}
            className="text-muted-foreground"
          />
        </Button>
        <LinkButton variant="outline" size="sm" href="/(auth)/sign-in">
          <Text>{t("landingPage.signInCta")}</Text>
        </LinkButton>
        <LinkButton size="sm" href="/(auth)/sign-up">
          <Text>{t("landingPage.getStarted")}</Text>
        </LinkButton>
      </View>
    </View>
  );
}
