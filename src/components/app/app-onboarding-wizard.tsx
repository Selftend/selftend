import { useState } from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { OnboardingHero, RichOnboardingShell } from "@/src/components/app/rich-onboarding-shell";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { CONCERN_KEYS, isConcernKey, type ConcernKey } from "@/src/features/onboarding/concerns";
import {
  buildWidgetRecommendations,
  suggestSharedToolWidgetIds,
  type GuidancePreference,
  type ModuleInterest,
} from "@/src/features/onboarding/recommendations";
import { spaceKeyActivationProps } from "@/src/lib/accessibility";
import { cn } from "@/lib/utils";

const welcomeIllustration = require("../../../assets/images/onboarding/app_welcome.png");
type OnboardingPanel = "welcome" | "concerns" | "modules" | "guidance";

export interface AppOnboardingResult {
  selectedConcerns: ConcernKey[];
  widgetIds: string[];
}

interface AppOnboardingWizardProps {
  visible: boolean;
  initialConcerns: string[];
  isPending: boolean;
  errorMessage?: string;
  includeWelcome?: boolean;
  introductionOnly?: boolean;
  onFinish: (result: AppOnboardingResult) => void;
  onSkip: () => void;
}

function ChoiceChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      aria-checked={active}
      onPress={onPress}
      className={cn(
        "min-h-12 flex-row items-center gap-2 rounded-xl border px-4 py-3",
        active ? "border-primary bg-primary/10" : "border-border bg-card",
      )}
      {...spaceKeyActivationProps(onPress)}
    >
      <Icon
        name={active ? "check-box" : "check-box-outline-blank"}
        className="size-5 text-primary"
      />
      <Text className={cn("flex-1 text-sm", active && "font-semibold text-primary")}>{label}</Text>
    </Pressable>
  );
}

export function AppOnboardingWizard({
  visible,
  initialConcerns,
  isPending,
  errorMessage,
  includeWelcome = true,
  introductionOnly = false,
  onFinish,
  onSkip,
}: AppOnboardingWizardProps) {
  const { t } = useTranslation("settings");
  const [panel, setPanel] = useState<OnboardingPanel>(includeWelcome ? "welcome" : "concerns");
  const [selected, setSelected] = useState<ConcernKey[]>(() =>
    initialConcerns.filter(isConcernKey),
  );
  const [modules, setModules] = useState<ModuleInterest[]>([]);
  const [guidance, setGuidance] = useState<GuidancePreference>("guided");
  const isLast =
    introductionOnly || panel === "guidance" || (panel === "modules" && modules.length === 0);

  const toggle = <T extends string>(value: T, setter: (next: T[]) => void, current: T[]) =>
    setter(
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );

  const finish = () => {
    const recommendations = buildWidgetRecommendations({
      concerns: selected,
      moduleInterests: modules,
      guidance,
      selectedToolWidgetIds: Array.from(
        new Set(["mood-checkin" as const, ...suggestSharedToolWidgetIds(selected)]),
      ),
    });
    onFinish({
      selectedConcerns: selected,
      widgetIds: recommendations.map((item) => item.widgetId),
    });
  };

  const nextPanel = () => {
    if (panel === "welcome" && introductionOnly) onSkip();
    else if (panel === "welcome") setPanel("concerns");
    else if (panel === "concerns") setPanel("modules");
    else if (panel === "modules" && modules.length > 0) setPanel("guidance");
    else finish();
  };

  const previousPanel: OnboardingPanel | null =
    panel === "guidance"
      ? "modules"
      : panel === "modules"
        ? "concerns"
        : panel === "concerns" && includeWelcome
          ? "welcome"
          : null;

  const handleDismiss = () => {
    if (isPending) return;
    if (previousPanel) setPanel(previousPanel);
    else onSkip();
  };

  return (
    <RichOnboardingShell
      visible={visible}
      isPending={isPending}
      errorMessage={errorMessage}
      accessibilityLabel={t("onboarding.appTitle")}
      ctaLabel={isLast ? t("onboarding.wizFinish") : t("onboarding.wizNext")}
      ctaAlwaysCompletes
      onComplete={nextPanel}
      onDismiss={handleDismiss}
      footerSlot={
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            {previousPanel ? (
              <Pressable
                accessibilityRole="button"
                disabled={isPending}
                hitSlop={8}
                onPress={() => setPanel(previousPanel)}
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
        </View>
      }
    >
      {panel === "welcome" ? (
        <View className="gap-4">
          <OnboardingHero
            illustration={welcomeIllustration}
            title={t("onboarding.appTitle")}
            subtitle={t("onboarding.appBody1")}
          />
          <Text className="text-sm text-muted-foreground">{t("onboarding.appBody2")}</Text>
        </View>
      ) : null}

      {panel === "concerns" ? (
        <View className="gap-4">
          <Text variant="h2" className="text-center">
            {t("onboarding.wizConcernsTitle")}
          </Text>
          <Text variant="muted" className="text-center">
            {t("onboarding.wizConcernsBody")}
          </Text>
          <View className="gap-2">
            {CONCERN_KEYS.map((key) => (
              <ChoiceChip
                key={key}
                label={t(`onboarding.concerns.${key}`)}
                active={selected.includes(key)}
                onPress={() => toggle(key, setSelected, selected)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {panel === "modules" ? (
        <View className="gap-4">
          <Text variant="h2" className="text-center">
            {t("onboarding.modulesQuestion")}
          </Text>
          <Text variant="muted" className="text-center">
            {t("onboarding.modulesHint")}
          </Text>
          <ChoiceChip
            label={t("onboarding.cbtChoice")}
            active={modules.includes("cbt")}
            onPress={() => toggle("cbt", setModules, modules)}
          />
          <ChoiceChip
            label={t("onboarding.actChoice")}
            active={modules.includes("act")}
            onPress={() => toggle("act", setModules, modules)}
          />
          <Text variant="muted" className="text-center text-xs">
            {t("onboarding.modulesOptional")}
          </Text>
        </View>
      ) : null}

      {panel === "guidance" ? (
        <View className="gap-4">
          <Text variant="h2" className="text-center">
            {t("onboarding.guidanceQuestion")}
          </Text>
          <Text variant="muted" className="text-center">
            {t("onboarding.guidanceHint")}
          </Text>
          <ChoiceChip
            label={t("onboarding.guidedChoice")}
            active={guidance === "guided"}
            onPress={() => setGuidance("guided")}
          />
          <ChoiceChip
            label={t("onboarding.selfDirectedChoice")}
            active={guidance === "self-directed"}
            onPress={() => setGuidance("self-directed")}
          />
        </View>
      ) : null}
    </RichOnboardingShell>
  );
}
