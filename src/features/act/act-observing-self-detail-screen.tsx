import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ScreenHeader } from "@/src/components/app/screen-header";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
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
import { ActDetailLoading, ActDetailNotFound } from "@/src/features/act/act-detail-scaffold";
import {
  useDeleteObservingSelfSession,
  useObservingSelfSession,
  useObservingSelfSessions,
} from "@/src/features/act/queries";
import { useCachedItem } from "@/src/features/act/use-cached-item";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

export default function ActObservingSelfDetailScreen() {
  const { t } = useTranslation("act");
  const { user } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = typeof id === "string" ? id : null;
  const showToast = useToastStore((state) => state.showToast);

  const { item: session, isLoading } = useCachedItem(
    useObservingSelfSessions,
    useObservingSelfSession,
    user?.id ?? null,
    sessionId,
  );

  const deleteMutation = useDeleteObservingSelfSession(user?.id ?? null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  if (isLoading) {
    return <ActDetailLoading title={t("observingSelf.listTitle")} />;
  }

  if (!session) {
    return (
      <ActDetailNotFound title={t("observingSelf.listTitle")} message={t("observingSelf.noLogs")} />
    );
  }

  const confirmDelete = async () => {
    setDeleteError("");
    try {
      await deleteMutation.mutateAsync(session.id);
      setConfirmOpen(false);
      showToast({ title: t("observingSelf.deletedToast"), tone: "success" });
      router.replace("/modules/act/observing-self" as Parameters<typeof router.replace>[0]);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : t("observingSelf.saveProblem"));
    }
  };

  const heading = session.whatWasObserved || t(`observingSelf.techniques.${session.techniqueUsed}`);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={heading} />
            <Text variant="muted">{new Date(session.createdAt).toLocaleString()}</Text>
            <View className="flex-row">
              <Button onPress={() => setConfirmOpen(true)} variant="ghost">
                <Icon name="delete-outline" className="size-4 text-destructive" />
                <Text>{t("observingSelf.delete")}</Text>
              </Button>
            </View>
          </View>

          <Card>
            <CardHeader>
              <CardTitle>{t("observingSelf.techniqueLabel")}</CardTitle>
              <CardDescription>
                {t(`observingSelf.techniques.${session.techniqueUsed}`)}
              </CardDescription>
            </CardHeader>
          </Card>

          {session.whatWasObserved ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("observingSelf.observedLabel")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Text className="text-base leading-6">{session.whatWasObserved}</Text>
              </CardContent>
            </Card>
          ) : null}

          {session.moodAfter !== null || session.durationMinutes !== null ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("observingSelf.moodLabel")}</CardTitle>
                <CardDescription>
                  {session.moodAfter !== null ? `${session.moodAfter}/10` : null}
                  {session.durationMinutes !== null ? `  ·  ${session.durationMinutes} min` : null}
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {session.notes ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("observingSelf.notesLabel")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Text className="text-base leading-6">{session.notes}</Text>
              </CardContent>
            </Card>
          ) : null}
        </View>
      </ScrollView>

      <ConfirmDialog
        cancelLabel={t("observingSelf.cancel")}
        confirmLabel={t("observingSelf.delete")}
        error={deleteError}
        isPending={deleteMutation.isPending}
        message={t("observingSelf.deleteConfirmBody")}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteError("");
        }}
        onConfirm={() => void confirmDelete()}
        title={t("observingSelf.deleteConfirm")}
        visible={confirmOpen}
      />
    </SafeAreaView>
  );
}
