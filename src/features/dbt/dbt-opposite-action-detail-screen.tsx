import { useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { ScreenLoading } from "@/src/components/app/screen-state";
import { SubmitButtonContent } from "@/src/components/app/submit-button-content";
import { FORM_COLUMN } from "@/src/lib/layout";
import { occurrenceTimeFromDate } from "@/src/lib/occurrence-time";
import { useSingleFlight } from "@/src/lib/use-single-flight";
import { formatCompactAtOffset } from "@/src/utils/date";
import { cn } from "@/lib/utils";
import {
  useDeleteOppositeActionPlan,
  useMarkOppositeActionPlanDone,
  useOppositeActionPlan,
} from "@/src/features/dbt/queries";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

/**
 * `/modules/dbt/opposite-action/[id]` - the plan, and the one place it is
 * closed (spec §3.3.2).
 *
 * The Activities shape: an open record completed from its detail. Done sets the
 * done day - the day that marks the timeline, not the day it was planned - and
 * opens one optional note. The note is the book's *outcomes, filled in later*,
 * and it is optional because a plan carried out is a plan carried out whether
 * or not the person has words for what shifted.
 *
 * ☠️ **Nothing asks.** Done copy states the record and stops. No rating of how
 * it went, no "was it worth it", no prompt to come back.
 */
export default function DbtOppositeActionDetailScreen({ id }: { id: string }) {
  const { t } = useTranslation("dbt");
  const { t: tCbt } = useTranslation("cbt");
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);
  const { data: plan, isPending } = useOppositeActionPlan(user?.id ?? null, id);
  const doneMutation = useMarkOppositeActionPlanDone(user?.id ?? null);
  const deleteMutation = useDeleteOppositeActionPlan(user?.id ?? null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [whatShifted, setWhatShifted] = useState("");

  const markDone = useSingleFlight(async () => {
    if (!plan) return;
    try {
      const occurrence = occurrenceTimeFromDate();
      await doneMutation.mutateAsync({
        id: plan.id,
        input: {
          doneAt: occurrence.occurredAt,
          doneOffsetMinutes: occurrence.occurredOffsetMinutes,
          whatShifted,
        },
      });
      setNoteOpen(false);
      showToast({
        title: `${t("oppositeAction.donePrefix")} ${plan.oppositeAction}`,
        tone: "success",
      });
    } catch {
      showToast({ title: t("oppositeAction.doneError"), tone: "error" });
    }
  });

  const remove = useSingleFlight(async () => {
    try {
      await deleteMutation.mutateAsync(id);
      router.replace("/modules/dbt/opposite-action");
    } catch {
      showToast({ title: t("oppositeAction.deleteError"), tone: "error" });
    }
  });

  if (isPending) return <ScreenLoading title={t("tools.oppositeAction.name")} />;

  if (!plan) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-6">
          <View className={cn(FORM_COLUMN, "gap-6")}>
            <ScreenHeader title={t("tools.oppositeAction.name")} />
            <Text variant="muted">{t("oppositeAction.notFound")}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ConfirmDialog
        visible={confirmDelete}
        isPending={deleteMutation.isPending}
        title={t("oppositeAction.deleteTitle")}
        message={t("oppositeAction.deleteBody")}
        confirmLabel={t("oppositeAction.deleteConfirm")}
        cancelLabel={t("oppositeAction.deleteCancel")}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          void remove();
        }}
      />
      <ScrollView contentContainerClassName="grow p-6">
        <View className={cn(FORM_COLUMN, "gap-7")}>
          <View className="gap-2">
            <ScreenHeader title={t("tools.oppositeAction.name")} />
            <Text variant="muted">
              {tCbt(`emotions.${plan.emotion.toLowerCase()}`, plan.emotion)} ·{" "}
              {formatCompactAtOffset(plan.createdAt, plan.createdOffsetMinutes)}
            </Text>
          </View>

          <Field label={t("oppositeAction.pullLabel")} value={plan.pull} />
          <View className="gap-1.5">
            <Text variant="muted" className="text-[11px] font-semibold uppercase tracking-[0.1em]">
              {t("oppositeAction.oppositeLabel")}
            </Text>
            <Text className="text-[20px] font-bold leading-snug tracking-tight">
              {plan.oppositeAction}
            </Text>
          </View>
          {plan.holdFor ? (
            <Field label={t("oppositeAction.holdForLabel")} value={plan.holdFor} />
          ) : null}

          {plan.doneAt ? (
            <View className="gap-3">
              <View className="flex-row items-center gap-2">
                <Icon name="check-circle" size={18} className="text-primary" />
                <Text className="text-[15px] font-semibold">
                  {t("oppositeAction.doneOn")}{" "}
                  {formatCompactAtOffset(plan.doneAt, plan.doneOffsetMinutes)}
                </Text>
              </View>
              {plan.whatShifted ? (
                <Field label={t("oppositeAction.whatShiftedLabel")} value={plan.whatShifted} />
              ) : null}
            </View>
          ) : noteOpen ? (
            <View className="gap-3">
              <View className="gap-1.5">
                <Label>{t("oppositeAction.whatShiftedLabel")}</Label>
                <Text variant="muted" className="text-[12.5px]">
                  {t("oppositeAction.whatShiftedHint")}
                </Text>
                <Textarea
                  value={whatShifted}
                  onChangeText={setWhatShifted}
                  accessibilityLabel={t("oppositeAction.whatShiftedLabel")}
                  maxLength={1000}
                />
              </View>
              <Button disabled={doneMutation.isPending} onPress={() => void markDone()}>
                <SubmitButtonContent
                  pending={doneMutation.isPending}
                  idleLabel={t("oppositeAction.saveDone")}
                  pendingLabel={t("oppositeAction.saving")}
                />
              </Button>
              {/* Skipping the note still closes the plan: the note is the
                  optional half, and refusing to close without it would make an
                  optional field a gate. */}
              <Button
                variant="ghost"
                disabled={doneMutation.isPending}
                onPress={() => void markDone()}
              >
                <Text>{t("oppositeAction.skipNote")}</Text>
              </Button>
            </View>
          ) : (
            <Button onPress={() => setNoteOpen(true)}>
              <Icon name="check" className="size-4 text-primary-foreground" />
              <Text>{t("oppositeAction.done")}</Text>
            </Button>
          )}

          <Button variant="ghost" onPress={() => setConfirmDelete(true)}>
            <Text className="text-destructive">{t("oppositeAction.delete")}</Text>
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-1.5">
      <Text variant="muted" className="text-[11px] font-semibold uppercase tracking-[0.1em]">
        {label}
      </Text>
      <Text className="text-[15px] leading-relaxed">{value}</Text>
    </View>
  );
}
