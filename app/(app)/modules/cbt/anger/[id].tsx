import { router, useLocalSearchParams } from "expo-router";
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
import { LoadingState } from "@/src/components/app/screen-state";
import { DeleteEntryButton } from "@/src/components/app/delete-entry-button";
import { useAngerLog, useDeleteAngerLog } from "@/src/features/anger/queries";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { ScreenHeader } from "@/src/components/app/screen-header";

export default function AngerDetailScreen() {
  const { t } = useTranslation("cbt");
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);
  const { data: log, isLoading } = useAngerLog(user?.id ?? null, id ?? null);
  const deleteMutation = useDeleteAngerLog(user?.id ?? null);
  const handleDelete = async () => {
    if (!log) return;
    await deleteMutation.mutateAsync(log.id);
    showToast({ title: t("common:feedback.deleted"), tone: "success" });
    router.replace("/modules/cbt/anger");
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("anger.loading")} />
        </View>
      </SafeAreaView>
    );
  }

  if (!log) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center p-6">
          <Text variant="h2">{t("anger.notFound")}</Text>
        </View>
      </SafeAreaView>
    );
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
              onPress={() => router.push(`/modules/cbt/anger/new?logId=${log.id}`)}
              variant="secondary"
            >
              <Text>{t("common:edit")}</Text>
            </Button>
            <DeleteEntryButton
              label={t("common:delete")}
              title={t("anger.deleteTitle")}
              message={t("anger.deleteMessage")}
              onConfirm={handleDelete}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
