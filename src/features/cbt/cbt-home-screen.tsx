import { router } from "expo-router";
import { Pressable, ScrollView, useColorScheme, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useIsFocused } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityIcon,
  AnchorIcon,
  ArrowRightIcon,
  BookHeartIcon,
  BookOpenIcon,
  BrainIcon,
  CalendarCheckIcon,
  CheckCircle2Icon,
  CircleHelpIcon,
  CompassIcon,
  FlameIcon,
  FootprintsIcon,
  HeartIcon,
  LayersIcon,
  MapIcon,
  NotebookPenIcon,
  ScrollTextIcon,
  SunMediumIcon,
  SmilePlusIcon,
  TargetIcon,
  WandSparklesIcon,
  WindIcon,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { AccessibleCardLink } from "@/src/components/app/accessible-card-link";
import { BackButton } from "@/src/components/app/back-button";
import { CbtOnboarding } from "@/src/components/app/cbt-onboarding-modal";
import { cn } from "@/lib/utils";
import { useActivities } from "@/src/features/activities/queries";
import type { ActivityLog } from "@/src/features/activities/types";
import { mergeUserPreferences } from "@/src/features/modules/types";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { useGoals } from "@/src/features/goals/queries";
import { useMoodLogs } from "@/src/features/mood/queries";
import { getMoodSummary } from "@/src/features/mood/summaries";
import { useTasks } from "@/src/features/procrastination/queries";
import type { ProcrastinationTask } from "@/src/features/procrastination/types";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { useCbtInsights } from "@/src/features/cbt/use-cbt-insights";
import { useRecoveryPlan } from "@/src/features/recovery/queries";
import { useSelfCareLog } from "@/src/features/self-care/queries";
import { useSession } from "@/src/providers/session-provider";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { getConcernGuidance, type GuidedStrategyKey } from "@/src/features/cbt/concern-guidance";

type Pillar = "think" | "act" | "be";

interface PillarStrategy {
  key: string;
  route: string;
  icon: LucideIcon;
  labelKey: string;
  descKey: string;
}

interface SharedTool {
  key: string;
  route: string;
  icon: LucideIcon;
  labelKey: string;
}

const PILLAR_STRATEGIES: Record<Pillar, PillarStrategy[]> = {
  think: [
    {
      key: "thoughts",
      route: "/modules/cbt/new",
      icon: ScrollTextIcon,
      labelKey: "dashboard.strategies.thoughts",
      descKey: "pillars.strategyDescriptions.thoughts",
    },
    {
      key: "beliefs",
      route: "/modules/cbt/beliefs",
      icon: AnchorIcon,
      labelKey: "dashboard.strategies.beliefs",
      descKey: "pillars.strategyDescriptions.beliefs",
    },
    {
      key: "worry",
      route: "/modules/cbt/worry",
      icon: BrainIcon,
      labelKey: "dashboard.strategies.worry",
      descKey: "pillars.strategyDescriptions.worry",
    },
    {
      key: "distortions",
      route: "/modules/cbt/learn",
      icon: BookOpenIcon,
      labelKey: "home.distortionGuide",
      descKey: "pillars.strategyDescriptions.distortions",
    },
  ],
  act: [
    {
      key: "goals",
      route: "/modules/cbt/goals",
      icon: TargetIcon,
      labelKey: "dashboard.strategies.goals",
      descKey: "pillars.strategyDescriptions.goals",
    },
    {
      key: "values",
      route: "/modules/cbt/values",
      icon: CompassIcon,
      labelKey: "dashboard.strategies.values",
      descKey: "pillars.strategyDescriptions.values",
    },
    {
      key: "activities",
      route: "/modules/cbt/activities",
      icon: ActivityIcon,
      labelKey: "dashboard.strategies.activities",
      descKey: "pillars.strategyDescriptions.activities",
    },
    {
      key: "exposure",
      route: "/modules/cbt/exposure",
      icon: LayersIcon,
      labelKey: "dashboard.strategies.exposure",
      descKey: "pillars.strategyDescriptions.exposure",
    },
    {
      key: "tasks",
      route: "/modules/cbt/tasks",
      icon: FootprintsIcon,
      labelKey: "dashboard.strategies.tasks",
      descKey: "pillars.strategyDescriptions.tasks",
    },
    {
      key: "anger",
      route: "/modules/cbt/anger",
      icon: FlameIcon,
      labelKey: "dashboard.strategies.anger",
      descKey: "pillars.strategyDescriptions.anger",
    },
  ],
  be: [
    {
      key: "selfCare",
      route: "/modules/cbt/self-care",
      icon: HeartIcon,
      labelKey: "dashboard.strategies.selfCare",
      descKey: "pillars.strategyDescriptions.selfCare",
    },
  ],
};

