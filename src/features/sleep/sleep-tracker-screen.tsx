import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent, CardHeader } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { SleepOnboarding } from "@/src/components/app/sleep-onboarding-modal";
import { useSleepLogs } from "@/src/features/sleep/queries";
import { useSession } from "@/src/providers/session-provider";
import { toLocalDateKey, useSelectedDate } from "@/src/stores/selected-date-store";
function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function getDaysAgo(loggedAt: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const entryDay = new Date(loggedAt);
  entryDay.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - entryDay.getTime()) / (1000 * 60 * 60 * 24));
}

function averageDurationMinutes(
  logs: { durationMinutes: number; loggedAt: string }[],
  days: number,
): number | null {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - days + 1);
  const window = logs.filter((l) => new Date(l.loggedAt).getTime() >= cutoff.getTime());
  if (window.length === 0) return null;
  return Math.round(window.reduce((sum, l) => sum + l.durationMinutes, 0) / window.length);
}

function averageQuality(
  logs: { quality: number; loggedAt: string }[],
  days: number,
): number | null {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - days + 1);
  const window = logs.filter((l) => new Date(l.loggedAt).getTime() >= cutoff.getTime());
  if (window.length === 0) return null;
  return Math.round((window.reduce((sum, l) => sum + l.quality, 0) / window.length) * 10) / 10;
}

function relativeLabel(
  loggedAt: string,
  t: ReturnType<typeof useTranslation<"sleep">>["t"],
): string {
  const daysAgo = getDaysAgo(loggedAt);
  if (daysAgo === 0) return t("relativeTime.today");
  if (daysAgo === 1) return t("relativeTime.yesterday");
  return t("relativeTime.daysAgo", { count: daysAgo });
}

export default function SleepTrackerScreen() {
  const { t } = useTranslation("sleep");
  const { t: tc } = useTranslation("common");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: logs } = useSleepLogs(userId, 50);
  const { selectedDate } = useSelectedDate();

  const [forceOnboarding, setForceOnboarding] = useState(false);

  const allLogs = logs ?? [];
  const dayLogs = allLogs.filter((log) => toLocalDateKey(log.loggedAt) === selectedDate);
  const recent = dayLogs.slice(0, 10);
  const sevenDayDuration = averageDurationMinutes(allLogs, 7);
  const thirtyDayDuration = averageDurationMinutes(allLogs, 30);
  const sevenDayQuality = averageQuality(allLogs, 7);
  const thirtyDayQuality = averageQuality(allLogs, 30);

  return (
    <>
      <SleepOnboarding
        visible={forceOnboarding}
        onComplete={() => setForceOnboarding(false)}
        onDismiss={() => setForceOnboarding(false)}
      />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <ModuleHomeHeader
              addWidgetCategory="sleep"
              title={t("title")}
              hue="ink"
              icon="bedtime"
              description={t("description")}
              actions={[
                { type: "notifications", targetKey: "sleep" },
                { type: "info", onPress: () => setForceOnboarding(true) },
              ]}
              meta={
                <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1">
                  {sevenDayDuration !== null ? (
                    <>
                      <Text variant="muted" className="text-xs">
                        {t("hero.avg")} ·{" "}
                        <Text className="text-xs font-bold text-ink">
                          {(sevenDayDuration / 60).toFixed(1)}h
                        </Text>
                      </Text>
                      <Text variant="muted" className="text-xs">
                        {t("hero.quality")} ·{" "}
                        <Text className="text-xs font-bold text-ink">{sevenDayQuality}/5</Text>
                      </Text>
                    </>
                  ) : (
                    <Text variant="muted" className="text-xs">
                      {t("hero.avg")} ·{" "}
                      <Text className="text-xs font-bold text-ink/60">{tc("noData")}</Text>
                    </Text>
                  )}
                  <Text variant="muted" className="text-xs">
                    <Text className="text-xs font-bold text-ink">
                      {t("hero.nights", { count: allLogs.length })}
                    </Text>
                  </Text>
                </View>
              }
            />

            <View className="flex-row gap-3">
              <Button onPress={() => router.push("/tools/sleep/new")} className="self-start">
                <Icon name="bedtime" className="size-4 text-primary-foreground" />
                <Text>{t("cta.log")}</Text>
              </Button>
            </View>

            <View className="gap-3">
              <Text variant="h3">{t("sections.summary")}</Text>
              <View className="flex-row flex-wrap gap-3">
                <SummaryTile
                  label={t("summary.sevenDay")}
                  durationMinutes={sevenDayDuration}
                  quality={sevenDayQuality}
                />
                <SummaryTile
                  label={t("summary.thirtyDay")}
                  durationMinutes={thirtyDayDuration}
                  quality={thirtyDayQuality}
                />
              </View>
            </View>

            <View className="gap-3">
              <Text variant="h3">{t("sections.recent")}</Text>
              {recent.length > 0 ? (
                <View className="gap-3">
                  {recent.map((log) => (
                    <Pressable
                      key={log.id}
                      accessibilityRole="button"
                      accessibilityLabel={t("recent.viewEntry", {
                        when: relativeLabel(log.loggedAt, t),
                      })}
                      onPress={() =>
                        router.push({
                          pathname: "/tools/sleep/[id]",
                          params: { id: log.id },
                        })
                      }
                      className="flex-row items-center gap-4 rounded-2xl border border-border bg-card p-4 active:bg-accent/40"
                      role="button"
                    >
                      <View className="flex-1 gap-1">
                        <View className="flex-row items-center justify-between gap-2">
                          <Text className="text-base font-semibold">
                            {formatDuration(log.durationMinutes)}
                          </Text>
                          <Text variant="muted" className="text-xs">
                            {relativeLabel(log.loggedAt, t)}
                          </Text>
                        </View>
                        <Text variant="muted" className="text-sm">
                          {t(`quality.${log.quality}` as Parameters<typeof t>[0])}
                        </Text>
                      </View>
                      <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text variant="muted">{t("recent.empty")}</Text>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

interface SummaryTileProps {
  label: string;
  durationMinutes: number | null;
  quality: number | null;
}

function SummaryTile({ label, durationMinutes, quality }: SummaryTileProps) {
  const { t } = useTranslation("sleep");
  const hours = durationMinutes !== null ? (durationMinutes / 60).toFixed(1) : null;

  return (
    <Card className="min-w-[180px] flex-1 basis-[180px]">
      <CardHeader>
        <Text variant="muted" className="text-xs uppercase tracking-wide">
          {label}
        </Text>
      </CardHeader>
      <CardContent>
        {hours === null ? (
          <Text className="text-sm">{t("summary.noData")}</Text>
        ) : (
          <View className="gap-1">
            <Text className="text-2xl font-semibold">{t("summary.avgDuration", { hours })}</Text>
            {quality !== null ? (
              <Text variant="muted" className="text-xs">
                {t("summary.avgQuality", { quality })}
              </Text>
            ) : null}
          </View>
        )}
      </CardContent>
    </Card>
  );
}
