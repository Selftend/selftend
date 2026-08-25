import { router, useLocalSearchParams, type Href } from "expo-router";
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
import { LoadingState } from "@/src/components/app/screen-state";
import { DeleteEntryButton } from "@/src/components/app/delete-entry-button";
import { useDeleteWorryEntry, useWorryEntry } from "@/src/features/worry/queries";
import { useInlineWriteError } from "@/src/lib/use-inline-write-error";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { ScreenHeader } from "@/src/components/app/screen-header";

export default function WorryDetailScreen() {
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation("cbt");
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);
  const { data: entry, isLoading } = useWorryEntry(user?.id ?? null, id ?? null);
  const deleteMutation = useDeleteWorryEntry(user?.id ?? null);
  const deleteError = useInlineWriteError(t("worry.deleteError"));

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

  // ☠️ `DeleteEntryButton` keeps its confirmation OPEN when the delete rejects, so the
  // global save-failed toast would land behind a native modal (#1364, spec §10).
  // `ConfirmDialog` already carries an `error` slot; the failure goes there. The
  // success toast is safe - it fires as the screen is being replaced.
  const handleDelete = async () => {
    deleteError.onStart();
    try {
      await deleteMutation.mutateAsync(entry.id);
    } catch (error) {
      deleteError.onError();
      // Rethrown on purpose: `DeleteEntryButton` closes its confirmation only when
      // `onConfirm` RESOLVES, and a closed dialog has nowhere to show this.
      throw error;
    }
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
              onPress={() => pushWithOrigin(`/modules/cbt/worry/new?entryId=${entry.id}` as Href)}
              variant="secondary"
            >
              <Text>{t("common:edit")}</Text>
            </Button>
            <DeleteEntryButton
              error={deleteError.message ?? undefined}
              label={t("common:delete")}
              title={t("worry.deleteTitle")}
              message={t("worry.deleteMessage")}
              onOpen={deleteError.onStart}
              onConfirm={handleDelete}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
