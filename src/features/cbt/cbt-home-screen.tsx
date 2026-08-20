import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { cn } from "@/lib/utils";
import { HOME_COLUMN } from "@/src/lib/layout";
import { CbtOnboarding } from "@/src/components/app/cbt-onboarding-modal";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { useGoals } from "@/src/features/goals/queries";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { useCbtInsights } from "@/src/features/cbt/use-cbt-insights";
import { useRecoveryPlan } from "@/src/features/recovery/queries";
import { useSession } from "@/src/providers/session-provider";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useCbtProgram } from "@/src/features/cbt/use-cbt-program";
import { deriveCbtHomeView } from "@/src/features/cbt/cbt-home/derive-cbt-home-view";
import { CbtProgramSection } from "@/src/features/cbt/cbt-home/cbt-program-section";
import { PersonalSloganCard } from "@/src/features/cbt/cbt-home/personal-slogan-card";
import { ActiveGoalsSection } from "@/src/features/cbt/cbt-home/active-goals-section";
import { CbtInsightsSection } from "@/src/features/cbt/cbt-home/cbt-insights-section";
import { CbtPillarsSection } from "@/src/features/cbt/cbt-home/cbt-pillars-section";
import { CbtReviewLinks } from "@/src/features/cbt/cbt-home/cbt-review-links";
import { RecentThoughtRecord } from "@/src/features/cbt/cbt-home/recent-thought-record";

export default function CbtHomeScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const {
    program,
    startProgram,
    dismissProgramPrompt,
    showProgramPrompt,
    abandonProgram,
    replayProgram,
    advancePhase,
    dismissGraduation,
    promptDismissedAt,
    graduationDismissedAt,
    isUpdating: isProgramUpdating,
  } = useCbtProgram(user?.id ?? null);
  const [forceOnboarding, setForceOnboarding] = useState(false);
  const [abandonConfirmVisible, setAbandonConfirmVisible] = useState(false);

  const { data: goals } = useGoals(user?.id ?? null);
  const { data: thoughtRecords } = useThoughtRecords(user?.id ?? null);
  const { data: recoveryPlan } = useRecoveryPlan(user?.id ?? null);
  const insights = useCbtInsights(user?.id ?? null);
  const { activeGoals, latestRecord, personalSlogan, insightCards, showProgramCard } =
    deriveCbtHomeView({
      goals,
      thoughtRecords,
      recoveryPlan,
      insights,
      program,
      promptDismissedAt,
      t,
    });

  return (
    <>
      <ConfirmDialog
        visible={abandonConfirmVisible}
        isPending={isProgramUpdating}
        title={t("program.abandonTitle")}
        message={t("program.abandonDescription")}
        confirmLabel={t("program.abandonConfirm")}
        cancelLabel={t("program.abandonCancel")}
        onCancel={() => setAbandonConfirmVisible(false)}
        onConfirm={() => {
          abandonProgram();
          setAbandonConfirmVisible(false);
        }}
      />
      <CbtOnboarding
        onComplete={() => {
          setForceOnboarding(false);
        }}
        onDismiss={() => setForceOnboarding(false)}
        visible={forceOnboarding}
      />
      {/* No room pour (#500, owner decision): the CBT home wears the app's
          default violet surfaces - the default theme IS the violet room. The
          primary pour that used to carry its colour identity was the field
          header, and that is gone with the quiet shell (#733); the consequence
          for CBT specifically is raised on #691. */}
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-4">
          <View className={cn(HOME_COLUMN, "gap-6")}>
            <ModuleHomeHeader
              addWidgetCategory="cbt"
              title={t("fullTitle")}
              tourScope="cbt"
              description={t("home.description")}
              actions={[
                { type: "notifications", targetKey: "cbt" },
                ...(program.status === "not_started"
                  ? [
                      {
                        type: "program" as const,
                        onPress: showProgramPrompt,
                        accessibilityLabel: t("program.showPromptLabel"),
                      },
                    ]
                  : []),
                { type: "info", onPress: () => setForceOnboarding(true) },
              ]}
            />
            <CbtProgramSection
              program={program}
              isPending={isProgramUpdating}
              showProgramCard={showProgramCard}
              graduationDismissedAt={graduationDismissedAt}
              onStart={startProgram}
              onAdvance={advancePhase}
              onRequestAbandon={() => setAbandonConfirmVisible(true)}
              onDismissStart={dismissProgramPrompt}
              onDismissGraduation={dismissGraduation}
              onReplay={replayProgram}
            />

            <PersonalSloganCard slogan={personalSlogan} />

            <ActiveGoalsSection goals={activeGoals} />

            <CbtInsightsSection cards={insightCards} />

            <CbtPillarsSection />

            <CbtReviewLinks />

            <RecentThoughtRecord record={latestRecord} />

            <Pressable
              accessibilityLabel={t("home.recordHistory")}
              accessibilityRole="button"
              hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
              onPress={() => router.push("/modules/cbt/history")}
              className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3 active:bg-accent/40"
              role="button"
            >
              <Text className="flex-1 text-sm font-medium">{t("home.recordHistory")}</Text>
              <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
