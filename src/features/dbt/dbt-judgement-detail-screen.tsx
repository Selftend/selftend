import { useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { ScreenLoading } from "@/src/components/app/screen-state";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { FORM_COLUMN } from "@/src/lib/layout";
import { useSingleFlight } from "@/src/lib/use-single-flight";
import { formatCompactAtOffset } from "@/src/utils/date";
import { cn } from "@/lib/utils";
import { useDeleteJudgement, useJudgement } from "@/src/features/dbt/queries";
import { useActDefusionLogDraftStore } from "@/src/stores/act-defusion-log-draft-store";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

/**
 * `/modules/dbt/judgements/[id]` - one judgement, read back, with one door
 * (spec §3.2.2).
 *
 * **_Unhook from it_ opens ACT defusion**, seeded with this judgement as the
 * fused thought and the category preset to *self-judgment*. The seed goes
 * through ACT's own draft store rather than a route parameter: neither the ACT
 * form nor the journal takes one, and a person's own judgement in the web
 * address bar is health data on the navigation path (#739).
 *
 * ⚠️ A cross-MODULE hand-off, which is new for a detail screen. It is the same
 * departure the learn pages' chips make, and it is argued the same way: this is
 * where the workbook's own next step already lives in this app.
 */
export default function DbtJudgementDetailScreen({ id }: { id: string }) {
  const { t } = useTranslation("dbt");
  const { user } = useSession();
  const pushWithOrigin = usePushWithOrigin();
  const showToast = useToastStore((state) => state.showToast);
  const { data: judgement, isPending } = useJudgement(user?.id ?? null, id);
  const deleteMutation = useDeleteJudgement(user?.id ?? null);
  const setDefusionDraft = useActDefusionLogDraftStore((state) => state.setValues);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const remove = useSingleFlight(async () => {
    try {
      await deleteMutation.mutateAsync(id);
      router.replace("/modules/dbt/judgements");
    } catch {
      showToast({ title: t("judgements.deleteError"), tone: "error" });
    }
  });

  if (isPending) return <ScreenLoading title={t("tools.judgements.name")} />;

  if (!judgement) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-6">
          <View className={cn(FORM_COLUMN, "gap-6")}>
            <ScreenHeader title={t("tools.judgements.name")} />
            <Text variant="muted">{t("judgements.notFound")}</Text>
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
        title={t("judgements.deleteTitle")}
        message={t("judgements.deleteBody")}
        confirmLabel={t("judgements.deleteConfirm")}
        cancelLabel={t("judgements.deleteCancel")}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          void remove();
        }}
      />
      <ScrollView contentContainerClassName="grow p-6">
        <View className={cn(FORM_COLUMN, "gap-7")}>
          <View className="gap-2">
            <ScreenHeader title={t("tools.judgements.name")} />
            <View className="flex-row items-center gap-2">
              <Icon
                name={
                  judgement.valence === "positive" ? "add-circle-outline" : "remove-circle-outline"
                }
                size={14}
                className="text-muted-foreground"
              />
              <Text variant="muted">
                {t(`judgements.valence.${judgement.valence}`)} ·{" "}
                {formatCompactAtOffset(judgement.createdAt, judgement.createdOffsetMinutes)}
              </Text>
            </View>
          </View>

          <Text className="text-[20px] font-bold leading-snug tracking-tight">
            {judgement.judgement}
          </Text>

          {judgement.restatement ? (
            <View className="gap-1.5">
              <Text
                variant="muted"
                className="text-[11px] font-semibold uppercase tracking-[0.1em]"
              >
                {t("judgements.restatementLabel")}
              </Text>
              <Text className="text-[15px] leading-relaxed">{judgement.restatement}</Text>
            </View>
          ) : null}

          <View className="gap-3">
            <Button
              variant="outline"
              onPress={() => {
                // ACT's own draft store, in memory - never a route parameter.
                setDefusionDraft({
                  fusedThought: judgement.judgement,
                  thoughtCategory: "selfJudgment",
                  fusionLevelBefore: null,
                  techniqueUsed: null,
                  defusedVersion: "",
                  fusionLevelAfter: null,
                  notes: "",
                });
                pushWithOrigin("/modules/act/defusion/new");
              }}
            >
              <Icon name="filter-drama" className="size-4" />
              <Text>{t("judgements.unhook")}</Text>
            </Button>

            <Button variant="ghost" onPress={() => setConfirmDelete(true)}>
              <Text className="text-destructive">{t("judgements.delete")}</Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
