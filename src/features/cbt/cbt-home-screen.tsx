import { router, type Href } from "expo-router";
import { Pressable, ScrollView, useColorScheme, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { AccessibleCardLink } from "@/src/components/app/accessible-card-link";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { CbtOnboarding } from "@/src/components/app/cbt-onboarding-modal";
import { ProgramHero } from "@/src/components/app/program-hero";
import { ProgramGraduation } from "@/src/components/app/program-graduation";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { cn } from "@/lib/utils";
import { useGoals } from "@/src/features/goals/queries";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { useCbtInsights } from "@/src/features/cbt/use-cbt-insights";
import { useRecoveryPlan } from "@/src/features/recovery/queries";
import { useSession } from "@/src/providers/session-provider";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useCbtProgram } from "@/src/features/cbt/use-cbt-program";

type Pillar = "think" | "act" | "be";

interface PillarStrategy {
  key: string;
  route: Href;
  icon: MaterialIconName;
  labelKey: string;
  descKey: string;
}

interface SharedTool {
  key: string;
  route: Href;
  icon: MaterialIconName;
  labelKey: string;
}

const PILLAR_STRATEGIES: Record<Pillar, PillarStrategy[]> = {
  think: [
    {
      key: "thoughts",
      route: "/modules/cbt/new",
      icon: "article",
      labelKey: "dashboard.strategies.thoughts",
      descKey: "pillars.strategyDescriptions.thoughts",
    },
    {
      key: "beliefs",
      route: "/modules/cbt/beliefs",
      icon: "anchor",
      labelKey: "dashboard.strategies.beliefs",
      descKey: "pillars.strategyDescriptions.beliefs",
    },
    {
      key: "worry",
      route: "/modules/cbt/worry",
      icon: "psychology",
      labelKey: "dashboard.strategies.worry",
      descKey: "pillars.strategyDescriptions.worry",
    },
    {
      key: "distortions",
      route: "/modules/cbt/learn",
      icon: "menu-book",
      labelKey: "home.distortionGuide",
      descKey: "pillars.strategyDescriptions.distortions",
    },
  ],
  act: [
    {
      key: "goals",
      route: "/modules/cbt/goals",
      icon: "gps-fixed",
      labelKey: "dashboard.strategies.goals",
      descKey: "pillars.strategyDescriptions.goals",
    },
    {
      key: "values",
      route: "/modules/cbt/values",
      icon: "explore",
      labelKey: "dashboard.strategies.values",
      descKey: "pillars.strategyDescriptions.values",
    },
    {
      key: "activities",
      route: "/modules/cbt/activities",
      icon: "directions-run",
      labelKey: "dashboard.strategies.activities",
      descKey: "pillars.strategyDescriptions.activities",
    },
    {
      key: "exposure",
      route: "/modules/cbt/exposure",
      icon: "layers",
      labelKey: "dashboard.strategies.exposure",
      descKey: "pillars.strategyDescriptions.exposure",
    },
    {
      key: "tasks",
      route: "/modules/cbt/tasks",
      icon: "hiking",
      labelKey: "dashboard.strategies.tasks",
      descKey: "pillars.strategyDescriptions.tasks",
    },
    {
      key: "anger",
      route: "/modules/cbt/anger",
      icon: "local-fire-department",
      labelKey: "dashboard.strategies.anger",
      descKey: "pillars.strategyDescriptions.anger",
    },
  ],
  be: [
    {
      key: "selfCare",
      route: "/modules/cbt/self-care",
      icon: "favorite",
      labelKey: "dashboard.strategies.selfCare",
      descKey: "pillars.strategyDescriptions.selfCare",
    },
  ],
};

const THINK_SHARED_TOOLS: SharedTool[] = [
  {
    key: "journal",
    route: "/tools/journal",
    icon: "edit-note",
    labelKey: "navigation:sidebar.journal",
  },
  {
    key: "gratitudeLog",
    route: "/tools/gratitude-log",
    icon: "favorite",
    labelKey: "navigation:sidebar.gratitudeLog",
  },
];

const ACT_SHARED_TOOLS: SharedTool[] = [
  {
    key: "habits",
    route: "/tools/habits",
    icon: "task-alt",
    labelKey: "navigation:sidebar.habits",
  },
];

