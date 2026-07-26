import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { Card } from "@/src/components/react-native-reusables/card";
import { ContentSheet } from "@/src/components/app/content-sheet";
import { HelpSheet } from "@/src/components/app/help-sheet";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { ToolStats } from "@/src/components/app/tool-stats";
import { formatClock } from "@/src/features/breathing/cycle-math";
import { useBreathingSessions } from "@/src/features/breathing/queries";
import { breathingPatterns, breathingSlugs } from "@/src/constants/breathing";
import { breathingColorClass } from "@/src/features/breathing/exercise-colors";
import { useBreathingExercises } from "@/src/features/breathing/exercises-queries";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { roomVariables } from "@/src/lib/module-room";
import { useSession } from "@/src/providers/session-provider";
import { cn } from "@/lib/utils";
import { useLocaleFormats } from "@/src/lib/locale-format";
import { formatLocalTimestamp } from "@/src/utils/date";

// Breathing is the "aqua" room (spec #305): the whole screen subtree re-pours
// its surface tokens as teal-blue. Static per-scheme styles, computed once.
const AQUA_ROOM = roomVariables("aqua");

export default function BreathingScreen() {
  const { t } = useTranslation("cbt");
  const { formatDateTime } = useLocaleFormats();
  const { colorScheme } = useColorScheme();
  const { user } = useSession();
  const { data: customExercises } = useBreathingExercises(user?.id ?? null);
  const customIds = (customExercises ?? []).map((e) => e.id);
  const { data: sessions } = useBreathingSessions(user?.id ?? null, 50, customIds);
  const [helpOpen, setHelpOpen] = useState(false);

  const recentCount = sessions?.length ?? 0;

  // Sessions are a recent window; scan for the latest completedAt rather than
  // trusting order, mirroring the sleep tracker's last-logged derivation.
  const lastCompletedAt = (sessions ?? []).reduce<string | null>(
    (latest, s) => (latest === null || s.completedAt > latest ? s.completedAt : latest),
    null,
  );
  const lastWhen = lastCompletedAt ? formatLocalTimestamp(lastCompletedAt) : null;

  const patternName = (exerciseName: string) => {
    if (breathingSlugs.includes(exerciseName)) {
      return t(`breathing.exercises.${exerciseName}.title`);
    }
    return (
      (customExercises ?? []).find((e) => e.id === exerciseName)?.name ??
      t("breathing.deletedExercise")
    );
  };

  const roomStyle = AQUA_ROOM[colorScheme === "dark" ? "dark" : "light"];

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={["bottom", "left", "right"]}
      style={roomStyle}
    >
      <ScrollView contentContainerClassName="grow p-4">
        {/* The field + sheet escape the scroll padding so the aqua field runs
            edge to edge; the sheet re-adds the inset for its sections. */}
        <View className="-mx-4 -mt-4">
          <ModuleHomeHeader
            variant="field"
            addWidgetCategory="breathing"
            hue="aqua"
            icon="air"
            moduleLabel={null}
            tourScope="breathing"
            title={t("breathing.title")}
            description={t("breathing.tagline")}
            actions={[
              { type: "notifications", targetKey: "breathing" },
              {
                type: "info",
                onPress: () => setHelpOpen(true),
                accessibilityLabel: t("breathing.helpLabel"),
              },
            ]}
            meta={
              <ToolStats
                tone="onField"
                accentClassName="text-aqua"
                subline={
                  lastWhen
                    ? t("breathing.hero.last", { when: lastWhen })
                    : t("breathing.hero.never")
                }
                sublineTone={lastWhen ? "accent" : "muted"}
                items={[
                  {
                    value: t("breathing.hero.patterns", { count: breathingPatterns.length }),
                    label: "",
                  },
                  { value: t("breathing.hero.recentSessions", { count: recentCount }), label: "" },
                ]}
              />
            }
          />

          <HelpSheet helpKey="breathing" visible={helpOpen} onDismiss={() => setHelpOpen(false)} />

          <ContentSheet className="px-4">
            <View className="gap-6">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("breathing.startSession")}
                hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                onPress={() => router.push("/tools/breathing/session")}
              >
                <Card variant="soft" tint="aqua" className="flex-row items-center gap-4 px-5 py-4">
                  <View className="size-12 items-center justify-center rounded-xl bg-aqua/10">
                    <Icon name="air" className="size-6 text-aqua" />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="text-[15px] font-semibold tracking-tight">
                      {t("breathing.startSession")}
                    </Text>
                    <Text variant="muted" className="mt-1 text-[13px] leading-snug">
                      {t("breathing.startSessionHint")}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={20} className="text-muted-foreground" />
                </Card>
              </Pressable>

              <View className="gap-3">
                <View className="flex-row items-baseline justify-between">
                  <Text variant="h2" className="text-xl font-bold tracking-tight border-0 pb-0">
                    {t("breathing.yourExercisesTitle")}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("breathing.newExercise")}
                    hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                    onPress={() => router.push("/tools/breathing/new")}
                  >
                    <Text className="text-sm font-semibold text-aqua">
                      {t("breathing.newExercise")}
                    </Text>
                  </Pressable>
                </View>

                {customExercises && customExercises.length > 0 ? (
                  customExercises.map((exercise) => {
                    const chip = breathingColorClass(exercise.color);
                    return (
                      <View key={exercise.id} className="flex-row items-center gap-2">
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={exercise.name}
                          hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                          onPress={() =>
                            router.push({
                              pathname: "/tools/breathing/session",
                              params: { pattern: exercise.id },
                            })
                          }
                          className={cn(
                            "flex-1 flex-row items-center gap-3 rounded-xl border p-4 active:opacity-80",
                            chip.border,
                            chip.bg,
                          )}
                        >
                          <View
                            className={cn("size-3 rounded-full border", chip.border, chip.bg)}
                          />
                          <Text className="flex-1 text-[15px] font-semibold tracking-tight">
                            {exercise.name}
                          </Text>
                          <Text variant="muted" className="text-xs tabular-nums">
                            {t("breathing.cycles", { count: exercise.cycles })}
                          </Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={t("breathing.editExercise", { name: exercise.name })}
                          hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                          onPress={() =>
                            router.push({
                              pathname: "/tools/breathing/new",
                              params: { id: exercise.id },
                            })
                          }
                          className="p-2"
                        >
                          <Icon name="edit" size={18} className="text-muted-foreground" />
                        </Pressable>
                      </View>
                    );
                  })
                ) : (
                  <Text variant="muted" className="text-sm">
                    {t("breathing.noExercises")}
                  </Text>
                )}
              </View>

              <View className="gap-3">
                <Text variant="h2" className="text-xl font-bold tracking-tight border-0 pb-0">
                  {t("breathing.history.title")}
                </Text>

                {!sessions || sessions.length === 0 ? (
                  <Text variant="muted" className="text-sm">
                    {t("breathing.history.empty")}
                  </Text>
                ) : (
                  sessions.map((s) => (
                    <Card key={s.id} variant="soft" tint="aqua" className="px-5 py-4 gap-0">
                      <View className="flex-row items-center justify-between gap-2">
                        <Text className="flex-1 text-[15px] font-semibold tracking-tight">
                          {patternName(s.exerciseName)}
                        </Text>
                        <Text className="text-sm font-semibold tabular-nums text-aqua">
                          {s.durationSeconds != null
                            ? formatClock(s.durationSeconds)
                            : t("breathing.minutes", { value: s.durationMinutes })}
                        </Text>
                      </View>
                      <View className="mt-1 flex-row items-center justify-between">
                        <Text variant="muted" className="text-xs tabular-nums">
                          {s.cycles != null ? t("breathing.cycles", { count: s.cycles }) : ""}
                        </Text>
                        <Text variant="muted" className="text-xs">
                          {formatDateTime(s.completedAt)}
                        </Text>
                      </View>
                    </Card>
                  ))
                )}
              </View>
            </View>
          </ContentSheet>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
