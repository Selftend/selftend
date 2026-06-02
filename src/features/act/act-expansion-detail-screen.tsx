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
  useDeleteExpansionLog,
  useExpansionLog,
  useExpansionLogs,
} from "@/src/features/act/queries";
import { useCachedItem } from "@/src/features/act/use-cached-item";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

export default function ActExpansionDetailScreen() {
  const { t } = useTranslation("act");
  const { user } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const logId = typeof id === "string" ? id : null;
  const showToast = useToastStore((state) => state.showToast);

  const { item: log, isLoading } = useCachedItem(
    useExpansionLogs,
    useExpansionLog,
    user?.id ?? null,
    logId,
  );

  const deleteMutation = useDeleteExpansionLog(user?.id ?? null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  if (isLoading) {
    return <ActDetailLoading title={t("expansion.listTitle")} />;
  }

  if (!log) {
    return <ActDetailNotFound title={t("expansion.listTitle")} message={t("expansion.noLogs")} />;
  }

  const confirmDelete = async () => {
    setDeleteError("");
    try {
      await deleteMutation.mutateAsync(log.id);
      setConfirmOpen(false);
      showToast({ title: t("expansion.deletedToast"), tone: "success" });
      router.replace("/modules/act/expansion" as Parameters<typeof router.replace>[0]);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : t("expansion.saveProblem"));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={log.emotion} />
            <Text variant="muted">{new Date(log.createdAt).toLocaleString()}</Text>
            <View className="flex-row">
              <Button onPress={() => setConfirmOpen(true)} variant="ghost">
                <Icon name="delete-outline" className="size-4 text-destructive" />
                <Text>{t("expansion.delete")}</Text>
              </Button>
            </View>
          </View>

          {log.bodySensation ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("expansion.bodyLabel")}</CardTitle>
                <CardDescription>{log.bodySensation}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {log.intensityBefore !== null ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("expansion.intensityBeforeLabel")}</CardTitle>
                <CardDescription>{log.intensityBefore} / 100</CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {log.struggleSwitchOn !== null ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("expansion.struggleSwitchLabel")}</CardTitle>
                <CardDescription>
                  {log.struggleSwitchOn
                    ? t("expansion.struggleSwitchOn")
                    : t("expansion.struggleSwitchOff")}
                </CardDescription>
              </CardHeader>
              {log.discomfortType ? (
                <CardContent>
                  <Text variant="muted" className="text-sm">
                    {t(`expansion.${log.discomfortType}`)}
                  </Text>
                </CardContent>
              ) : null}
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>{t("expansion.techniqueLabel")}</CardTitle>
              <CardDescription>{t(`expansion.techniques.${log.techniqueUsed}`)}</CardDescription>
            </CardHeader>
          </Card>

          {log.intensityAfter !== null ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("expansion.intensityAfterLabel")}</CardTitle>
                <CardDescription>{log.intensityAfter} / 100</CardDescription>
              </CardHeader>
              {log.intensityBefore !== null ? (
                <CardContent>
                  <Text className="font-semibold text-act">
                    {log.intensityAfter < log.intensityBefore
                      ? t("expansion.intensityDrop", {
                          before: log.intensityBefore,
                          after: log.intensityAfter,
                        })
                      : t("expansion.noIntensityDrop", { after: log.intensityAfter })}
                  </Text>
                </CardContent>
              ) : null}
            </Card>
          ) : null}

          {log.notes ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("expansion.notesLabel")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Text className="text-base leading-6">{log.notes}</Text>
              </CardContent>
            </Card>
          ) : null}
        </View>
      </ScrollView>

      <ConfirmDialog
        cancelLabel={t("expansion.cancel")}
        confirmLabel={t("expansion.delete")}
        error={deleteError}
        isPending={deleteMutation.isPending}
        message={t("expansion.deleteConfirmBody")}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteError("");
        }}
        onConfirm={() => void confirmDelete()}
        title={t("expansion.deleteConfirm")}
        visible={confirmOpen}
      />
    </SafeAreaView>
  );
}