const BE_SHARED_TOOLS: SharedTool[] = [
  {
    key: "mindfulness",
    route: "/tools/mindfulness",
    icon: WindIcon,
    labelKey: "navigation:sidebar.mindfulness",
  },
  {
    key: "meditation",
    route: "/tools/meditation",
    icon: SunMediumIcon,
    labelKey: "navigation:sidebar.meditation",
  },
  {
    key: "moodTracker",
    route: "/tools/mood-tracker",
    icon: SmilePlusIcon,
    labelKey: "navigation:sidebar.moodTracker",
  },
  {
    key: "gratitudeLog",
    route: "/tools/gratitude-log",
    icon: BookHeartIcon,
    labelKey: "navigation:sidebar.gratitudeLog",
  },
  {
    key: "journal",
    route: "/tools/journal",
    icon: NotebookPenIcon,
    labelKey: "navigation:sidebar.journal",
  },
];

const REVIEW_LINKS = [
  {
    key: "weeklyReview",
    route: "/modules/cbt/weekly-review",
    icon: CalendarCheckIcon,
    labelKey: "dashboard.strategies.weeklyReview",
    descKey: "pillars.strategyDescriptions.weeklyReview",
  },
  {
    key: "recovery",
    route: "/modules/cbt/recovery",
    icon: MapIcon,
    labelKey: "dashboard.strategies.recovery",
    descKey: "pillars.strategyDescriptions.recovery",
  },
] as const;

const GUIDANCE_STRATEGIES: Record<
  GuidedStrategyKey,
  {
    route: string;
    icon: LucideIcon;
    labelKey: string;
    descKey: string;
    pillar: Pillar;
  }
> = {
  activities: {
    route: "/modules/cbt/activities",
    icon: ActivityIcon,
    labelKey: "dashboard.strategies.activities",
    descKey: "pillars.strategyDescriptions.activities",
    pillar: "act",
  },
  anger: {
    route: "/modules/cbt/anger",
    icon: FlameIcon,
    labelKey: "dashboard.strategies.anger",
    descKey: "pillars.strategyDescriptions.anger",
    pillar: "act",
  },
  beliefs: {
    route: "/modules/cbt/beliefs",
    icon: AnchorIcon,
    labelKey: "dashboard.strategies.beliefs",
    descKey: "pillars.strategyDescriptions.beliefs",
    pillar: "think",
  },
  exposure: {
    route: "/modules/cbt/exposure",
    icon: LayersIcon,
    labelKey: "dashboard.strategies.exposure",
    descKey: "pillars.strategyDescriptions.exposure",
    pillar: "act",
  },
  goals: {
    route: "/modules/cbt/goals",
    icon: TargetIcon,
    labelKey: "dashboard.strategies.goals",
    descKey: "pillars.strategyDescriptions.goals",
    pillar: "act",
  },
  mindfulness: {
    route: "/tools/mindfulness",
    icon: WindIcon,
    labelKey: "dashboard.strategies.mindfulness",
    descKey: "pillars.strategyDescriptions.mindfulness",
    pillar: "be",
  },
  selfCare: {
    route: "/modules/cbt/self-care",
    icon: HeartIcon,
    labelKey: "dashboard.strategies.selfCare",
    descKey: "pillars.strategyDescriptions.selfCare",
    pillar: "be",
  },
  tasks: {
    route: "/modules/cbt/tasks",
    icon: FootprintsIcon,
    labelKey: "dashboard.strategies.tasks",
    descKey: "pillars.strategyDescriptions.tasks",
    pillar: "act",
  },
  thoughts: {
    route: "/modules/cbt/new",
    icon: ScrollTextIcon,
    labelKey: "dashboard.strategies.thoughts",
    descKey: "pillars.strategyDescriptions.thoughts",
    pillar: "think",
  },
  worry: {
    route: "/modules/cbt/worry",
    icon: BrainIcon,
    labelKey: "dashboard.strategies.worry",
    descKey: "pillars.strategyDescriptions.worry",
    pillar: "think",
  },
};

