import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { LinkButton } from "@/src/components/app/link-button";
import { TINT_ACCENT, TINT_TEXT, type TintToken } from "@/src/lib/design-tokens";
import { cn } from "@/lib/utils";

import { HowItWorksSection } from "./how-it-works-section";
import { LandingFooter } from "./landing-footer";
import { ModulesSection } from "./modules-section";
import { PrivacySection } from "./privacy-section";

/**
 * Signed-out web entry (`/`). Native keeps the compact `AuthLandingScreen`;
 * this is the long-form marketing page shown to web visitors instead.
 *
 * Sections render in a single vertical stack inside the centered content
 * column below. Each section is self-contained (its own `landing-*.tsx`)
 * so they can evolve independently.
 */
export default function LandingScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow">
        <View className="mx-auto w-full max-w-4xl gap-16 px-6 pb-12 pt-12 sm:gap-20 sm:pt-20">
          <LandingHero />
          <ModulesSection />
          <HowItWorksSection />
          <PrivacySection />
          <LandingFooter />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * The eight everyday tools, shown as tinted pills under the hero CTAs. Purely
 * illustrative (not links): the pills preview the app's breadth and its hue
 * system without turning the hero into a nav. Order and hues mirror the
 * signed-in dashboard so the landing page and app read as one product.
 */
const HERO_TOOLS: { key: string; icon: MaterialIconName; tint: TintToken }[] = [
  { key: "checkIn", icon: "mood", tint: "be" },
  { key: "journal", icon: "edit-note", tint: "ink" },
  { key: "breathing", icon: "air", tint: "aqua" },
  { key: "meditation", icon: "self-improvement", tint: "iris" },
  { key: "grounding", icon: "anchor", tint: "clay" },
  { key: "gratitude", icon: "favorite", tint: "think" },
  { key: "sleep", icon: "bedtime", tint: "ink" },
  { key: "habits", icon: "check-circle", tint: "act" },
];

const PILL_TINT: Record<TintToken, string> = {
  primary: "border-primary/35 bg-primary/[0.07]",
  act: "border-[hsl(var(--act)/0.35)] bg-[hsl(var(--act)/0.07)]",
  be: "border-[hsl(var(--be)/0.35)] bg-[hsl(var(--be)/0.07)]",
  think: "border-[hsl(var(--think)/0.35)] bg-[hsl(var(--think)/0.07)]",
  aqua: "border-[hsl(var(--aqua)/0.35)] bg-[hsl(var(--aqua)/0.07)]",
  iris: "border-[hsl(var(--iris)/0.35)] bg-[hsl(var(--iris)/0.07)]",
  ink: "border-[hsl(var(--ink)/0.35)] bg-[hsl(var(--ink)/0.07)]",
  clay: "border-[hsl(var(--clay)/0.35)] bg-[hsl(var(--clay)/0.07)]",
  mist: "border-[hsl(var(--mist)/0.35)] bg-[hsl(var(--mist)/0.07)]",
};

function LandingHero() {
  const { t } = useTranslation("auth");

  return (
    <View className="items-center gap-0 pt-2 sm:pt-6">
      <Text className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {t("landingPage.heroEyebrow")}
      </Text>
      <Text
        variant="h1"
        className="mt-3.5 max-w-2xl text-center text-4xl leading-[1.05] tracking-tighter sm:text-6xl"
      >
        {t("landingPage.heroHeadline")}
      </Text>
      <Text className="mt-4 max-w-xl text-center text-base leading-[1.55] text-muted-foreground sm:text-lg">
        {t("landingPage.heroSupport")}
      </Text>
      <View className="mt-8 w-full max-w-xs flex-col items-stretch gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:items-center sm:justify-center">
        <LinkButton size="lg" href="/(auth)/sign-up">
          <Text>{t("landingPage.getStarted")}</Text>
        </LinkButton>
        <LinkButton variant="outline" size="lg" href="/(auth)/sign-in">
          <Text>{t("landingPage.signInCta")}</Text>
        </LinkButton>
      </View>
      <View className="mt-11 max-w-2xl flex-row flex-wrap justify-center gap-2.5">
        {HERO_TOOLS.map(({ key, icon, tint }) => (
          <View
            key={key}
            className={cn(
              "flex-row items-center gap-2 rounded-full border px-4 py-2",
              PILL_TINT[tint],
            )}
          >
            {/* Glyph keeps the accent; the label beside it takes the ink. */}
            <Icon name={icon} size={17} className={TINT_ACCENT[tint]} />
            <Text className={cn("text-[13.5px] font-semibold", TINT_TEXT[tint])}>
              {t(`landingPage.tools.${key}`)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
