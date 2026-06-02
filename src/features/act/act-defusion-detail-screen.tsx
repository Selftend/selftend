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
import { useDefusionLog, useDefusionLogs, useDeleteDefusionLog } from "@/src/features/act/queries";
import { useCachedItem } from "@/src/features/act/use-cached-item";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

export default function ActDefusionDetailScreen() {
  const { t } = useTranslation("act");
  const { user } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const logId = typeof id === "string" ? id : null;
  const showToast = useToastStore((state) => state.showToast);

  const { item: log, isLoading } = useCachedItem(
    useDefusionLogs,
    useDefusionLog,
    user?.id ?? null,
    logId,
  );

  const deleteMutation = useDeleteDefusionLog(user?.id ?? null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  if (isLoading) {
    return <ActDetailLoading title={t("defusion.listTitle")} />;
  }

  if (!log) {
    return <ActDetailNotFound title={t("defusion.listTitle")} message={t("defusion.noLogs")} />;
  }

  const confirmDelete = async () => {
    setDeleteError("");
    try {
      await deleteMutation.mutateAsync(log.id);
      setConfirmOpen(false);
      showToast({ title: t("defusion.deletedToast"), tone: "success" });
      router.replace("/modules/act/defusion" as Parameters<typeof router.replace>[0]);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : t("defusion.saveProblem"));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={log.fusedThought} />
            <Text variant="muted">{new Date(log.createdAt).toLocaleString()}</Text>
            <View className="flex-row">
              <Button onPress={() => setConfirmOpen(true)} variant="ghost">
                <Icon name="delete-outline" className="size-4 text-destructive" />
                <Text>{t("defusion.delete")}</Text>
              </Button>
            </View>
          </View>

          <Card>
            <CardHeader>
              <CardTitle>{t("defusion.categoryLabel")}</CardTitle>
              <CardDescription>{t(`defusion.categories.${log.thoughtCategory}`)}</CardDescription>
            </CardHeader>
          </Card>

          {log.fusionLevelBefore !== null ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("defusion.fusionBeforeLabel")}</CardTitle>
                <CardDescription>{log.fusionLevelBefore} / 100</CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>{t("defusion.techniqueLabel")}</CardTitle>
              <CardDescription>{t(`defusion.techniques.${log.techniqueUsed}`)}</CardDescription>
            </CardHeader>
            <CardContent>
              <Text variant="muted" className="text-sm leading-snug">
                {t(`defusion.techniqueDescriptions.${log.techniqueUsed}`)}
              </Text>
            </CardContent>
          </Card>

          {log.defusedVersion ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("defusion.defusedVersionLabel")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Text className="text-base leading-6">{log.defusedVersion}</Text>
              </CardContent>
            </Card>
          ) : null}

          {log.fusionLevelAfter !== null ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("defusion.fusionAfterLabel")}</CardTitle>
                <CardDescription>{log.fusionLevelAfter} / 100</CardDescription>
              </CardHeader>
              {log.fusionLevelBefore !== null ? (
                <CardContent>
                  <Text className="font-semibold text-act">
                    {log.fusionLevelAfter < log.fusionLevelBefore
                      ? t("defusion.fusionDrop", {
                          before: log.fusionLevelBefore,
                          after: log.fusionLevelAfter,
                        })
                      : t("defusion.noFusionDrop", { after: log.fusionLevelAfter })}
                  </Text>
                </CardContent>
              ) : null}
            </Card>
          ) : null}

          {log.notes ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("defusion.notesLabel")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Text className="text-base leading-6">{log.notes}</Text>
              </CardContent>
            </Card>
          ) : null}
        </View>
      </ScrollView>

      <ConfirmDialog
        cancelLabel={t("defusion.cancel")}
        confirmLabel={t("defusion.delete")}
        error={deleteError}
        isPending={deleteMutation.isPending}
        message={t("defusion.deleteConfirmBody")}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteError("");
        }}
        onConfirm={() => void confirmDelete()}
        title={t("defusion.deleteConfirm")}
        visible={confirmOpen}
      />
    </SafeAreaView>
  );
}
