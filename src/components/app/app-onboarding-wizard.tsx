import { useState } from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import {
  OnboardingHero,
  OnboardingInfoRow,
  RichOnboardingShell,
} from "@/src/components/app/rich-onboarding-shell";
import { Text } from "@/src/components/react-native-reusables/text";
import { CONCERN_KEYS, isConcernKey, type ConcernKey } from "@/src/features/onboarding/concerns";
import { spaceKeyActivationProps } from "@/src/lib/accessibility";

const welcomeIllustration = require("../../../assets/images/onboarding/app_welcome.png");

const PANEL_COUNT = 3;

interface AppOnboardingWizardProps {
  visible: boolean;
  initialConcerns: string[];
  isPending: boolean;
  errorMessage?: string;
  onFinish: (selectedConcerns: ConcernKey[]) => void;
  onSkip: () => void;
}

export function AppOnboardingWizard({
  visible,
  initialConcerns,
  isPending,
  errorMessage,
  onFinish,
  onSkip,
}: AppOnboardingWizardProps) {
  const { t } = useTranslation("settings");
  const [panel, setPanel] = useState(0);
  const [selected, setSelected] = useState<ConcernKey[]>(() =>
    initialConcerns.filter(isConcernKey),
  );

  const isLast = panel === PANEL_COUNT - 1;

  const toggleConcern = (key: ConcernKey) =>
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const handleCta = () => {
    if (isLast) {
      onFinish(selected);
      return;
    }
    setPanel((p) => p + 1);
  };

  // Android hardware back / web Escape: step back one panel rather than
  // permanently skipping the whole wizard from any panel; only from the first
  // panel does it skip, and never mid-submit (matches the Skip button's gate).
  const handleDismiss = () => {
    if (isPending) return;
    if (panel > 0) {
      setPanel((p) => p - 1);
      return;
    }
    onSkip();
  };

  return (
    <RichOnboardingShell
      visible={visible}
      isPending={isPending}
      errorMessage={errorMessage}
      accessibilityLabel={t("onboarding.appTitle")}
      ctaLabel={isLast ? t("onboarding.wizFinish") : t("onboarding.wizNext")}
      ctaAlwaysCompletes
      onComplete={handleCta}
      onDismiss={handleDismiss}
      footerSlot={
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            {panel > 0 ? (
              <Pressable
                accessibilityRole="button"
                disabled={isPending}
                hitSlop={8}
                onPress={() => setPanel((p) => p - 1)}
              >
                <Text className="text-sm text-muted-foreground">{t("onboarding.wizBack")}</Text>
              </Pressable>
            ) : (
              <View />
            )}
            <Pressable accessibilityRole="button" disabled={isPending} hitSlop={8} onPress={onSkip}>
              <Text className="text-sm text-muted-foreground">{t("onboarding.wizSkip")}</Text>
            </Pressable>
          </View>
          <View
            accessibilityLabel={t("onboarding.wizProgress", {
              current: panel + 1,
              total: PANEL_COUNT,
            })}
            className="flex-row justify-center gap-1.5"
          >
            {Array.from({ length: PANEL_COUNT }, (_, i) => (
              <View
                key={i}
                className={
                  i === panel
                    ? "size-2 rounded-full bg-primary"
                    : "size-2 rounded-full bg-muted-foreground/40"
                }
              />
            ))}
          </View>
        </View>
      }
    >
      {panel === 0 ? (
        <View className="gap-4">
          <OnboardingHero
            illustration={welcomeIllustration}
            title={t("onboarding.appTitle")}
            subtitle={t("onboarding.appBody1")}
          />
          <Text className="text-sm text-muted-foreground">{t("onboarding.appBody2")}</Text>
        </View>
      ) : null}

      {panel === 1 ? (
        <View className="gap-5">
          <Text variant="h2" className="text-center">
            {t("onboarding.wizStructureTitle")}
          </Text>
          <Text variant="muted" className="text-center">
            {t("onboarding.wizStructureIntro")}
          </Text>
          <OnboardingInfoRow
            icon="psychology"
            title={t("onboarding.wizModulesTitle")}
            body={t("onboarding.wizModulesBody")}
          />
          <OnboardingInfoRow
            icon="handyman"
            title={t("onboarding.wizToolsTitle")}
            body={t("onboarding.wizToolsBody")}
          />
          <OnboardingInfoRow
            icon="dashboard-customize"
            title={t("onboarding.wizDashboardTitle")}
            body={t("onboarding.wizDashboardBody")}
          />
        </View>
      ) : null}

      {panel === 2 ? (
        <View className="gap-5">
          <Text variant="h2" className="text-center">
            {t("onboarding.wizConcernsTitle")}
          </Text>
          <Text variant="muted" className="text-center">
            {t("onboarding.wizConcernsBody")}
          </Text>
          <View className="flex-row flex-wrap justify-center gap-2">
            {CONCERN_KEYS.map((key) => {
              const active = selected.includes(key);
              return (
                <Pressable
                  key={key}
                  accessibilityRole="checkbox"
                  aria-checked={active}
                  onPress={() => toggleConcern(key)}
                  className={
                    active
                      ? "rounded-full border border-primary bg-primary/10 px-4 py-2"
                      : "rounded-full border border-border px-4 py-2"
                  }
                  {...spaceKeyActivationProps(() => toggleConcern(key))}
                >
                  <Text className={active ? "text-sm font-semibold text-primary" : "text-sm"}>
                    {t(`onboarding.concerns.${key}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </RichOnboardingShell>
  );
}
