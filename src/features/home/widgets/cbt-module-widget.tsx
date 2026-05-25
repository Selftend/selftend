import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import type { CbtProgramView } from "@/src/features/cbt/derive-program";
import { useCbtProgram } from "@/src/features/cbt/use-cbt-program";
import { useActivities } from "@/src/features/activities/queries";
import { useSelfCareLog } from "@/src/features/self-care/queries";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useSelectedDate } from "@/src/stores/selected-date-store";

function ProgramSummary({ program }: { program: CbtProgramView }) {
  const { t } = useTranslation(["navigation", "cbt"]);

  // Progress bar: phase-based fraction (milestones done / total milestones in current phase)
  const milestoneDone = program.phase?.milestones.filter((m) => m.done).length ?? 0;
  const milestoneTotal = program.phase?.milestones.length ?? 0;
  const progressUnits =
    program.status === "graduated"
      ? program.totalPhases
      : program.phaseIndex + (milestoneTotal > 0 ? milestoneDone / milestoneTotal : 0);
  const progressPercent =
    program.totalPhases > 0 ? Math.min(100, (progressUnits / program.totalPhases) * 100) : 0;

  const title =
    program.status === "in_progress"
      ? t("program.phaseProgress", {
          ns: "cbt",
          current: program.phaseIndex + 1,
          total: program.totalPhases,
        })
      : program.status === "graduated"
        ? t("program.graduationTitle", { ns: "cbt" })
        : t("today.dashboard.cbtModuleProgramReady");

  const description =
    program.status === "in_progress"
      ? program.phaseReady
        ? t("program.ready", { ns: "cbt" })
        : t("program.phaseTasksDone", { ns: "cbt", done: milestoneDone, total: milestoneTotal })
      : program.status === "graduated"
        ? t("today.dashboard.cbtModuleProgramCompleteDesc")
        : t("today.dashboard.cbtModuleProgramReadyDesc");

  return (
    <Pressable
      accessibilityLabel={`${title}. ${description}`}
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={() => router.push("/modules/cbt")}
      className="gap-2 rounded-xl border border-act/30 bg-act/5 p-3 active:bg-act/10"
      role="button"
    >
      <View className="flex-row items-center gap-3">
        <View className="size-8 items-center justify-center rounded-lg bg-act/15">
          <Icon name="flag" className="size-5 text-act" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold">{title}</Text>
          <Text variant="muted" className="text-xs">
            {description}
          </Text>
        </View>
        <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
      </View>
      <View className="h-1.5 overflow-hidden rounded-full bg-muted">
        <View className="h-1.5 rounded-full bg-act" style={{ width: `${progressPercent}%` }} />
      </View>
    </Pressable>
  );
}

export function CbtModuleWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { selectedDate: todayKey } = useSelectedDate();

  const { program } = useCbtProgram(userId || null);
  const { data: records } = useThoughtRecords(userId);
  const { data: activities } = useActivities(userId);
  const { data: selfCareLog } = useSelfCareLog(userId, todayKey);

  const recordsToday = records?.filter((r) => r.createdAt.startsWith(todayKey)).length ?? 0;
  const scheduledToday = activities?.filter((a) => a.scheduledAt?.startsWith(todayKey)) ?? [];
  const completedActivities = scheduledToday.filter((a) => a.completedAt !== null).length;
  const selfCareDone = Boolean(selfCareLog);

  const stats = [
    {
      label: t("today.dashboard.cbtModuleRecords"),
      value: String(recordsToday),
      done: recordsToday > 0,
    },
    {
      label: t("today.dashboard.cbtModuleActivities"),
      value: scheduledToday.length > 0 ? `${completedActivities}/${scheduledToday.length}` : "-",
      done: scheduledToday.length > 0 && completedActivities === scheduledToday.length,
    },
    {
      label: t("today.dashboard.cbtModuleSelfCare"),
      value: selfCareDone ? t("today.dashboard.done") : "-",
      done: selfCareDone,
    },
  ];

  return (
    <Card className="border-primary/30">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-3">
          <View className="size-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/15">
            <Text className="text-sm font-bold tracking-wider text-primary">CBT</Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold">{t("today.modules.cbtName")}</Text>
            <Text variant="muted" className="text-xs">
              {t("today.dashboard.cbtModuleSubtitle")}
            </Text>
          </View>
        </View>

        <ProgramSummary program={program} />

        <View className="flex-row gap-2">
          {stats.map((stat) => (
            <View
              key={stat.label}
              className={cn(
                "flex-1 gap-0.5 rounded-lg border px-2 py-2",
                stat.done ? "border-primary/30 bg-primary/5" : "border-border bg-background",
              )}
            >
              <Text
                className="text-[10px] uppercase tracking-wider text-muted-foreground"
                numberOfLines={1}
              >
                {stat.label}
              </Text>
              <Text className={cn("text-base font-semibold", stat.done && "text-primary")}>
                {stat.value}
              </Text>
            </View>
          ))}
        </View>

        <View className="flex-row items-center justify-between">
          <Button size="sm" variant="outline" onPress={() => router.push("/modules/cbt/new")}>
            <Icon name="add" className="size-4" />
            <Text>{t("today.dashboard.newRecord")}</Text>
          </Button>
          <Button size="sm" variant="ghost" onPress={() => router.push("/modules/cbt")}>
            <Text className="text-muted-foreground">{t("today.dashboard.openCbt")}</Text>
            <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}
