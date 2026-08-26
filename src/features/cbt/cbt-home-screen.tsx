import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { CrisisSupportCallout } from "@/src/components/app/safety-callout";
import { cn } from "@/lib/utils";
import { HOME_COLUMN } from "@/src/lib/layout";
import { CbtOnboarding } from "@/src/components/app/cbt-onboarding-modal";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { useGoals } from "@/src/features/goals/queries";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { useCbtInsights } from "@/src/features/cbt/use-cbt-insights";
import { useRecoveryPlan } from "@/src/features/recovery/queries";
import { useSession } from "@/src/providers/session-provider";
import { useCbtProgram } from "@/src/features/cbt/use-cbt-program";
import { deriveCbtHomeView } from "@/src/features/cbt/cbt-home/derive-cbt-home-view";
import { CbtProgramSection } from "@/src/features/cbt/cbt-home/cbt-program-section";
import { PersonalSloganCard } from "@/src/features/cbt/cbt-home/personal-slogan-card";
import { ActiveGoalsSection } from "@/src/features/cbt/cbt-home/active-goals-section";
import { CbtInsightsSection } from "@/src/features/cbt/cbt-home/cbt-insights-section";
import { CbtPillarsSection } from "@/src/features/cbt/cbt-home/cbt-pillars-section";
import { CbtReviewLinks } from "@/src/features/cbt/cbt-home/cbt-review-links";
import { RecentThoughtRecords } from "@/src/features/cbt/cbt-home/recent-thought-records";

export default function CbtHomeScreen() {
  const pushWithOrigin = usePushWithOrigin();
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
  const {
    activeGoals,
    recentRecords,
    personalSlogan,
    insightCards,
    showProgramCard,
    sectionRules,
  } = deriveCbtHomeView({
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
          {/* No column gap: the hairline blocks below carry their own `py-6`, so
              a gap here would double every gutter on the page. The blocks that
              are cards rather than sections space themselves instead. */}
          <View className={cn(HOME_COLUMN)}>
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

            {/* ☠️ An inline button, not a floating one. The only `Fab` consumer
                is the routine handle, which `protected-layout.tsx` mounts
                app-wide at the bottom right and which does NOT hide itself on
                this route - so a second floating control would land on top of
                it. This is the grammar four other tool homes already use
                (journal, gratitude, sleep, habits), in ONE place at every
                width. */}
            <Button onPress={() => pushWithOrigin("/modules/cbt/new")} className="mt-6 self-start">
              <Icon name="add" className="size-4 text-primary-foreground" />
              {/* The destination's own title, deliberately: a door and the room
                  behind it saying different words is how a screen ends up with
                  two names. */}
              <Text>{t("record.newTitle")}</Text>
            </Button>

            {/* ✅ The Think pillar's "Thought Records" tool still routes here
                too. It is a catalogue entry and this is the action - a
                duplicated route is only a duplicated door when both renderings
                are in the same register. */}

            <View className="mt-6 gap-6">
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
            </View>

            <ActiveGoalsSection goals={activeGoals} ruled={sectionRules.goals} />

            <RecentThoughtRecords records={recentRecords} ruled={sectionRules.records} />

            <CbtInsightsSection cards={insightCards} ruled={sectionRules.insights} />

            <CbtPillarsSection ruled={sectionRules.framework} />

            <CbtReviewLinks ruled={sectionRules.review} />

            {/* Last, because that is where the two screens already shipping this
                callout put theirs (ACT home and the DBT module), and a safety
                block in a different place on one module home is worse than a
                safety block one scroll further down. CBT was the only module
                home in the product without one. */}
            <View className="pt-6">
              <CrisisSupportCallout />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
