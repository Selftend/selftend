import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { LinkButton } from "@/src/components/app/link-button";
import { useStartAsGuest } from "@/src/features/auth/use-start-as-guest";
import { CHROME_MARK, CHROME_RULE, CHROME_TEXT } from "@/src/lib/theme/chrome";
import { cn } from "@/lib/utils";

import { HowItWorksSection } from "./how-it-works-section";
import { AndroidDownloadBar } from "@/src/components/app/android-download-bar";
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
      {/* Public-route Android offer (#388 section 4). */}
      <AndroidDownloadBar />
    </SafeAreaView>
  );
}

/**
 * The eight everyday tools, shown as pills under the hero CTAs. Purely
 * illustrative (not links): the pills preview the app's breadth without turning
 * the hero into a nav. Order mirrors the signed-in dashboard so the landing page
 * and the app read as one product.
 *
 * They used to preview "the app's hue system" too - eight pills in seven
 * colours, mirroring the dashboard's per-tool tints. That system is gone (#587),
 * and this was one of the surfaces that made the strongest case for going: #421
 * measured nine of the ten hue labels on this very page below 4.5:1, `think` at
 * 1.80, because every label sat on a wash of its own hue. The hue was never
 * carrying the meaning here - the icon and the word were - so the pills keep
 * those and drop the tint.
 */
const HERO_TOOLS: { key: string; icon: MaterialIconName }[] = [
  { key: "checkIn", icon: "mood" },
  { key: "journal", icon: "edit-note" },
  { key: "breathing", icon: "air" },
  { key: "meditation", icon: "self-improvement" },
  { key: "grounding", icon: "anchor" },
  { key: "gratitude", icon: "favorite" },
  { key: "sleep", icon: "bedtime" },
  { key: "habits", icon: "check-circle" },
];

function LandingHero() {
  const { t } = useTranslation("auth");
  const { pending, startAsGuest } = useStartAsGuest();

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
        {/* An action, not a link (#1441): pressing it creates the guest
            session in place and the index route's session redirect carries
            the visitor in. When anonymous sign-in is off server-side it
            degrades to the sign-up form - today's behaviour. */}
        <Button size="lg" disabled={pending} onPress={() => void startAsGuest()}>
          <Text>{t("landingPage.startNow")}</Text>
        </Button>
        <LinkButton variant="outline" size="lg" href="/(auth)/sign-up">
          <Text>{t("landingPage.createAccountCta")}</Text>
        </LinkButton>
        <LinkButton variant="outline" size="lg" href="/(auth)/sign-in">
          <Text>{t("landingPage.signInCta")}</Text>
        </LinkButton>
      </View>
      {/* The durability line lives AT the CTA (spec §3): honest about what a
          guest session is before anyone leans on it. */}
      <Text variant="muted" className="mt-3 max-w-md text-center text-xs">
        {t("landingPage.guestDurability")}
      </Text>
      <View className="mt-11 max-w-2xl flex-row flex-wrap justify-center gap-2.5">
        {HERO_TOOLS.map(({ key, icon }) => (
          <View
            key={key}
            className={cn(
              "flex-row items-center gap-2 rounded-full border bg-card px-4 py-2",
              CHROME_RULE,
            )}
          >
            <Icon name={icon} size={17} className={CHROME_MARK} />
            <Text className={cn("text-[13.5px] font-semibold", CHROME_TEXT)}>
              {t(`landingPage.tools.${key}`)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