const BE_SHARED_TOOLS: SharedTool[] = [
  {
    key: "breathing",
    route: "/tools/breathing",
    icon: "air",
    labelKey: "navigation:sidebar.breathing",
  },
  {
    key: "mindfulness",
    route: "/tools/mindfulness",
    icon: "air",
    labelKey: "navigation:sidebar.mindfulness",
  },
  {
    key: "meditation",
    route: "/tools/meditation",
    icon: "self-improvement",
    labelKey: "navigation:sidebar.meditation",
  },
  {
    key: "grounding",
    route: "/tools/grounding",
    icon: "anchor",
    labelKey: "navigation:sidebar.grounding",
  },
  {
    key: "moodTracker",
    route: "/tools/mood-tracker",
    icon: "mood",
    labelKey: "navigation:sidebar.moodTracker",
  },
  {
    key: "sleep",
    route: "/tools/sleep",
    icon: "bedtime",
    labelKey: "navigation:sidebar.sleep",
  },
];

const REVIEW_LINKS = [
  {
    key: "weeklyReview",
    route: "/modules/cbt/weekly-review",
    icon: "event-available" as MaterialIconName,
    labelKey: "dashboard.strategies.weeklyReview",
    descKey: "pillars.strategyDescriptions.weeklyReview",
  },
  {
    key: "recovery",
    route: "/modules/cbt/recovery",
    icon: "map" as MaterialIconName,
    labelKey: "dashboard.strategies.recovery",
    descKey: "pillars.strategyDescriptions.recovery",
  },
] as const;

const PILLAR_CONTAINER_CLASS: Record<Pillar, string> = {
  think: "border-think/30",
  act: "border-act/30",
  be: "border-be/30",
};

// Hardcoded HSL values match the --think/--act/--be tokens in global.css.
// LinearGradient needs literal color strings (CSS vars don't resolve in RN colors props).
const PILLAR_HSL: Record<Pillar, { light: string; dark: string }> = {
  think: { light: "43, 74%, 52%", dark: "43, 86%, 65%" },
  act: { light: "160, 46%, 38%", dark: "160, 56%, 55%" },
  be: { light: "330, 56%, 60%", dark: "330, 62%, 72%" },
};

function pillarGradientColors(pillar: Pillar, isDark: boolean): [string, string] {
  const hsl = isDark ? PILLAR_HSL[pillar].dark : PILLAR_HSL[pillar].light;
  return [`hsla(${hsl}, ${isDark ? 0.18 : 0.14})`, `hsla(${hsl}, 0)`];
}

const PILLAR_EMBLEM_CLASS: Record<Pillar, string> = {
  think: "bg-think/15 border-think/30",
  act: "bg-act/15 border-act/30",
  be: "bg-be/15 border-be/30",
};

const PILLAR_TEXT_CLASS: Record<Pillar, string> = {
  think: "text-think",
  act: "text-act",
  be: "text-be",
};

const PILLAR_STRIPE_CLASS: Record<Pillar, string> = {
  think: "bg-think",
  act: "bg-act",
  be: "bg-be",
};

const PILLAR_ICON_BG_CLASS: Record<Pillar, string> = {
  think: "bg-think/15",
  act: "bg-act/15",
  be: "bg-be/15",
};

interface PillarPaneProps {
  pillar: Pillar;
  titleKey: string;
  subKey: string;
  descKey: string;
  strategies: PillarStrategy[];
  sharedTools?: SharedTool[];
}

