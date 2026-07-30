import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ContentSheet } from "@/src/components/app/content-sheet";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { CbtOnboarding } from "@/src/components/app/cbt-onboarding-modal";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { useGoals } from "@/src/features/goals/queries";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { useCbtInsights } from "@/src/features/cbt/use-cbt-insights";
import { useRecoveryPlan } from "@/src/features/recovery/queries";
import { useSession } from "@/src/providers/session-provider";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useCbtProgram } from "@/src/features/cbt/use-cbt-program";
import type { AdvancedToolInfoKey } from "@/src/features/cbt/cbt-home/cbt-home-config";
import { deriveCbtHomeView } from "@/src/features/cbt/cbt-home/derive-cbt-home-view";
import { AdvancedToolInfoModals } from "@/src/features/cbt/cbt-home/advanced-tool-info-modals";
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
  const [activeToolInfo, setActiveToolInfo] = useState<AdvancedToolInfoKey | null>(null);
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
      <AdvancedToolInfoModals active={activeToolInfo} onClose={() => setActiveToolInfo(null)} />
      {/* No room pour (#500, owner decision): the CBT home wears the app's
          default violet surfaces - the default theme IS the violet room - and
          its field matches the sidebar's CBT accent via the primary pour. */}
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-4">
          {/* The field + sheet escape the scroll padding so the violet field
              runs edge to edge (Wave C homes-get-fields, #493/#500); the
              sheet re-adds the inset for its sections. */}
          <View className="-mx-4 -mt-4">
            <ModuleHomeHeader
              variant="field"
              addWidgetCategory="cbt"
              hue="primary"
              icon="psychology"
              moduleLabel={t("common:beta")}
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
            <ContentSheet className="px-4">
              <View className="gap-6">
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

                <CbtPillarsSection onOpenInfo={setActiveToolInfo} />

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
            </ContentSheet>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