function getDateKey(value: string | null | undefined) {
  return value?.slice(0, 10) ?? "";
}

function getLocalDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodaysActivities(activities: ActivityLog[] | undefined, today: string) {
  return (
    activities
      ?.filter((activity) => !activity.completedAt && getDateKey(activity.scheduledAt) === today)
      .slice(0, 3) ?? []
  );
}

function getOpenTasks(tasks: ProcrastinationTask[] | undefined) {
  return tasks?.filter((task) => task.status === "active").slice(0, 3) ?? [];
}

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
        pointerEvents="none"
        style={{ position: "absolute", left: 0, right: 0, top: 0, height: 280 }}
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
            <Icon as={WandSparklesIcon} className="size-3 text-muted-foreground" size={12} />
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
      onPress={() => router.push(strategy.route as Parameters<typeof router.push>[0])}
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
            <Icon as={strategy.icon} className={cn("size-5", PILLAR_TEXT_CLASS[pillar])} />
          </View>
          <Icon as={ArrowRightIcon} className="size-4 text-muted-foreground" />
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
      onPress={() => router.push(tool.route as Parameters<typeof router.push>[0])}
      className="min-w-[150px] flex-1 basis-[150px] flex-row items-center gap-3 rounded-xl border border-border bg-card p-3 active:bg-accent/40"
      role="button"
    >
      <View
        className={cn(
          "size-9 items-center justify-center rounded-lg",
          PILLAR_ICON_BG_CLASS[pillar],
        )}
      >
        <Icon as={tool.icon} className={cn("size-5", PILLAR_TEXT_CLASS[pillar])} />
      </View>
      <Text className="flex-1 text-sm font-semibold" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function GuidanceCard({ strategy }: { strategy: (typeof GUIDANCE_STRATEGIES)[GuidedStrategyKey] }) {
  const { t } = useTranslation("cbt");

  return (
    <Pressable
      accessibilityHint={t(strategy.descKey)}
      accessibilityLabel={t(strategy.labelKey)}
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={() => router.push(strategy.route as Parameters<typeof router.push>[0])}
      className="min-w-[190px] flex-1 basis-[190px] flex-row items-center gap-3 rounded-xl border border-border bg-card p-3 active:bg-accent/40"
      role="button"
    >
      <View
        className={cn(
          "size-9 items-center justify-center rounded-lg",
          PILLAR_ICON_BG_CLASS[strategy.pillar],
        )}
      >
        <Icon as={strategy.icon} className={cn("size-5", PILLAR_TEXT_CLASS[strategy.pillar])} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-sm font-semibold">{t(strategy.labelKey)}</Text>
        <Text variant="muted" className="text-xs">
          {t(strategy.descKey)}
        </Text>
      </View>
    </Pressable>
  );
}