function PillarPane({
  pillar,
  titleKey,
  subKey,
  descKey,
  strategies,
  sharedTools,
}: PillarPaneProps) {
  const { t } = useTranslation("cbt");
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const title = t(titleKey);
  const initial = title.charAt(0);
  const gradientColors = pillarGradientColors(pillar, isDark);

  return (
    <View
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card p-5",
        PILLAR_CONTAINER_CLASS[pillar],
      )}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        locations={[0, 0.55]}
        style={{
          height: 280,
          left: 0,
          pointerEvents: "none",
          position: "absolute",
          right: 0,
          top: 0,
        }}
      />
      <View className="flex-row items-start gap-4">
        <View
          aria-hidden
          className={cn(
            "size-14 items-center justify-center rounded-xl border",
            PILLAR_EMBLEM_CLASS[pillar],
          )}
        >
          <Text className={cn("text-xl font-bold", PILLAR_TEXT_CLASS[pillar])}>{initial}</Text>
        </View>
        <View className="flex-1 gap-1">
          <View className="flex-row flex-wrap items-baseline gap-2">
            <Text className={cn("text-xl font-semibold", PILLAR_TEXT_CLASS[pillar])}>{title}</Text>
            <Text variant="muted" className="text-sm">
              · {t(subKey)}
            </Text>
          </View>
          <Text variant="muted" className="text-sm leading-5">
            {t(descKey)}
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row flex-wrap gap-3">
        {strategies.map((strategy) => (
          <PillarStrategyCard key={strategy.key} pillar={pillar} strategy={strategy} />
        ))}
      </View>

      {sharedTools && sharedTools.length > 0 ? (
        <View className="mt-5 gap-2">
          <View className="flex-row items-center gap-2">
            <Icon name="auto-awesome" className="size-3 text-muted-foreground" size={12} />
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("pillars.usesSharedTools")}
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {sharedTools.map((tool) => (
              <SharedToolPill key={tool.key} pillar={pillar} tool={tool} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

interface PillarStrategyCardProps {
  pillar: Pillar;
  strategy: PillarStrategy;
}

function PillarStrategyCard({ pillar, strategy }: PillarStrategyCardProps) {
  const { t } = useTranslation("cbt");
  const label = t(strategy.labelKey);

  return (
    <Pressable
      accessibilityHint={t(strategy.descKey)}
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={() => router.push(strategy.route)}
      className="min-w-[200px] flex-1 basis-[200px] overflow-hidden rounded-xl border border-border bg-card active:bg-accent/40"
      role="button"
    >
      <View className={cn("h-1", PILLAR_STRIPE_CLASS[pillar])} />
      <View className="gap-2 p-4">
        <View className="flex-row items-center justify-between">
          <View
            className={cn(
              "size-9 items-center justify-center rounded-lg",
              PILLAR_ICON_BG_CLASS[pillar],
            )}
          >
            <Icon name={strategy.icon} className={cn("size-6", PILLAR_TEXT_CLASS[pillar])} />
          </View>
          <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
        </View>
        <Text className="text-base font-semibold leading-tight">{label}</Text>
        <Text variant="muted" className="text-xs leading-snug">
          {t(strategy.descKey)}
        </Text>
      </View>
    </Pressable>
  );
}

interface SharedToolPillProps {
  pillar: Pillar;
  tool: SharedTool;
}

function SharedToolPill({ pillar, tool }: SharedToolPillProps) {
  const { t } = useTranslation(["navigation", "cbt"]);
  const label = t(tool.labelKey);

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={() => router.push(tool.route)}
      className="min-w-[150px] flex-1 basis-[150px] flex-row items-center gap-3 rounded-xl border border-border bg-card p-3 active:bg-accent/40"
      role="button"
    >
      <View
        className={cn(
          "size-9 items-center justify-center rounded-lg",
          PILLAR_ICON_BG_CLASS[pillar],
        )}
      >
        <Icon name={tool.icon} className={cn("size-6", PILLAR_TEXT_CLASS[pillar])} />
      </View>
      <Text className="flex-1 text-sm font-semibold" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

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
    promptDismissedAt,
    isUpdating: isProgramUpdating,
  } = useCbtProgram(user?.id ?? null);
  const [forceOnboarding, setForceOnboarding] = useState(false);
  const [graduationDismissed, setGraduationDismissed] = useState(false);
  const [abandonConfirmVisible, setAbandonConfirmVisible] = useState(false);

  const { data: goals } = useGoals(user?.id ?? null);
  const { data: thoughtRecords } = useThoughtRecords(user?.id ?? null);
  const { data: recoveryPlan } = useRecoveryPlan(user?.id ?? null);
  const {
    activityMoodLiftByCategory,
    angerPattern,
    beliefReviewSuggestions,
    exerciseMoodLift,
    exposureProgress,
    recurringThoughtSuggestions,
    selfCareTrend,
    slogan,
    topDistortions,
  } = useCbtInsights(user?.id ?? null);

  const activeGoals = goals?.filter((g) => g.status === "active").slice(0, 2) ?? [];
  const latestRecord = thoughtRecords?.[0] ?? null;
  const personalSlogan = recoveryPlan?.personalSlogan.trim() || slogan;
  const topDistortion = topDistortions[0] ?? null;
  const otherDistortions = topDistortions.slice(1);
  const topRecurringThought = recurringThoughtSuggestions[0] ?? null;
  const hasInsights =
    Boolean(topDistortion) ||
    Boolean(exerciseMoodLift) ||
    activityMoodLiftByCategory.length > 0 ||
    beliefReviewSuggestions.length > 0 ||
    Boolean(topRecurringThought) ||
    Boolean(selfCareTrend) ||
    Boolean(angerPattern) ||
    Boolean(exposureProgress);
  const showProgramCard = program.status !== "not_started" || !promptDismissedAt;

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
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <View className="gap-2">
              <ModuleHomeHeader
                title={t("home.title")}
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
              <Text variant="muted">{t("home.description")}</Text>
            </View>

            {program.status === "graduated" ? (
              <ProgramGraduation
                stats={program.summaryStats}
                dismissed={graduationDismissed}
                onDismiss={() => setGraduationDismissed(true)}
                onReplay={replayProgram}
              />
            ) : showProgramCard ? (
              <ProgramHero
                isPending={isProgramUpdating}
                program={program}
                onAbandon={
                  program.status === "in_progress"
                    ? () => setAbandonConfirmVisible(true)
                    : undefined
                }
                onDismissStart={program.status === "not_started" ? dismissProgramPrompt : undefined}
                onStart={startProgram}
              />
            ) : null}

            {personalSlogan ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t("dashboard.sloganTitle")}</CardTitle>
                  <CardDescription className="italic">{`"${personalSlogan}"`}</CardDescription>
                </CardHeader>
              </Card>
            ) : null}

            {/* Active goals */}
            {activeGoals.length > 0 ? (
              <View className="gap-3">
                <View className="flex-row items-center justify-between">
                  <Text variant="h3">{t("dashboard.activeGoals")}</Text>
                  <Button
                    onPress={() => router.push("/modules/cbt/goals")}
                    size="sm"
                    variant="ghost"
                  >
                    <Text>{t("dashboard.seeAll")}</Text>
                  </Button>
                </View>
                {activeGoals.map((goal) => (
                  <AccessibleCardLink
                    key={goal.id}
                    title={goal.title}
                    description={t(`goals.domain.${goal.lifeDomain}`)}
                    onPress={() => router.push(`/modules/cbt/goals/${goal.id}`)}
                  />
                ))}
              </View>
            ) : null}

            {/* Insights */}
            {hasInsights ? (
              <View className="gap-3">
                <Text variant="h3">{t("dashboard.insights.title")}</Text>
                {topDistortion ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {t("dashboard.insights.topDistortion", {
                          name: t(`distortions.${topDistortion.key}.title`, {
                            defaultValue: topDistortion.key,
                          }),
                          count: topDistortion.count,
                        })}
                      </CardTitle>
                      {otherDistortions.length > 0 ? (
                        <CardDescription>
                          {t("dashboard.insights.topDistortionDetail", {
                            names: otherDistortions
                              .map((distortion) =>
                                t("dashboard.insights.distortionSummaryItem", {
                                  name: t(`distortions.${distortion.key}.title`, {
                                    defaultValue: distortion.key,
                                  }),
                                  count: distortion.count,
                                }),
                              )
                              .join(", "),
                          })}
                        </CardDescription>
                      ) : null}
                    </CardHeader>
                  </Card>
                ) : null}

                {exerciseMoodLift ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {t("dashboard.insights.exerciseMood", {
                          withExercise: exerciseMoodLift.withExercise,
                          withoutExercise: exerciseMoodLift.withoutExercise,
                        })}
                      </CardTitle>
                      <CardDescription>
                        {t("dashboard.insights.exerciseMoodDetail")}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ) : null}

                {beliefReviewSuggestions.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {t("dashboard.insights.reviewBelief", {
                          count: beliefReviewSuggestions.length,
                        })}
                      </CardTitle>
                      <CardDescription>
                        {t("dashboard.insights.reviewBeliefDetail")}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ) : null}

                {activityMoodLiftByCategory.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("dashboard.insights.activityMoodLift")}</CardTitle>
                      <CardDescription>
                        {t("dashboard.insights.activityMoodLiftDetail", {
                          summary: activityMoodLiftByCategory
                            .map((item) =>
                              t("dashboard.insights.activityMoodLiftItem", {
                                category: t(`activities.category.${item.category}`),
                                lift: item.averageLift,
                                count: item.count,
                              }),
                            )
                            .join(", "),
                        })}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ) : null}

                {topRecurringThought ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {t("dashboard.insights.recurringThought", {
                          thought: topRecurringThought.thought,
                        })}
                      </CardTitle>
                      <CardDescription>
                        {t("dashboard.insights.recurringThoughtDetail", {
                          count: topRecurringThought.count,
                        })}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ) : null}

                {selfCareTrend ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {t("dashboard.insights.selfCareTrend", {
                          exerciseDays: selfCareTrend.exerciseDays,
                          totalDays: selfCareTrend.totalDays,
                        })}
                      </CardTitle>
                      <CardDescription>
                        {t("dashboard.insights.selfCareTrendDetail", {
                          socialDays: selfCareTrend.socialDays,
                          gratitudeDays: selfCareTrend.gratitudeDays,
                          averageSleep:
                            selfCareTrend.averageSleepHours === null
                              ? t("dashboard.insights.noSleepAverage")
                              : t("dashboard.insights.sleepAverage", {
                                  hours: selfCareTrend.averageSleepHours,
                                }),
                        })}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ) : null}

                {angerPattern ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {t("dashboard.insights.angerPattern", {
                          averageArousal: angerPattern.averageArousal,
                        })}
                      </CardTitle>
                      <CardDescription>
                        {t("dashboard.insights.angerPatternDetail", {
                          commonUrge:
                            angerPattern.commonUrge ?? t("dashboard.insights.noCommonUrge"),
                          timeOutsTaken: angerPattern.timeOutsTaken,
                          totalLogs: angerPattern.totalLogs,
                        })}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ) : null}

                {exposureProgress ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {t("dashboard.insights.exposureProgress", {
                          completed: exposureProgress.completed,
                          total: exposureProgress.total,
                        })}
                      </CardTitle>
                      <CardDescription>
                        {t("dashboard.insights.exposureProgressDetail")}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ) : null}
              </View>
            ) : null}

            {/* Think · Act · Be pillars */}
            <View className="gap-3">
              <Text variant="h3">{t("pillars.intro")}</Text>
              <Text variant="muted" className="max-w-[64ch]">
                {t("pillars.introDescription")}
              </Text>

              <View className="gap-4">
                <PillarPane
                  pillar="think"
                  titleKey="pillars.think.title"
                  subKey="pillars.think.sub"
                  descKey="pillars.think.description"
                  strategies={PILLAR_STRATEGIES.think}
                  sharedTools={THINK_SHARED_TOOLS}
                />
                <PillarPane
                  pillar="act"
                  titleKey="pillars.act.title"
                  subKey="pillars.act.sub"
                  descKey="pillars.act.description"
                  strategies={PILLAR_STRATEGIES.act}
                  sharedTools={ACT_SHARED_TOOLS}
                />
                <PillarPane
                  pillar="be"
                  titleKey="pillars.be.title"
                  subKey="pillars.be.sub"
                  descKey="pillars.be.description"
                  strategies={PILLAR_STRATEGIES.be}
                  sharedTools={BE_SHARED_TOOLS}
                />
              </View>
            </View>

            {/* Review */}
            <View className="gap-3">
              <Text variant="h3">{t("pillars.review.title")}</Text>
              <View className="flex-row flex-wrap gap-3">
                {REVIEW_LINKS.map((link) => (
                  <View key={link.key} className="min-w-[260px] flex-1 basis-[260px]">
                    <Pressable
                      accessibilityHint={t(link.descKey)}
                      accessibilityLabel={t(link.labelKey)}
                      accessibilityRole="button"
                      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                      onPress={() => router.push(link.route)}
                      className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-4 active:bg-accent/40"
                      role="button"
                    >
                      <View className="size-9 items-center justify-center rounded-lg bg-muted">
                        <Icon name={link.icon} className="size-6 text-foreground" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-semibold">{t(link.labelKey)}</Text>
                        <Text variant="muted" className="text-xs">
                          {t(link.descKey)}
                        </Text>
                      </View>
                      <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>

            {/* Recent thought record */}
            {latestRecord ? (
              <View className="gap-3">
                <Text variant="h3">{t("dashboard.recentThought")}</Text>
                <AccessibleCardLink
                  title={latestRecord.automaticThought}
                  description={latestRecord.balancedThought}
                  onPress={() =>
                    router.push(
                      `/modules/cbt/history/${latestRecord.id}` as Parameters<
                        typeof router.push
                      >[0],
                    )
                  }
                />
              </View>
            ) : null}

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
