import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { ScreenTopBar } from "@/src/components/app/screen-top-bar";
import { LoadingState } from "@/src/components/app/screen-state";
import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { gratitudeEntryLines } from "@/src/features/gratitude/gratitude-entry-card";
import {
  useDeleteGratitudeEntry,
  useGratitudeEntries,
  useGratitudeEntry,
  useSetGratitudeEntryStarred,
} from "@/src/features/gratitude/queries";
import type { GratitudeEntry } from "@/src/features/gratitude/types";
import { FORM_COLUMN } from "@/src/lib/layout";
import { useRoomStyle } from "@/src/lib/use-room-style";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { formatInstantAtOffset } from "@/src/utils/date";
import { cn } from "@/lib/utils";

export default function GratitudeDetailScreen() {
  const { t, i18n } = useTranslation("gratitude");
  const roomStyle = useRoomStyle("think");
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
      <SafeAreaView className="flex-1 bg-background" style={roomStyle}>
        <LoadingState title={t("detail.title")} />
      </SafeAreaView>
    );
  }

  if (!entry) {
    return (
      <SafeAreaView className="flex-1 bg-background" style={roomStyle}>
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <ScreenHeader title={t("detail.title")} />
            <Text variant="muted">{t("detail.notFound")}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const lines = gratitudeEntryLines(entry);
  const dateTitle = formatInstantAtOffset(
    entry.loggedAt,
    entry.loggedOffsetMinutes,
    { weekday: "long", day: "numeric", month: "long" },
    i18n.language,
  );
  const loggedTime = formatInstantAtOffset(
    entry.loggedAt,
    entry.loggedOffsetMinutes,
    { hour: "numeric", minute: "2-digit" },
    i18n.language,
  );

  const confirmDelete = async () => {
    setDeleteError("");
    try {
      await deleteMutation.mutateAsync(entry.id);
      setConfirmOpen(false);
      showToast({ title: t("feedback.deleted"), tone: "success" });
      router.replace("/tools/gratitude-log" as Parameters<typeof router.replace>[0]);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : t("detail.deleteError"));
    }
  };

  const toggleFavorite = async () => {
    setFavoriteError("");
    try {
      const updated = await starMutation.mutateAsync({ id: entry.id, starred: !entry.starred });
      showToast({
        title: updated.starred ? t("feedback.favoriteAdded") : t("feedback.favoriteRemoved"),
        tone: "success",
      });
    } catch (error) {
      setFavoriteError(error instanceof Error ? error.message : t("detail.favoriteError"));
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={["bottom", "left", "right"]}
      style={roomStyle}
    >
      <ScreenTopBar leading="back" />
      <ScrollView contentContainerClassName="grow p-6">
        <View className={cn(FORM_COLUMN, "gap-6")}>
          <View className="gap-2">
            <Text variant="h1">{dateTitle}</Text>
            <Text variant="muted">
              {t("detail.loggedSummary", { time: loggedTime, count: lines.length })}
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-2">
            <Button
              disabled={starMutation.isPending}
              onPress={() => void toggleFavorite()}
              variant={entry.starred ? "tinted" : "outline"}
            >
              <Icon name={entry.starred ? "star" : "star-outline"} className="size-4" />
              <Text>{entry.starred ? t("detail.unfavorite") : t("detail.favorite")}</Text>
            </Button>
            <Button
              accessibilityLabel={t("detail.edit")}
              onPress={() =>
                router.push({
                  pathname: "/tools/gratitude-log/[id]/edit",
                  params: { id: entry.id },
                })
              }
              size="icon"
              variant="outline"
            >
              <Icon name="edit" className="size-4" />
            </Button>
            <Button
              accessibilityLabel={t("detail.delete")}
              onPress={() => setConfirmOpen(true)}
              size="icon"
              variant="ghost"
            >
              <Icon name="delete-outline" className="size-4 text-destructive" />
            </Button>
          </View>
          {favoriteError ? <Text className="text-sm text-destructive">{favoriteError}</Text> : null}

          <View className="border-y border-border">
            {lines.map((line, index) => (
              <View
                key={`${index}-${line}`}
                className={cn(
                  "flex-row gap-4 py-4",
                  index < lines.length - 1 && "border-b border-border",
                )}
              >
                <Text className="w-6 text-center text-sm font-semibold text-primary-ink">
                  {index + 1}
                </Text>
                <Text className="flex-1 text-base leading-6">{line}</Text>
              </View>
            ))}
          </View>

          <Button onPress={() => router.push("/tools/gratitude-log/entries")} variant="link">
            <Text>{t("home.viewAll")}</Text>
          </Button>
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
