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
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ActDetailLoading, ActDetailNotFound } from "@/src/features/act/act-detail-scaffold";
import { useChoicePoint, useChoicePoints, useDeleteChoicePoint } from "@/src/features/act/queries";
import { useCachedItem } from "@/src/features/act/use-cached-item";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

export default function ActChoicePointDetailScreen() {
  const { t } = useTranslation(["act", "common"]);
  const { user } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const cpId = typeof id === "string" ? id : null;
  const showToast = useToastStore((state) => state.showToast);

  const { item: cp, isLoading } = useCachedItem(
    useChoicePoints,
    useChoicePoint,
    user?.id ?? null,
    cpId,
  );

  const deleteMutation = useDeleteChoicePoint(user?.id ?? null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  if (isLoading) {
    return <ActDetailLoading title={t("act:choicePoint.listTitle")} />;
  }

  if (!cp) {
    return (
      <ActDetailNotFound
        title={t("act:choicePoint.listTitle")}
        message={t("act:choicePoint.empty")}
      />
    );
  }

  const confirmDelete = async () => {
    setDeleteError("");
    try {
      await deleteMutation.mutateAsync(cp.id);
      setConfirmOpen(false);
      showToast({ title: t("act:choicePoint.deleted"), tone: "success" });
      router.replace("/modules/act/choice-point" as Parameters<typeof router.replace>[0]);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : t("common:delete"));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={t("act:choicePoint.title")} />
            <Text variant="muted">{new Date(cp.createdAt).toLocaleString()}</Text>
            <View className="flex-row">
              <Button onPress={() => setConfirmOpen(true)} variant="ghost">
                <Icon name="delete-outline" className="size-4 text-destructive" />
                <Text>{t("common:delete")}</Text>
              </Button>
            </View>
          </View>

          {cp.hooks.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("act:choicePoint.hooksLabel")}</CardTitle>
              </CardHeader>
              <CardContent>
                <View className="gap-1">
                  {cp.hooks.map((hook, i) => (
                    <Text key={i} className="text-base leading-6">
                      {hook}
                    </Text>
                  ))}
                </View>
              </CardContent>
            </Card>
          ) : null}

          {cp.awayMoves.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("act:choicePoint.awayLabel")}</CardTitle>
              </CardHeader>
              <CardContent>
                <View className="gap-1">
                  {cp.awayMoves.map((move, i) => (
                    <Text key={i} className="text-base leading-6">
                      {move}
                    </Text>
                  ))}
                </View>
              </CardContent>
            </Card>
          ) : null}

          {cp.towardMoves.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("act:choicePoint.towardLabel")}</CardTitle>
              </CardHeader>
              <CardContent>
                <View className="gap-1">
                  {cp.towardMoves.map((move, i) => (
                    <Text key={i} className="text-base leading-6">
                      {move}
                    </Text>
                  ))}
                </View>
              </CardContent>
            </Card>
          ) : null}

          {cp.notes ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("act:choicePoint.notesLabel")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Text className="text-base leading-6">{cp.notes}</Text>
              </CardContent>
            </Card>
          ) : null}
        </View>
      </ScrollView>

      <ConfirmDialog
        cancelLabel={t("common:cancel")}
        confirmLabel={t("common:delete")}
        error={deleteError}
        isPending={deleteMutation.isPending}
        message={t("act:choicePoint.deleteConfirmBody")}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteError("");
        }}
        onConfirm={() => void confirmDelete()}
        title={t("act:choicePoint.deleteConfirm")}
        visible={confirmOpen}
      />
    </SafeAreaView>
  );
}
