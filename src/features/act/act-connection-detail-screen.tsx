import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ScreenHeader } from "@/src/components/app/screen-header";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { LoadingState } from "@/src/components/app/screen-state";
import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import {
  useConnectionLog,
  useConnectionLogs,
  useDeleteConnectionLog,
} from "@/src/features/act/queries";
import { useCachedItem } from "@/src/features/act/use-cached-item";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

export default function ActConnectionDetailScreen() {
  const { t } = useTranslation("act");
  const { user } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const logId = typeof id === "string" ? id : null;
  const showToast = useToastStore((state) => state.showToast);

  const { item: log, isLoading } = useCachedItem(
    useConnectionLogs,
    useConnectionLog,
    user?.id ?? null,
    logId,
  );

  const deleteMutation = useDeleteConnectionLog(user?.id ?? null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("connection.listTitle")} />
        </View>
      </SafeAreaView>
    );
  }

  if (!log) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <ScreenHeader title={t("connection.listTitle")} />
            <Text variant="muted">{t("connection.noLogs")}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const confirmDelete = async () => {
    setDeleteError("");
    try {
      await deleteMutation.mutateAsync(log.id);
      setConfirmOpen(false);
      showToast({ title: t("connection.deletedToast"), tone: "success" });
      router.replace("/modules/act/connection" as Parameters<typeof router.replace>[0]);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : t("connection.saveProblem"));
    }
  };

  const heading = log.noticesFromSenses || t(`connection.techniques.${log.technique}`);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={heading} />
            <Text variant="muted">{new Date(log.createdAt).toLocaleString()}</Text>
            <View className="flex-row">
              <Button onPress={() => setConfirmOpen(true)} variant="ghost">
                <Icon name="delete-outline" className="size-4 text-destructive" />
                <Text>{t("connection.delete")}</Text>
              </Button>
            </View>
          </View>

          <Card>
            <CardHeader>
              <CardTitle>{t("connection.techniqueLabel")}</CardTitle>
              <CardDescription>{t(`connection.techniques.${log.technique}`)}</CardDescription>
            </CardHeader>
          </Card>

          {log.activityContext ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("connection.activityLabel")}</CardTitle>
                <CardDescription>{log.activityContext}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {log.noticesFromSenses ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("connection.noticesLabel")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Text className="text-base leading-6">{log.noticesFromSenses}</Text>
              </CardContent>
            </Card>
          ) : null}

          {log.moodAfter !== null || log.durationMinutes !== null ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("connection.moodLabel")}</CardTitle>
                <CardDescription>
                  {log.moodAfter !== null ? `${log.moodAfter}/10` : null}
                  {log.durationMinutes !== null ? `  ·  ${log.durationMinutes} min` : null}
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {log.notes ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("connection.notesLabel")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Text className="text-base leading-6">{log.notes}</Text>
              </CardContent>
            </Card>
          ) : null}
        </View>
      </ScrollView>

      <ConfirmDialog
        cancelLabel={t("connection.cancel")}
        confirmLabel={t("connection.delete")}
        error={deleteError}
        isPending={deleteMutation.isPending}
        message={t("connection.deleteConfirmBody")}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteError("");
        }}
        onConfirm={() => void confirmDelete()}
        title={t("connection.deleteConfirm")}
        visible={confirmOpen}
      />
    </SafeAreaView>
  );
}
