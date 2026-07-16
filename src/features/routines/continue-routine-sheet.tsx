import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useTranslation } from "react-i18next";

import { TimeField } from "@/src/components/app/time-field";
import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { roundToNearestHalfHour } from "@/src/features/notifications/reminder-prompt";
import { useUpdateRoutine } from "@/src/features/routines/queries";
import { routeForTool } from "@/src/features/routines/tool-routes";
import {
  firstOpenRoutineView,
  type RoutineTodayView,
} from "@/src/features/routines/use-routines-today";
import { useReduceMotionEnabled, DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { getReminderTimeZone } from "@/src/lib/notifications";
import { clampTime } from "@/src/utils/time";
import { cn } from "@/lib/utils";

interface ContinueRoutineSheetProps {
  userId: string;
  views: RoutineTodayView[];
  visible: boolean;
  onClose: () => void;
}

// The "continue your routine" sheet the FAB opens (spec #37, #50): the whole
// ordered step list of one routine with the next open step highlighted and a
// "Do next step" CTA (order stays advisory). When several routines have open
// steps, it starts on the first by routine order and a chip row switches
// between them. Once the shown routine derives complete while the sheet is
// open, it becomes a gentle completion sheet OFFERING the routine's own daily
// reminder - a dismissible opt-in that writes reminder fields only on accept,
// never forced (nothing changes on decline/close).
export function ContinueRoutineSheet({
  userId,
  views,
  visible,
  onClose,
}: ContinueRoutineSheetProps) {
  const { t } = useTranslation("routines");
  const reduceMotion = useReduceMotionEnabled();
  const updateRoutine = useUpdateRoutine(userId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reminderTime, setReminderTime] = useState(() => roundToNearestHalfHour(new Date()));
  const [reminderError, setReminderError] = useState<string | undefined>();

  const openViews = views.filter((view) => view.day.nextStep !== null);

  // Pin the shown routine when the sheet opens (firstOpenRoutineView - the
  // same selection the FAB counts, #91) so it stays put if it completes
  // mid-session - that is the moment the completion state must show instead
  // of the view jumping to another routine. Reset on close so the next open
  // starts fresh.
  useEffect(() => {
    if (!visible) {
      setSelectedId(null);
      setReminderError(undefined);
      return;
    }
    setSelectedId(
      (current) =>
        current ?? firstOpenRoutineView(views)?.routine.id ?? views[0]?.routine.id ?? null,
    );
  }, [visible, views]);

  const selected = views.find((view) => view.routine.id === selectedId) ?? openViews[0] ?? null;

  if (!selected) return null;

  const { routine, day } = selected;
  const isComplete = day.totalCount > 0 && day.nextStep === null;
  const nextIndex = day.steps.findIndex((step) => !step.done);

  // Chip row candidates: every open routine plus the pinned one (which may
  // just have completed). Only shown when there is something to switch to.
  const switchable = views.filter(
    (view) => view.day.nextStep !== null || view.routine.id === routine.id,
  );

  function doNextStep() {
    if (!day.nextStep) return;
    onClose();
    router.push(routeForTool(day.nextStep.toolId));
  }

  async function acceptReminder() {
    setReminderError(undefined);
    const { hour, minute } = clampTime(reminderTime);
    try {
      await updateRoutine.mutateAsync({
        id: routine.id,
        patch: {
          reminderEnabled: true,
          reminderHour: hour,
          reminderMinute: minute,
          reminderTimezone: getReminderTimeZone(),
        },
      });
      onClose();
    } catch {
      setReminderError(t("sheet.reminderSaveError"));
    }
  }

  return (
    <Modal
      animationType={reduceMotion ? "none" : "slide"}
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View className="flex-1">
        <Pressable
          accessibilityLabel={t("sheet.close")}
          accessibilityRole="button"
          className="absolute inset-0 bg-black/40"
          onPress={onClose}
          role="button"
        />
        <View className="absolute bottom-0 left-0 right-0 max-h-[86%] rounded-t-2xl bg-card">
          <View className="flex-row items-center justify-between gap-3 border-b border-border px-5 pb-3 pt-4">
            <View className="flex-1">
              <Text className="text-lg font-bold">
                {isComplete ? t("sheet.completeTitle") : t("sheet.title")}
              </Text>
              <Text variant="muted" className="text-xs" numberOfLines={1}>
                {routine.name}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={t("sheet.close")}
              accessibilityRole="button"
              hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
              onPress={onClose}
              className="size-8 items-center justify-center rounded-full active:bg-muted/50"
            >
              <Icon name="close" className="size-5 text-muted-foreground" />
            </Pressable>
          </View>

          {switchable.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              accessibilityLabel={t("sheet.switchLabel")}
              contentContainerClassName="gap-2 px-5 pt-3"
            >
              {switchable.map((view) => {
                const active = view.routine.id === routine.id;
                return (
                  <Pressable
                    key={view.routine.id}
                    accessibilityRole="button"
                    onPress={() => setSelectedId(view.routine.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5",
                      active ? "border-primary bg-primary/10" : "border-border bg-background",
                    )}
                  >
                    <Text
                      className={cn(
                        "text-xs font-semibold",
                        active ? "text-primary" : "text-muted-foreground",
                      )}
                      numberOfLines={1}
                    >
                      {view.routine.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          <ScrollView contentContainerClassName="gap-4 p-5 pb-8">
            {isComplete ? (
              <View className="gap-4">
                <View className="flex-row items-center gap-3">
                  <View className="size-10 items-center justify-center rounded-full bg-primary/15">
                    <Icon name="check" className="size-5 text-primary" />
                  </View>
                  <Text variant="muted" className="flex-1 text-sm">
                    {t("sheet.completeBody", { name: routine.name })}
                  </Text>
                </View>

                {routine.reminderEnabled ? (
                  <Button variant="outline" onPress={onClose}>
                    <Text>{t("sheet.close")}</Text>
                  </Button>
                ) : (
                  <View className="gap-3 rounded-2xl border border-border bg-muted/40 p-4">
                    <Text variant="muted" className="text-xs">
                      {t("sheet.reminderOffer")}
                    </Text>
                    <TimeField
                      value={reminderTime}
                      onChange={setReminderTime}
                      disabled={updateRoutine.isPending}
                      accessibilityLabel={t("sheet.reminderTimeLabel")}
                    />
                    {reminderError ? (
                      <Text className="text-xs text-destructive">{reminderError}</Text>
                    ) : null}
                    <View className="flex-row gap-3">
                      <Button
                        className="flex-1"
                        disabled={updateRoutine.isPending}
                        onPress={() => void acceptReminder()}
                      >
                        <Text>{t("sheet.reminderAccept")}</Text>
                      </Button>
                      <Button
                        className="flex-1"
                        variant="outline"
                        disabled={updateRoutine.isPending}
                        onPress={onClose}
                      >
                        <Text>{t("sheet.reminderDecline")}</Text>
                      </Button>
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <>
                <View className="gap-2">
                  {day.steps.map((step, index) => {
                    const isNext = index === nextIndex;
                    return (
                      <View
                        key={`${routine.id}-${step.toolId}-${index}`}
                        className={cn(
                          "flex-row items-center gap-3 rounded-2xl border p-3",
                          isNext ? "border-primary bg-primary/5" : "border-border bg-card",
                        )}
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
                            {step.done ? t("sheet.stepDone") : t("sheet.stepOpen")}
                          </Text>
                        </View>
                        {isNext ? (
                          <View className="rounded-full bg-primary/10 px-2.5 py-1">
                            <Text className="text-[11px] font-semibold text-primary">
                              {t("sheet.next")}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>

                <Text variant="muted" className="text-xs">
                  {t("sheet.orderNote")}
                </Text>

                <Button onPress={doNextStep}>
                  <Text>{t("sheet.doNextStep")}</Text>
                  <Icon name="arrow-forward" className="size-4 text-primary-foreground" />
                </Button>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