export default function CbtHomeScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const { data: preferences, isLoading: prefsLoading } = useUserPreferences(user?.id ?? null);
  const cbtOnboardingMutation = useUpdateUserPreferences(user?.id ?? null);
  const isFocused = useIsFocused();
  const [forceOnboarding, setForceOnboarding] = useState(false);

  const { data: goals } = useGoals(user?.id ?? null);
  const { data: activities } = useActivities(user?.id ?? null);
  const { data: tasks } = useTasks(user?.id ?? null);
  const { data: moodLogs } = useMoodLogs(user?.id ?? null, 180);
  const today = getLocalDateKey(new Date());
  const { data: todaySelfCareLog } = useSelfCareLog(user?.id ?? null, today);
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

  const showCbtOnboarding =
    forceOnboarding ||
    (isFocused && !prefsLoading && Boolean(preferences) && !preferences?.cbtOnboardingCompleted);

  const todaysMoodLogs =
    moodLogs?.filter((log) => getLocalDateKey(new Date(log.loggedAt)) === today) ?? [];
  const morningCheckInComplete = todaysMoodLogs.length > 0;
  const eveningCheckInComplete = Boolean(todaySelfCareLog);
  const activeGoals = goals?.filter((g) => g.status === "active").slice(0, 2) ?? [];
  const scheduledToday = getTodaysActivities(activities, today);
  const openTasks = getOpenTasks(tasks);
  const selectedConcerns = preferences?.selectedConcerns ?? [];
  const guidanceStrategies = getConcernGuidance(selectedConcerns).map(
    (strategyKey) => GUIDANCE_STRATEGIES[strategyKey],
  );
  const selectedConcernLabels = selectedConcerns
    .map((concern) => t(`onboarding.concerns.${concern}`, { defaultValue: concern }))
    .join(", ");
  const hasDailyPlan = scheduledToday.length > 0 || openTasks.length > 0;
  const sevenDayMood = getMoodSummary(moodLogs, 7);
  const thirtyDayMood = getMoodSummary(moodLogs, 30);
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

  const completeCbtOnboarding = async (selectedConcerns: string[]) => {
    if (!preferences) return;
    try {
      await cbtOnboardingMutation.mutateAsync(
        mergeUserPreferences(preferences, {
          cbtOnboardingCompleted: true,
          selectedConcerns,
        }),
      );
      setForceOnboarding(false);
    } catch {
      // Error state is shown inside the modal.
    }
  };

  return (
    <>
      <CbtOnboarding
        errorMessage={cbtOnboardingMutation.isError ? t("onboarding.error") : undefined}
        isPending={cbtOnboardingMutation.isPending}
        onComplete={(concerns) => void completeCbtOnboarding(concerns)}
        onDismiss={forceOnboarding ? () => setForceOnboarding(false) : undefined}
        visible={showCbtOnboarding}
      />
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <BackButton showLabel={false} className="-ml-2" />
                <Text variant="h1">{t("home.title")}</Text>
                <Pressable
                  accessibilityLabel={t("home.onboardingHint")}
                  accessibilityRole="button"
                  onPress={() => setForceOnboarding(true)}
                  hitSlop={8}
                >
                  <Icon as={CircleHelpIcon} className="text-muted-foreground" size={20} />
                </Pressable>
              </View>
              <Text variant="muted">{t("home.description")}</Text>
            </View>

            {personalSlogan ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t("dashboard.sloganTitle")}</CardTitle>
                  <CardDescription className="italic">{`"${personalSlogan}"`}</CardDescription>
                </CardHeader>
              </Card>
            ) : null}

            {/* Check-in loop */}
            <View className="gap-3">
              <Text variant="h3">{t("dashboard.checkIn.title")}</Text>
              <View className="flex-row flex-wrap gap-3">
                <View className="min-w-[260px] flex-1 basis-[260px]">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("dashboard.checkIn.morningTitle")}</CardTitle>
                      <CardDescription>
                        {morningCheckInComplete
                          ? t("dashboard.checkIn.morningComplete")
                          : t("dashboard.checkIn.morningPending")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <View className="flex-row flex-wrap gap-2">
                        <Button
                          accessibilityLabel={
                            morningCheckInComplete
                              ? t("dashboard.checkIn.logMoodCompleteLabel")
                              : t("dashboard.logMood")
                          }
                          onPress={() =>
                            router.push(
                              "/tools/mood-tracker/new" as Parameters<typeof router.push>[0],
                            )
                          }
                          size="sm"
                        >
                          {morningCheckInComplete ? (
                            <Icon
                              as={CheckCircle2Icon}
                              className="size-4 text-primary-foreground"
                            />
                          ) : null}
                          <Text>{t("dashboard.logMood")}</Text>
                        </Button>
                        <Button
                          onPress={() =>
                            router.push(
                              "/modules/cbt/activities" as Parameters<typeof router.push>[0],
                            )
                          }
                          size="sm"
                          variant="outline"
                        >
                          <Text>{t("dashboard.checkIn.reviewActivities")}</Text>
                        </Button>
                      </View>
                    </CardContent>
                  </Card>
                </View>

                <View className="min-w-[260px] flex-1 basis-[260px]">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("dashboard.checkIn.eveningTitle")}</CardTitle>
                      <CardDescription>
                        {eveningCheckInComplete
                          ? t("dashboard.checkIn.eveningComplete")
                          : t("dashboard.checkIn.eveningPending")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <View className="flex-row flex-wrap gap-2">
                        <Button
                          onPress={() =>
                            router.push(
                              "/modules/cbt/self-care" as Parameters<typeof router.push>[0],
                            )
                          }
                          size="sm"
                        >
                          <Text>{t("dashboard.checkIn.openSelfCare")}</Text>
                        </Button>
                        <Button
                          onPress={() =>
                            router.push(
                              "/tools/mood-tracker/new" as Parameters<typeof router.push>[0],
                            )
                          }
                          size="sm"
                          variant="outline"
                        >
                          <Text>{t("dashboard.logMood")}</Text>
                        </Button>
                      </View>
                    </CardContent>
                  </Card>
                </View>
              </View>
            </View>

            {guidanceStrategies.length > 0 ? (
              <View className="gap-3">
                <View className="gap-1">
                  <Text variant="h3">{t("dashboard.guidance.title")}</Text>
                  <Text variant="muted" className="max-w-[64ch]">
                    {t("dashboard.guidance.description", { concerns: selectedConcernLabels })}
                  </Text>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  {guidanceStrategies.map((strategy) => (
                    <GuidanceCard key={strategy.route} strategy={strategy} />
                  ))}
                </View>
              </View>
            ) : null}

            {/* Daily plan */}
            <View className="gap-3">
              <Text variant="h3">{t("dashboard.todayPlan.title")}</Text>
              {scheduledToday.length > 0 ? (
                <View className="gap-2">
                  <Text className="font-medium">
                    {t("dashboard.todayPlan.scheduledActivities")}
                  </Text>
                  {scheduledToday.map((activity) => (
                    <AccessibleCardLink
                      key={activity.id}
                      title={activity.activityName}
                      description={
                        activity.scheduledAt
                          ? t("dashboard.todayPlan.activityScheduled", {
                              value: activity.scheduledAt,
                            })
                          : undefined
                      }
                      onPress={() =>
                        router.push(
                          `/modules/cbt/activities/${activity.id}` as Parameters<
                            typeof router.push
                          >[0],
                        )
                      }
                    />
                  ))}
                </View>
              ) : null}

              {openTasks.length > 0 ? (
                <View className="gap-2">
                  <Text className="font-medium">{t("dashboard.todayPlan.openTasks")}</Text>
                  {openTasks.map((task) => (
                    <AccessibleCardLink
                      key={task.id}
                      title={task.taskDescription}
                      description={
                        task.deadline
                          ? t("dashboard.todayPlan.taskDue", {
                              value: task.deadline,
                            })
                          : undefined
                      }
                      onPress={() =>
                        router.push(
                          `/modules/cbt/tasks/${task.id}` as Parameters<typeof router.push>[0],
                        )
                      }
                    />
                  ))}
                </View>
              ) : null}

              {!hasDailyPlan ? (
                <Card>
                  <CardHeader>
                    <CardTitle>{t("dashboard.todayPlan.emptyTitle")}</CardTitle>
                    <CardDescription>{t("dashboard.todayPlan.emptyDescription")}</CardDescription>
                  </CardHeader>
                </Card>
              ) : null}
            </View>

            {/* Mood summaries */}
            <View className="gap-3">
              <Text variant="h3">{t("dashboard.moodSummary.title")}</Text>
              <View className="flex-row flex-wrap gap-3">
                {[
                  { key: "sevenDay", summary: sevenDayMood },
                  { key: "thirtyDay", summary: thirtyDayMood },
                ].map(({ key, summary }) => (
                  <View
                    key={key}
                    className="min-w-[180px] flex-1 basis-[180px] gap-1 rounded-md border border-border p-3"
                  >
                    <Text className="font-medium">{t(`dashboard.moodSummary.${key}`)}</Text>
                    <Text className="text-2xl font-semibold">
                      {summary.average === null
                        ? t("dashboard.moodSummary.noData")
                        : t("dashboard.moodSummary.average", {
                            average: summary.average,
                          })}
                    </Text>
                    <Text variant="muted">
                      {t("dashboard.moodSummary.count", { count: summary.count })}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Quick actions */}
            <View className="gap-3">
              <Text variant="h3">{t("dashboard.quickActions")}</Text>
              <View className="flex-row flex-wrap gap-3">
                <View className="min-w-[160px] flex-1 basis-[160px]">
                  <Button
                    onPress={() =>
                      router.push("/modules/cbt/new" as Parameters<typeof router.push>[0])
                    }
                  >
                    <Text>{t("home.newRecord")}</Text>
                  </Button>
                </View>
                <View className="min-w-[160px] flex-1 basis-[160px]">
                  <Button
                    onPress={() =>
                      router.push("/tools/mood-tracker/new" as Parameters<typeof router.push>[0])
                    }
                    variant="secondary"
                  >
                    <Text>{t("dashboard.logMood")}</Text>
                  </Button>
                </View>
                <View className="min-w-[160px] flex-1 basis-[160px]">
                  <Button
                    onPress={() =>
                      router.push(
                        "/modules/cbt/activities/new" as Parameters<typeof router.push>[0],
                      )
                    }
                    variant="secondary"
                  >
                    <Text>{t("dashboard.scheduleActivity")}</Text>
                  </Button>
                </View>
                <View className="min-w-[160px] flex-1 basis-[160px]">
                  <Button
                    onPress={() =>
                      router.push("/modules/cbt/goals/new" as Parameters<typeof router.push>[0])
                    }
                    variant="secondary"
                  >
                    <Text>{t("dashboard.newGoal")}</Text>
                  </Button>
                </View>
              </View>
            </View>

            {/* Active goals */}
            {activeGoals.length > 0 ? (
              <View className="gap-3">
                <View className="flex-row items-center justify-between">
                  <Text variant="h3">{t("dashboard.activeGoals")}</Text>
                  <Button
                    onPress={() =>
                      router.push("/modules/cbt/goals" as Parameters<typeof router.push>[0])
                    }
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
                    onPress={() =>
                      router.push(
                        `/modules/cbt/goals/${goal.id}` as Parameters<typeof router.push>[0],
                      )
                    }
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
                />
                <PillarPane
                  pillar="act"
                  titleKey="pillars.act.title"
                  subKey="pillars.act.sub"
                  descKey="pillars.act.description"
                  strategies={PILLAR_STRATEGIES.act}
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
                      onPress={() => router.push(link.route as Parameters<typeof router.push>[0])}
                      className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-4 active:bg-accent/40"
                      role="button"
                    >
                      <View className="size-9 items-center justify-center rounded-lg bg-muted">
                        <Icon as={link.icon} className="size-5 text-foreground" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-semibold">{t(link.labelKey)}</Text>
                        <Text variant="muted" className="text-xs">
                          {t(link.descKey)}
                        </Text>
                      </View>
                      <Icon as={ArrowRightIcon} className="size-4 text-muted-foreground" />
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
              onPress={() =>
                router.push("/modules/cbt/history" as Parameters<typeof router.push>[0])
              }
              className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3 active:bg-accent/40"
              role="button"
            >
              <Text className="flex-1 text-sm font-medium">{t("home.recordHistory")}</Text>
              <Icon as={ArrowRightIcon} className="size-4 text-muted-foreground" />
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
