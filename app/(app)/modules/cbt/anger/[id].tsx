import { router, useLocalSearchParams } from "expo-router";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenLoading, ScreenNotFound } from "@/src/components/app/screen-state";
import { DeleteEntryButton } from "@/src/components/app/delete-entry-button";
import { useAngerLog, useDeleteAngerLog } from "@/src/features/anger/queries";
import { useInlineWriteError } from "@/src/lib/use-inline-write-error";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { ScreenHeader } from "@/src/components/app/screen-header";

export default function AngerDetailScreen() {
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation("cbt");
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);
  const { data: log, isLoading } = useAngerLog(user?.id ?? null, id ?? null);
  const deleteMutation = useDeleteAngerLog(user?.id ?? null);
  const deleteError = useInlineWriteError(t("anger.deleteError"));

  // ☠️ `DeleteEntryButton` keeps its confirmation OPEN when the delete rejects, so the
  // global save-failed toast would land behind a native modal (#1364, spec §10).
  // `ConfirmDialog` already carries an `error` slot; the failure goes there. The
  // success toast is safe - it fires as the screen is being replaced.
  const handleDelete = async () => {
    if (!log) return;
    deleteError.onStart();
    try {
      await deleteMutation.mutateAsync(log.id);
    } catch (error) {
      deleteError.onError();
      // Rethrown on purpose: `DeleteEntryButton` closes its confirmation only when
      // `onConfirm` RESOLVES, and a closed dialog has nowhere to show this.
      throw error;
    }
    showToast({ title: t("common:feedback.deleted"), tone: "success" });
    router.replace("/modules/cbt/anger");
  };

  if (isLoading) {
    return <ScreenLoading title={t("anger.loading")} />;
  }

  if (!log) {
    return <ScreenNotFound title={t("anger.notFound")} />;
  }

  const renderField = (label: string, value: string | null) => {
    if (!value) return null;
    return (
      <Card>
        <CardHeader>
          <CardTitle>{label}</CardTitle>
          <CardDescription>{value}</CardDescription>
        </CardHeader>
      </Card>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={t("anger.detailTitle")} />
            <Text variant="muted">{log.triggerText}</Text>
          </View>

          <Card>
            <CardHeader>
              <CardTitle>{t("anger.arousalLevel")}</CardTitle>
              <CardDescription>
                {t("anger.arousalLabel", { value: log.arousalLevel })}
              </CardDescription>
            </CardHeader>
            {log.outcomeRating !== null ? (
              <CardContent>
                <Text variant="muted">{t("anger.outcomeLabel", { value: log.outcomeRating })}</Text>
              </CardContent>
            ) : null}
          </Card>

          {renderField(t("anger.interpretation"), log.interpretation)}
          {renderField(t("anger.urge"), log.urge)}
          {renderField(t("anger.behaviorChosen"), log.behaviorChosen)}
          {renderField(t("anger.consequence"), log.consequence)}
          {renderField(t("anger.alternativeInterpretation"), log.alternativeInterpretation)}

          {log.timeOutTaken ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("anger.timeOutTaken")}</CardTitle>
              </CardHeader>
            </Card>
          ) : null}

          {renderField(t("anger.notes"), log.notes)}

          <View className="gap-3">
            <Button
              onPress={() => pushWithOrigin(`/modules/cbt/anger/new?logId=${log.id}`)}
              variant="secondary"
            >
              <Text>{t("common:edit")}</Text>
            </Button>
            <DeleteEntryButton
              error={deleteError.message ?? undefined}
              label={t("common:delete")}
              title={t("anger.deleteTitle")}
              message={t("anger.deleteMessage")}
              onOpen={deleteError.onStart}
              onConfirm={handleDelete}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
