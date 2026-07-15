import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { LoadingState } from "@/src/components/app/screen-state";
import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { RoutineDayStrip } from "@/src/features/routines/day-strip";
import { deriveRoutine, type RoutineStatus } from "@/src/features/routines/derive";
import { useDeleteRoutine, useRoutine } from "@/src/features/routines/queries";
import { useRoutineToolRecords } from "@/src/features/routines/use-routine-tool-records";
import { useSession } from "@/src/providers/session-provider";
import { currentDateKey } from "@/src/utils/date";
import { cn } from "@/lib/utils";

const STATUS_KEYS: Record<RoutineStatus, "notStarted" | "inProgress" | "complete"> = {
  not_started: "notStarted",
  in_progress: "inProgress",
  complete: "complete",
};

interface RoutineDetailScreenProps {
  routineId: string;
}

export function RoutineDetailScreen({ routineId }: RoutineDetailScreenProps) {
  const { t } = useTranslation("routines");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: routine, isLoading } = useRoutine(userId, routineId);
  const steps = routine?.steps ?? [];
  const records = useRoutineToolRecords(
    userId,
    steps.map((step) => step.toolId),
  );
  const deleteMutation = useDeleteRoutine(userId);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionError, setActionError] = useState<string | undefined>();

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("home.title")} />
        </View>
      </SafeAreaView>
    );
  }

  if (!routine) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <ScreenHeader title={t("home.title")} />
            <Text variant="muted">{t("detail.notFound")}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const day = deriveRoutine(routine.steps, records, currentDateKey());

  async function confirmDelete() {
    setActionError(undefined);
    try {
      await deleteMutation.mutateAsync(routineId);
      setDeleteOpen(false);
      router.replace("/routines" as Parameters<typeof router.replace>[0]);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : t("form.saveError"));
    }
  }

  return (
    <>
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow gap-6 p-6">
          <View className="gap-2">
            <ScreenHeader title={routine.name} />
            <Text
              className={cn(
                "text-sm",
                day.status === "not_started" ? "text-muted-foreground" : "text-primary",
              )}
            >
              {t(`status.${STATUS_KEYS[day.status]}`)}
              {day.totalCount > 0
                ? ` · ${t("status.progress", { done: day.doneCount, total: day.totalCount })}`
                : ""}
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-2">
            <Button
              onPress={() =>
                router.push({
                  pathname: "/routines/[id]/edit",
                  params: { id: routine.id },
                } as Parameters<typeof router.push>[0])
              }
              variant="outline"
            >
              <Icon name="edit" className="size-4" />
              <Text>{t("cta.edit")}</Text>
            </Button>
            <Button onPress={() => setDeleteOpen(true)} variant="ghost">
              <Icon name="delete-outline" className="size-4 text-destructive" />
              <Text className="text-destructive">{t("cta.delete")}</Text>
            </Button>
          </View>

          <View className="gap-2">
            <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t("detail.stepsTitle")}
            </Text>
            {day.steps.length === 0 ? (
              <Text variant="muted">{t("detail.stepsEmpty")}</Text>
            ) : (
              <View className="gap-2">
                {day.steps.map((step, index) => (
                  <View
                    key={routine.steps[index]?.id ?? `${step.toolId}-${index}`}
                    className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3"
                  >
                    <View
                      className={cn(
                        "size-8 items-center justify-center rounded-full border",
                        step.done
                          ? "border-primary/40 bg-primary/15"
                          : "border-border bg-background",
                      )}
                    >
                      {step.done ? (
                        <Icon name="check" className="size-4 text-primary" />
                      ) : (
                        <Text variant="muted" className="text-xs font-semibold">
                          {index + 1}
                        </Text>
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold">{t(`tools.${step.toolId}`)}</Text>
                      <Text variant="muted" className="text-xs">
                        {step.done ? t("detail.stepDone") : t("detail.stepNotDone")}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
            <Text variant="muted" className="text-xs">
              {t("detail.orderNote")}
            </Text>
          </View>

          <View className="gap-2">
            <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t("strip.label")}
            </Text>
            <RoutineDayStrip steps={routine.steps} records={records} />
            <Text variant="muted" className="text-xs">
              {t("strip.note")}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>

      <ConfirmDialog
        cancelLabel={t("cta.cancel")}
        confirmLabel={t("cta.delete")}
        error={actionError}
        isPending={deleteMutation.isPending}
        message={t("detail.deleteConfirmBody")}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void confirmDelete()}
        title={t("detail.deleteConfirmTitle")}
        visible={deleteOpen}
      />
    </>
  );
}
