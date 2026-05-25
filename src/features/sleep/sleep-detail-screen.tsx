import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { LoadingState } from "@/src/components/app/screen-state";
import { useDeleteSleepLog, useSleepLog, useSleepLogs } from "@/src/features/sleep/queries";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { formatTimestamp } from "@/src/utils/date";

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export default function SleepDetailScreen() {
  const { t } = useTranslation("sleep");
  const { user } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const logId = typeof id === "string" ? id : null;
  const showToast = useToastStore((state) => state.showToast);

  const { data: cachedList } = useSleepLogs(user?.id ?? null, 50);
  const fromCache = logId ? (cachedList?.find((l) => l.id === logId) ?? null) : null;

  const { data: fetched, isLoading } = useSleepLog(
    fromCache ? null : (user?.id ?? null),
    fromCache ? null : logId,
  );

  const entry = fromCache ?? fetched ?? null;
  const deleteMutation = useDeleteSleepLog(user?.id ?? null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const confirmDelete = async () => {
    if (!entry) return;
    setDeleteError("");
    try {
      await deleteMutation.mutateAsync(entry.id);
      setConfirmOpen(false);
      showToast({ title: t("feedback.deleted"), tone: "success" });
      router.replace("/tools/sleep" as Parameters<typeof router.replace>[0]);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : t("detail.deleteError"));
    }
  };

  if (!fromCache && isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("detail.title")} />
        </View>
      </SafeAreaView>
    );
  }

  if (!entry) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <ScreenHeader title={t("detail.title")} />
            <Text variant="muted">{t("detail.notFound")}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const trimmedNotes = entry.notes.trim();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={t("detail.title")} />
            <View className="flex-row gap-3">
              <Button
                onPress={() => router.push(`/tools/sleep/${entry.id}/edit`)}
                variant="secondary"
              >
                <Icon name="edit" className="size-4" />
                <Text>{t("detail.edit")}</Text>
              </Button>
              <Button onPress={() => setConfirmOpen(true)} variant="ghost">
                <Icon name="delete-outline" className="size-4 text-destructive" />
                <Text>{t("detail.delete")}</Text>
              </Button>
            </View>
          </View>

          <Card>
            <CardHeader>
              <CardTitle>{t("detail.duration")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Text className="text-4xl font-bold">{formatDuration(entry.durationMinutes)}</Text>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("detail.quality")}</CardTitle>
            </CardHeader>
            <CardContent>
              <View className="flex-row items-center gap-3">
                <Text className="text-4xl font-bold">{entry.quality}</Text>
                <Text variant="muted" className="text-base">
                  {t(`quality.${entry.quality}` as Parameters<typeof t>[0])}
                </Text>
              </View>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("detail.loggedAt")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Text>{formatTimestamp(entry.loggedAt)}</Text>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("detail.notes")}</CardTitle>
            </CardHeader>
            <CardContent>
              {trimmedNotes ? (
                <Text>{trimmedNotes}</Text>
              ) : (
                <Text variant="muted">{t("detail.noNotes")}</Text>
              )}
            </CardContent>
          </Card>
        </View>
      </ScrollView>

      <ConfirmDialog
        cancelLabel={t("detail.confirmDelete.cancel")}
        confirmLabel={t("detail.confirmDelete.confirm")}
        error={deleteError}
        isPending={deleteMutation.isPending}
        message={t("detail.confirmDelete.message")}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteError("");
        }}
        onConfirm={() => void confirmDelete()}
        title={t("detail.confirmDelete.title")}
        visible={confirmOpen}
      />
    </SafeAreaView>
  );
}
