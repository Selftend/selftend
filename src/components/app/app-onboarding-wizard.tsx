import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { OnboardingHero, RichOnboardingShell } from "@/src/components/app/rich-onboarding-shell";
import { Text } from "@/src/components/react-native-reusables/text";
import { isGuestAccount } from "@/src/features/profile/guest";
import { useSession } from "@/src/providers/session-provider";

const welcomeIllustration = require("../../../assets/images/onboarding/app_welcome.png");

/**
 * The app's first-run introduction: ONE panel (#1958, spec #1885 §5).
 *
 * The concerns, modules, guidance and starter-routine panels are gone. The first
 * three existed to compute the widget ids onboarding seeded Home with, and Home
 * no longer has a seeded layout - a new user lands on empty Favourites over the
 * full catalogue and stars what they use. The fourth composed its starter from
 * those recommendations, so it starved when they went; the starter routine now
 * composes from records on /routines (#1954). A replacement first-run experience
 * is deliberately not built here.
 *
 * Both closes persist onboarding as done at the only call site left, the
 * protected-layout gate: the CTA finishes (`_via = 'finish'`), the pinned Escape
 * skips (`_via = 'skip'`). The Escape therefore wears the word "Skip for now"
 * rather than a bare X (#1258 M2) - it is the one close in the app with a
 * lasting consequence - and the footer no longer carries a second copy of it.
 */
interface AppOnboardingWizardProps {
  visible: boolean;
  isPending: boolean;
  errorMessage?: string;
  onFinish: () => void;
  onSkip: () => void;
}

export function AppOnboardingWizard({
  visible,
  isPending,
  errorMessage,
  onFinish,
  onSkip,
}: AppOnboardingWizardProps) {
  const { t } = useTranslation("settings");
  const { user } = useSession();

  // Hardware back / the web Escape key arrive as onRequestClose. With no
  // previous panel to step to, the dismiss is the skip (M4).
  const handleSkip = () => {
    if (isPending) return;
    onSkip();
  };

  return (
    <RichOnboardingShell
      visible={visible}
      isPending={isPending}
      errorMessage={errorMessage}
      accessibilityLabel={t("onboarding.appTitle")}
      onEscape={handleSkip}
      escapeLabel={t("onboarding.wizSkip")}
      ctaLabel={t("onboarding.wizFinish")}
      ctaAlwaysCompletes
      onComplete={onFinish}
      onDismiss={handleSkip}
      footerSlot={
        // The wizard's half of the invitation to register (#1446): one calm
        // informational line, guests only, on the final panel - which is the
        // only panel. The other half is the settings card, and that is the
        // whole invitation surface, by spec.
        isGuestAccount(user) ? (
          <Text variant="muted" className="text-center text-xs">
            {t("onboarding.guestInviteLine")}
          </Text>
        ) : undefined
      }
    >
      <View className="gap-4">
        <OnboardingHero
          illustration={welcomeIllustration}
          title={t("onboarding.appTitle")}
          subtitle={t("onboarding.appBody1")}
        />
        <Text className="text-sm text-muted-foreground">{t("onboarding.appBody2")}</Text>
      </View>
    </RichOnboardingShell>
  );
}
