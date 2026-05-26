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
  useDeleteGratitudeEntry,
  useGratitudeEntries,
  useGratitudeEntry,
  useSetGratitudeEntryStarred,
} from "@/src/features/gratitude/queries";
import type { GratitudeEntry } from "@/src/features/gratitude/types";
import { formatMoodRelativeTime } from "@/src/features/mood/relative-time";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function GratitudeDetailScreen() {
  const { t } = useTranslation("gratitude");
  const { user } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const entryId = typeof id === "string" ? id : null;
  const showToast = useToastStore((state) => state.showToast);

  const { data: cachedList } = useGratitudeEntries(user?.id ?? null, 50);
  const fromCache = entryId ? (cachedList?.find((entry) => entry.id === entryId) ?? null) : null;
  const { data: fetched, isLoading } = useGratitudeEntry(
    fromCache ? null : (user?.id ?? null),
    fromCache ? null : entryId,
  );
  const entry: GratitudeEntry | null = fromCache ?? fetched ?? null;

  const deleteMutation = useDeleteGratitudeEntry(user?.id ?? null);
  const starMutation = useSetGratitudeEntryStarred(user?.id ?? null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [favoriteError, setFavoriteError] = useState("");

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

  const when = formatMoodRelativeTime(entry.loggedAt, t);
  const heading = t("detail.title");

  const confirmDelete = async () => {
    setDeleteError("");
    try {
      await deleteMutation.mutateAsync(entry.id);
      setConfirmOpen(false);
      showToast({ title: t("feedback.deleted"), tone: "success" });
      router.replace("/tools/gratitude-log" as Parameters<typeof router.replace>[0]);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : t("detail.deleteError"));
    }
  };

  const toggleFavorite = async () => {
    setFavoriteError("");
    try {
      const updated = await starMutation.mutateAsync({
        id: entry.id,
        starred: !entry.starred,
      });
      showToast({
        title: updated.starred ? t("feedback.favoriteAdded") : t("feedback.favoriteRemoved"),
        tone: "success",
      });
    } catch (e) {
      setFavoriteError(e instanceof Error ? e.message : t("detail.favoriteError"));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={heading} />
            <View className="flex-row items-center gap-2">
              <Text variant="muted">{when}</Text>
            </View>
            <View className="flex-row flex-wrap gap-3">
              <Button
                disabled={starMutation.isPending}
                onPress={() => void toggleFavorite()}
                variant={entry.starred ? "secondary" : "ghost"}
              >
                <Icon
                  name={entry.starred ? "star" : "star-outline"}
                  className="size-4 text-primary"
                />
                <Text>{entry.starred ? t("detail.unfavorite") : t("detail.favorite")}</Text>
              </Button>
              <Button
                onPress={() =>
                  router.push({
                    pathname: "/tools/gratitude-log/[id]/edit",
                    params: { id: entry.id },
                  })
                }
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
            {favoriteError ? (
              <Text className="text-sm text-destructive">{favoriteError}</Text>
            ) : null}
          </View>

          <Card>
            <CardHeader>
              <CardTitle>{t("detail.itemsTitle")}</CardTitle>
              <CardDescription>{t("detail.itemsDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <View className="gap-3">
                {entry.items.map((item, index) => (
                  <View key={`${index}-${item}`} className="flex-row gap-3">
                    <Text className="w-6 text-base font-semibold text-primary">{index + 1}</Text>
                    <Text className="flex-1 text-base leading-6">{item}</Text>
                  </View>
                ))}
              </View>
            </CardContent>
          </Card>

          {entry.lifeItems.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("detail.lifeItemsTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                <View className="gap-3">
                  {entry.lifeItems.map((item, index) => (
                    <View key={`${index}-${item}`} className="flex-row gap-3">
                      <Text className="w-6 text-base font-semibold text-primary">{index + 1}</Text>
                      <Text className="flex-1 text-base leading-6">{item}</Text>
                    </View>
                  ))}
                </View>
              </CardContent>
            </Card>
          ) : null}

          {entry.note.trim().length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("detail.noteTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Text className="text-base leading-6">{entry.note.trim()}</Text>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>{t("detail.loggedAt")}</CardTitle>
              <CardDescription>{formatTimestamp(entry.loggedAt)}</CardDescription>
            </CardHeader>
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
