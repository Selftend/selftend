import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useIsFocused } from "@react-navigation/native";
import { CircleHelp } from "lucide-react-native";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { AccessibleCardLink } from "@/src/components/app/accessible-card-link";
import { CbtOnboarding } from "@/src/components/app/cbt-onboarding-modal";
import { MoodLogSheet } from "@/src/components/app/mood-log-sheet";
import { mergeUserPreferences } from "@/src/features/modules/types";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { useGoals } from "@/src/features/goals/queries";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { useCbtInsights } from "@/src/features/cbt/use-cbt-insights";
import { useRecoveryPlan } from "@/src/features/recovery/queries";
import { useSession } from "@/src/providers/session-provider";

export default function CbtHomeScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const { data: preferences, isLoading: prefsLoading } = useUserPreferences(user?.id ?? null);
  const cbtOnboardingMutation = useUpdateUserPreferences(user?.id ?? null);
  const isFocused = useIsFocused();
  const [showMoodSheet, setShowMoodSheet] = useState(false);
  const [forceOnboarding, setForceOnboarding] = useState(false);

  const { data: goals } = useGoals(user?.id ?? null);
  const { data: thoughtRecords } = useThoughtRecords(user?.id ?? null);
  const { data: recoveryPlan } = useRecoveryPlan(user?.id ?? null);
  const { beliefReviewSuggestions, exerciseMoodLift, slogan, topDistortions } = useCbtInsights(
    user?.id ?? null,
  );

  const showCbtOnboarding =
    forceOnboarding ||
    (isFocused && !prefsLoading && Boolean(preferences) && !preferences?.cbtOnboardingCompleted);

  const activeGoals = goals?.filter((g) => g.status === "active").slice(0, 2) ?? [];
  const latestRecord = thoughtRecords?.[0] ?? null;
  const personalSlogan = recoveryPlan?.personalSlogan.trim() || slogan;
  const topDistortion = topDistortions[0] ?? null;
  const otherDistortions = topDistortions.slice(1);
  const hasInsights =
    Boolean(topDistortion) || Boolean(exerciseMoodLift) || beliefReviewSuggestions.length > 0;

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

  const strategies = [
    { key: "goals", route: "/cbt/goals", label: t("dashboard.strategies.goals") },
    { key: "activities", route: "/cbt/activities", label: t("dashboard.strategies.activities") },
    { key: "thoughts", route: "/cbt/new", label: t("dashboard.strategies.thoughts") },
    { key: "values", route: "/cbt/values", label: t("dashboard.strategies.values") },
    { key: "beliefs", route: "/cbt/beliefs", label: t("dashboard.strategies.beliefs") },
    { key: "exposure", route: "/cbt/exposure", label: t("dashboard.strategies.exposure") },
    { key: "worry", route: "/cbt/worry", label: t("dashboard.strategies.worry") },
    {
      key: "mindfulness",
      route: "/cbt/mindfulness",
      label: t("dashboard.strategies.mindfulness"),
    },
    { key: "tasks", route: "/cbt/tasks", label: t("dashboard.strategies.tasks") },
    { key: "anger", route: "/cbt/anger", label: t("dashboard.strategies.anger") },
    { key: "selfCare", route: "/cbt/self-care", label: t("dashboard.strategies.selfCare") },
    { key: "recovery", route: "/cbt/recovery", label: t("dashboard.strategies.recovery") },
    {
      key: "weeklyReview",
      route: "/cbt/weekly-review",
      label: t("dashboard.strategies.weeklyReview"),
    },
  ];

  return (
    <>
      <CbtOnboarding
        errorMessage={cbtOnboardingMutation.isError ? t("onboarding.error") : undefined}
        isPending={cbtOnboardingMutation.isPending}
        onComplete={(concerns) => void completeCbtOnboarding(concerns)}
        onDismiss={forceOnboarding ? () => setForceOnboarding(false) : undefined}
        visible={showCbtOnboarding}
      />
      <MoodLogSheet onClose={() => setShowMoodSheet(false)} visible={showMoodSheet} />
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <Text variant="h1">{t("home.title")}</Text>
                <Pressable
                  accessibilityLabel={t("home.onboardingHint")}
                  accessibilityRole="button"
                  onPress={() => setForceOnboarding(true)}
                  hitSlop={8}
                >
                  <Icon as={CircleHelp} className="text-muted-foreground" size={20} />
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

            {/* Quick actions */}
            <View className="gap-3">
              <Text variant="h3">{t("dashboard.quickActions")}</Text>
              <View className="flex-row flex-wrap gap-3">
                <View className="flex-1">
                  <Button onPress={() => router.push("/cbt/new")}>
                    <Text>{t("home.newRecord")}</Text>
                  </Button>
                </View>
                <View className="flex-1">
                  <Button onPress={() => setShowMoodSheet(true)} variant="secondary">
                    <Text>{t("dashboard.logMood")}</Text>
                  </Button>
                </View>
              </View>
              <View className="flex-row flex-wrap gap-3">
                <View className="flex-1">
                  <Button onPress={() => router.push("/cbt/activities/new")} variant="secondary">
                    <Text>{t("dashboard.scheduleActivity")}</Text>
                  </Button>
                </View>
                <View className="flex-1">
                  <Button onPress={() => router.push("/cbt/goals/new")} variant="secondary">
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
                  <Button onPress={() => router.push("/cbt/goals")} size="sm" variant="ghost">
                    <Text>{t("dashboard.seeAll")}</Text>
                  </Button>
                </View>
                {activeGoals.map((goal) => (
                  <AccessibleCardLink
                    key={goal.id}
                    title={goal.title}
                    description={t(`goals.domain.${goal.lifeDomain}`)}
                    onPress={() => router.push(`/cbt/goals/${goal.id}`)}
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
              </View>
            ) : null}

            {/* Strategy grid */}
            <View className="gap-3">
              <Text variant="h3">{t("dashboard.strategies.title")}</Text>
              <View className="flex-row flex-wrap gap-3">
                {strategies.map((s) => (
                  <View key={s.key} className="w-[48%]">
                    <AccessibleCardLink
                      title={s.label}
                      onPress={() => router.push(s.route as Parameters<typeof router.push>[0])}
                    />
                  </View>
                ))}
              </View>
            </View>

            {/* Learn */}
            <AccessibleCardLink
              description={t("home.distortionGuideDescription")}
              onPress={() => router.push("/cbt/learn")}
              title={t("home.distortionGuide")}
            />

            {/* Recent thought record */}
            {latestRecord ? (
              <View className="gap-3">
                <Text variant="h3">{t("dashboard.recentThought")}</Text>
                <AccessibleCardLink
                  title={latestRecord.automaticThought}
                  description={latestRecord.balancedThought}
                  onPress={() => router.push(`/cbt/${latestRecord.id}`)}
                />
              </View>
            ) : null}

            <AccessibleCardLink
              description={t("home.recordHistoryDescription")}
              onPress={() => router.push("/cbt/history")}
              title={t("home.recordHistory")}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
