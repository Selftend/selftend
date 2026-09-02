import { useState } from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { OnboardingHero, RichOnboardingShell } from "@/src/components/app/rich-onboarding-shell";
import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { CONCERN_KEYS, isConcernKey, type ConcernKey } from "@/src/features/onboarding/concerns";
import {
  buildWidgetRecommendations,
  suggestSharedToolWidgetIds,
  type GuidancePreference,
  type ModuleInterest,
} from "@/src/features/onboarding/recommendations";
import { useRoutines } from "@/src/features/routines/queries";
import { ROUTINE_NAME_MAX } from "@/src/features/routines/schemas";
import { buildStarterSteps } from "@/src/features/routines/starter";
import { StarterStepList } from "@/src/features/routines/starter-step-list";
import { useKeepStarterRoutine } from "@/src/features/routines/use-keep-starter-routine";
import { spaceKeyActivationProps } from "@/src/lib/accessibility";
import { useSession } from "@/src/providers/session-provider";
import { cn } from "@/lib/utils";

const welcomeIllustration = require("../../../assets/images/onboarding/app_welcome.png");
type OnboardingPanel = "welcome" | "concerns" | "modules" | "guidance" | "routines";

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
  /**
   * Whether `onSkip` decides something that sticks (M2, #1258). The
   * protected-layout gate passes `true`: its skip persists onboarding as
   * done and the wizard never returns, so the pinned Escape wears the word —
   * the footer's own "Skip for now", promoted into the row. The
   * empty-dashboard re-offer passes `false`: skipping only hides a
   * suggestion, so the Escape stays a bare X and the footer keeps the word.
   * Required, so each call site states which close it is offering.
   */
  skipPersists: boolean;
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
  skipPersists,
  onFinish,
  onSkip,
}: AppOnboardingWizardProps) {
  const { t } = useTranslation("settings");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const [panel, setPanel] = useState<OnboardingPanel>(includeWelcome ? "welcome" : "concerns");
  const [selected, setSelected] = useState<ConcernKey[]>(() =>
    initialConcerns.filter(isConcernKey),
  );
  const [modules, setModules] = useState<ModuleInterest[]>([]);
  const [guidance, setGuidance] = useState<GuidancePreference>("guided");
  const [routineName, setRoutineName] = useState(() => t("routines:form.defaultName"));

  // Starter-routine offer (spec #37, "Onboarding starter routine"). The
  // `routines` panel is gated on the user having ZERO routines; skip the fetch
  // entirely in the welcome-only introduction replay, where the panel is
  // structurally unreachable (that flow ends on the welcome panel).
  const { data: existingRoutines } = useRoutines(introductionOnly ? null : userId);
  const {
    keep: keepStarter,
    saving: starterSaving,
    error: starterError,
  } = useKeepStarterRoutine(userId);

  const buildRecommendations = () =>
    buildWidgetRecommendations({
      concerns: selected,
      moduleInterests: modules,
      // `guidance` is deliberately not passed: #973 retired the two
      // `-module-shortcut` ids, so a picked module resolves to its programme id
      // whichever way the guidance panel was answered, and an input the builder
      // ignores would read as if it still steered something. The panel below
      // still asks the question and still holds the answer; it just no longer
      // changes which widgets Home is seeded with (#973).
      selectedToolWidgetIds: Array.from(
        new Set(["mood-checkin" as const, ...suggestSharedToolWidgetIds(selected)]),
      ),
    });

  // The starter is pre-composed from the widgets this very wizard is about to
  // keep on Home, so the candidate list is the current recommendation set (in
  // concern-resolution order; buildStarterSteps drops non-steppable widgets,
  // excludes Habits, and enforces the cap-3 / min-2 rules).
  const starterSteps = buildStarterSteps(buildRecommendations().map((item) => item.widgetId));
  const starterEligible =
    !introductionOnly &&
    existingRoutines !== undefined &&
    existingRoutines.length === 0 &&
    starterSteps !== null;

  const isLast =
    introductionOnly ||
    panel === "routines" ||
    (panel === "guidance" && !starterEligible) ||
    (panel === "modules" && modules.length === 0 && !starterEligible);

  const toggle = <T extends string>(value: T, setter: (next: T[]) => void, current: T[]) =>
    setter(
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );

  const finish = () => {
    onFinish({
      selectedConcerns: selected,
      widgetIds: buildRecommendations().map((item) => item.widgetId),
    });
  };

  // "Keep" is the only path that writes the starter routine: one routine + N
  // steps through the normal repository write path, then the wizard finishes.
  // Skipping (or abandoning the wizard) writes no routine at all.
  const keepStarterRoutine = () => {
    if (!starterSteps) return;
    void keepStarter({
      name: routineName.trim() || t("routines:form.defaultName"),
      steps: starterSteps,
      onKept: finish,
    });
  };

  const nextPanel = () => {
    if (panel === "welcome" && introductionOnly) onSkip();
    else if (panel === "welcome") setPanel("concerns");
    else if (panel === "concerns") setPanel("modules");
    else if (panel === "modules" && modules.length > 0) setPanel("guidance");
    else if (panel === "routines") keepStarterRoutine();
    else if (starterEligible) setPanel("routines");
    else finish();
  };

  const previousPanel: OnboardingPanel | null =
    panel === "routines"
      ? modules.length > 0
        ? "guidance"
        : "modules"
      : panel === "guidance"
        ? "modules"
        : panel === "modules"
          ? "concerns"
          : panel === "concerns" && includeWelcome
            ? "welcome"
            : null;

  const handleDismiss = () => {
    if (isPending || starterSaving) return;
    if (previousPanel) setPanel(previousPanel);
    else onSkip();
  };

  // The pinned Escape reaches the skip path DIRECTLY, never `handleDismiss`
  // (#1258): the dismiss is a step-Back that falls through to skip only on
  // panel one, and an Escape wired to it would mean "previous panel" on every
  // panel after the first. The system gesture keeps that stepping (M4) — this
  // is only the visible affordance.
  const handleEscape = () => {
    if (isPending || starterSaving) return;
    onSkip();
  };

  return (
    <RichOnboardingShell
      visible={visible}
      isPending={isPending || starterSaving}
      errorMessage={errorMessage ?? (starterError || undefined)}
      accessibilityLabel={t("onboarding.appTitle")}
      onEscape={handleEscape}
      // The word marks the one close in the app with a lasting consequence
      // (M2): the gate's skip persists onboarding as done. Where skipping is
      // free, the Escape stays a bare X.
      escapeLabel={skipPersists ? t("onboarding.wizSkip") : undefined}
      ctaLabel={
        panel === "routines"
          ? t("routines:cta.keep")
          : isLast
            ? t("onboarding.wizFinish")
            : t("onboarding.wizNext")
      }
      ctaAlwaysCompletes
      onComplete={nextPanel}
      onDismiss={handleDismiss}
      footerSlot={
        <View className="gap-3">
          {/* The wizard's half of the invitation to register (#1446): one calm
              informational line, guests only, shown with whichever panel is
              the final one. The other half is the settings card - and that is
              the whole invitation surface, by spec. */}
          {isLast && user?.is_anonymous ? (
            <Text variant="muted" className="text-center text-xs">
              {t("onboarding.guestInviteLine")}
            </Text>
          ) : null}
          <View className="flex-row items-center justify-between">
            {previousPanel ? (
              <Pressable
                accessibilityRole="button"
                disabled={isPending || starterSaving}
                hitSlop={8}
                onPress={() => setPanel(previousPanel)}
              >
                <Text className="text-sm text-muted-foreground">{t("onboarding.wizBack")}</Text>
              </Pressable>
            ) : (
              <View />
            )}
            {/* Promoted, not duplicated: when the pinned Escape wears the
                word, a second "Skip for now" down here would be two identical
                controls making the same promise. */}
            {skipPersists ? null : (
              <Pressable
                accessibilityRole="button"
                disabled={isPending || starterSaving}
                hitSlop={8}
                onPress={onSkip}
              >
                <Text className="text-sm text-muted-foreground">{t("onboarding.wizSkip")}</Text>
              </Pressable>
            )}
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

      {panel === "routines" && starterSteps ? (
        <View className="gap-4">
          <Text variant="h2" className="text-center">
            {t("routines:onboarding.title")}
          </Text>
          <Text variant="muted" className="text-center">
            {t("routines:onboarding.body")}
          </Text>
          <View className="gap-2">
            <Label>{t("routines:form.nameLabel")}</Label>
            <Input
              accessibilityLabel={t("routines:form.nameLabel")}
              maxLength={ROUTINE_NAME_MAX}
              onChangeText={setRoutineName}
              placeholder={t("routines:form.defaultName")}
              value={routineName}
            />
          </View>
          <StarterStepList steps={starterSteps} />
          <Text variant="muted" className="text-center text-xs">
            {t("routines:onboarding.stepsNote")}
          </Text>
          <Button
            variant="ghost"
            disabled={isPending || starterSaving}
            onPress={finish}
            className="self-center"
          >
            <Text>{t("routines:cta.skip")}</Text>
          </Button>
        </View>
      ) : null}
    </RichOnboardingShell>
  );
}
