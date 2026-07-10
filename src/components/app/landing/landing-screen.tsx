import { Image, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { LinkButton } from "@/src/components/app/link-button";

import { HelpKindsSection } from "./help-kinds-section";
import { LandingFooter } from "./landing-footer";
import { PreviewSection } from "./preview-section";
import { PrivacySection } from "./privacy-section";

/**
 * Signed-out web entry (`/`). Native keeps the compact `AuthLandingScreen`;
 * this is the long-form marketing page shown to web visitors instead.
 *
 * Sections render in a single vertical stack inside the centered content
 * column below. Later tasks append more `<View className="gap-...">` (or
 * dedicated `landing-*-section.tsx`) siblings after `<LandingHero />` —
 * keep each section self-contained so they can be added independently.
 */
export default function LandingScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow">
        <View className="mx-auto w-full max-w-3xl gap-16 px-6 py-12 sm:py-20">
          <LandingHero />
          <HelpKindsSection />
          <PreviewSection />
          <PrivacySection />
          <LandingFooter />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function LandingHero() {
  const { t } = useTranslation("auth");

  return (
    <View className="items-center gap-6 pt-4 sm:pt-10">
      <Image
        source={require("../../../../assets/icon.png")}
        accessibilityLabel="Selftend"
        resizeMode="contain"
        style={{ width: 64, height: 64, borderRadius: 14 }}
      />
      <View className="gap-3">
        <Text variant="h1" className="text-center text-4xl leading-[1.1] sm:text-5xl">
          {t("landingPage.heroHeadline")}
        </Text>
        <Text className="mx-auto max-w-xl text-center text-base leading-[1.55] text-muted-foreground sm:text-lg">
          {t("landingPage.heroSupport")}
        </Text>
      </View>
      <View className="w-full max-w-xs flex-col items-stretch gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:items-center sm:justify-center">
        <LinkButton size="lg" href="/(auth)/sign-up">
          <Text>{t("landingPage.getStarted")}</Text>
        </LinkButton>
        <LinkButton variant="outline" size="lg" href="/(auth)/sign-in">
          <Text>{t("landingPage.signInCta")}</Text>
        </LinkButton>
      </View>
    </View>
  );
}
