import { useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";

import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { ScreenLoading } from "@/src/components/app/screen-state";
import { FORM_COLUMN } from "@/src/lib/layout";
import { useSingleFlight } from "@/src/lib/use-single-flight";
import { formatCompactAtOffset } from "@/src/utils/date";
import { cn } from "@/lib/utils";
import { useDeleteWiseMindCheckin, useWiseMindCheckin } from "@/src/features/dbt/queries";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

/**
 * `/modules/dbt/wise-mind/[id]` - one check-in, read back (spec §3.2.1).
 *
 * Nothing is editable, and there is no outcome slot to fill in later: a record
 * with a waiting field is a surface engineered to be reopened (ADR-0004).
 */

export default function DbtWiseMindDetailScreen({ id }: { id: string }) {
  const { t } = useTranslation("dbt");
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);
  const { data: checkin, isPending } = useWiseMindCheckin(user?.id ?? null, id);
  const deleteMutation = useDeleteWiseMindCheckin(user?.id ?? null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const remove = useSingleFlight(async () => {
    try {
      await deleteMutation.mutateAsync(id);
      router.replace("/modules/dbt/wise-mind");
    } catch {
      showToast({ title: t("wiseMind.deleteError"), tone: "error" });
    }
  });

  if (isPending) return <ScreenLoading title={t("tools.wiseMind.name")} />;

  if (!checkin) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-6">
          <View className={cn(FORM_COLUMN, "gap-6")}>
            <ScreenHeader title={t("tools.wiseMind.name")} />
            <Text variant="muted">{t("wiseMind.notFound")}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const answers: { label: string; value: string }[] = [
    { label: t("wiseMind.emotionMindLabel"), value: checkin.emotionMind },
    { label: t("wiseMind.reasonLabel"), value: checkin.reason },
    { label: t("wiseMind.wiseMindLabel"), value: checkin.wiseMind },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ConfirmDialog
        visible={confirmDelete}
        isPending={deleteMutation.isPending}
        title={t("wiseMind.deleteTitle")}
        message={t("wiseMind.deleteBody")}
        confirmLabel={t("wiseMind.deleteConfirm")}
        cancelLabel={t("wiseMind.deleteCancel")}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          void remove();
        }}
      />
      <ScrollView contentContainerClassName="grow p-6">
        <View className={cn(FORM_COLUMN, "gap-7")}>
          <View className="gap-2">
            <ScreenHeader title={t("tools.wiseMind.name")} />
            <Text variant="muted">
              {formatCompactAtOffset(checkin.createdAt, checkin.createdOffsetMinutes)}
            </Text>
          </View>

          <Text className="text-[20px] font-bold leading-snug tracking-tight">
            {checkin.question}
          </Text>

          {answers
            .filter((answer) => answer.value.trim().length > 0)
            .map((answer) => (
              <View key={answer.label} className="gap-1.5">
                <Text
                  variant="muted"
                  className="text-[11px] font-semibold uppercase tracking-[0.1em]"
                >
                  {answer.label}
                </Text>
                <Text className="text-[15px] leading-relaxed">{answer.value}</Text>
              </View>
            ))}

          <Button variant="ghost" onPress={() => setConfirmDelete(true)}>
            <Text className="text-destructive">{t("wiseMind.delete")}</Text>
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
