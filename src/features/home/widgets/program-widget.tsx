import { router, type Href } from "expo-router";
import { Pressable, useWindowDimensions, View } from "react-native";
import { useTranslation } from "react-i18next";

import { ACT_PROGRAM } from "@/src/features/act/program-definition";
import { CBT_PROGRAM } from "@/src/features/cbt/program-definition";
import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { WidgetCardHeader } from "@/src/features/home/widgets/widget-card-header";
import { useProgramWidgetTaskStatus } from "@/src/features/home/program-widget-status";
import { useUserPreferences } from "@/src/features/settings/queries";

interface CurrentTask {
  key: string;
  labelKey: string;
  route: Href;
  done: boolean;
  isDaily: boolean;
}

export function ProgramWidget({ module, userId }: { module: "cbt" | "act"; userId: string }) {
  const { t } = useTranslation("navigation");
  const { t: tm } = useTranslation(module);
  const { fontScale } = useWindowDimensions();
  const { data: preferences } = useUserPreferences(userId);
  const isCbt = module === "cbt";
  const route: Href = isCbt ? "/modules/cbt" : "/modules/act";
  const startedAt = isCbt ? preferences?.cbtProgramStartedAt : preferences?.actProgramStartedAt;
  const completedAt = isCbt
    ? preferences?.cbtProgramCompletedAt
    : preferences?.actProgramCompletedAt;
  const phaseIndex = isCbt
    ? (preferences?.cbtProgramPhaseIndex ?? 0)
    : (preferences?.actProgramPhaseIndex ?? 0);
  const definitions = isCbt ? CBT_PROGRAM : ACT_PROGRAM;
  const phase = definitions[Math.min(Math.max(phaseIndex, 0), definitions.length - 1)];
  const { data: taskStatuses } = useProgramWidgetTaskStatus({
    userId,
    module,
    enabled: Boolean(startedAt && !completedAt),
  });
  const doneByTask = new Map(taskStatuses?.map((status) => [status.taskKey, status.done]));
  const tasks: CurrentTask[] = phase
    ? [
        ...(phase.dailyPractice ? [{ task: phase.dailyPractice, isDaily: true }] : []),
        ...phase.milestones.map((task) => ({ task, isDaily: false })),
      ]
        .map(({ task, isDaily }) => ({
          key: task.key,
          labelKey: task.labelKey,
          route: task.route,
          done: doneByTask.get(task.key) ?? false,
          isDaily,
        }))
        .sort((left, right) => {
          if (left.done !== right.done) return left.done ? 1 : -1;
          if (left.isDaily !== right.isDaily) return left.isDaily ? -1 : 1;
          return 0;
        })
    : [];
  const visibleGoalCount = fontScale >= 1.5 ? 1 : 2;
  const visibleTasks = tasks.slice(0, visibleGoalCount);
  const remaining = Math.max(0, tasks.length - visibleTasks.length);

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pb-4 pt-4">
        <WidgetCardHeader
          icon="school"
          title={t(`home.widgets.${module}Programme.title`)}
          moduleLabel={tm("module.label")}
          tint={isCbt ? "primary" : "act"}
        />

        {!startedAt ? (
          <>
            <Text variant="muted" className="text-xs" numberOfLines={3}>
              {t("home.programWidget.notEnrolled")}
            </Text>
            <Button
              size="sm"
              variant="outline"
              className="self-start"
              onPress={() => router.push(route)}
            >
              <Text>{t("home.programWidget.viewProgram")}</Text>
            </Button>
          </>
        ) : completedAt ? (
          <>
            <View className="flex-row items-center gap-2">
              <Icon name="celebration" className="size-5 text-primary" />
              <Text className="text-sm font-semibold">{t("home.programWidget.completed")}</Text>
            </View>
            <Text variant="muted" className="text-xs" numberOfLines={2}>
              {t("home.programWidget.continueOnOwn")}
            </Text>
            <Button
              size="sm"
              variant="outline"
              className="self-start"
              onPress={() => router.push(route)}
            >
              <Text>{t("home.programWidget.openModule")}</Text>
            </Button>
          </>
        ) : (
          <>
            <View className="gap-1.5">
              {visibleTasks.map((task) => (
                <Pressable
                  key={task.key}
                  accessibilityRole="button"
                  onPress={() => router.push(task.route)}
                  className="flex-row items-center gap-2 rounded-lg border border-border px-2.5 py-2 active:bg-accent/40"
                >
                  {task.done ? (
                    <Icon name="check-circle" className="size-4 text-success" />
                  ) : (
                    <View className="size-2 rounded-full bg-primary" />
                  )}
                  <Text className="flex-1 text-xs font-medium" numberOfLines={1}>
                    {tm(task.labelKey)}
                  </Text>
                  <Icon name="chevron-right" className="size-4 text-muted-foreground" />
                </Pressable>
              ))}
              {remaining > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(route)}
                  className="self-start rounded-md px-1 py-0.5 active:bg-accent/40"
                >
                  <Text className="text-[11px] font-medium text-primary">
                    {t("home.programWidget.moreGoals", { count: remaining })}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <Button
              size="sm"
              variant="ghost"
              className="self-end"
              onPress={() => router.push(route)}
            >
              <Text className="text-muted-foreground">{t("home.programWidget.openProgram")}</Text>
              <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
