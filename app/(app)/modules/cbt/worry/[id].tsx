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
import { useDeleteWorryEntry, useWorryEntry } from "@/src/features/worry/queries";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { ScreenHeader } from "@/src/components/app/screen-header";

export default function WorryDetailScreen() {
  const { t } = useTranslation("cbt");
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);
  const { data: entry, isLoading } = useWorryEntry(user?.id ?? null, id ?? null);
  const deleteMutation = useDeleteWorryEntry(user?.id ?? null);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("worry.loadingDetail")} />
        </View>
      </SafeAreaView>
    );
  }

  if (!entry) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center p-6">
          <Text variant="h2">{t("worry.notFound")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(entry.id);
    showToast({ title: t("common:feedback.deleted"), tone: "success" });
    router.replace("/modules/cbt/worry");
  };

  const renderList = (label: string, items: string[]) =>
    items.length > 0 ? (
      <View className="gap-1 mt-2">
        <Text className="text-sm font-medium">{label}</Text>
        {items.map((item, i) => (
          <Text key={i} variant="muted" className="text-sm">
            • {item}
          </Text>
        ))}
      </View>
    ) : null;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={t("worry.detailTitle")} />
            <Text variant="h3">{entry.worryStatement}</Text>
          </View>

          <Card>
            <CardHeader>
              <CardTitle>{t(`worry.category.${entry.worryCategory}`)}</CardTitle>
              {entry.probabilityEstimate !== null ? (
                <CardDescription>
                  {t("worry.probabilityLabel", { value: entry.probabilityEstimate })}
                </CardDescription>
              ) : null}
            </CardHeader>
            <CardContent>
              {entry.copingStatement ? <Text variant="muted">{entry.copingStatement}</Text> : null}
              {renderList(t("worry.evidenceFor"), entry.evidenceFor)}
              {renderList(t("worry.evidenceAgainst"), entry.evidenceAgainst)}
              {renderList(t("worry.actionSteps"), entry.actionSteps)}
            </CardContent>
          </Card>

          <View className="gap-3">
            <Button
              onPress={() =>
                router.push(
                  `/modules/cbt/worry/new?entryId=${entry.id}` as Parameters<typeof router.push>[0],
                )
              }
              variant="secondary"
            >
              <Text>{t("common:edit")}</Text>
            </Button>
            <DeleteEntryButton
              label={t("common:delete")}
              title={t("worry.deleteTitle")}
              message={t("worry.deleteMessage")}
              onConfirm={handleDelete}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
