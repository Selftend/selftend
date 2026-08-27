import { router, useLocalSearchParams } from "expo-router";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { ScreenTopBar } from "@/src/components/app/screen-top-bar";
import { LoadingState } from "@/src/components/app/screen-state";
import { ShowAllLink } from "@/src/components/app/show-all-link";
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
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { formatInstantAtOffset } from "@/src/utils/date";
import { cn } from "@/lib/utils";

export default function GratitudeDetailScreen() {
  const pushWithOrigin = usePushWithOrigin();
  const { t, i18n } = useTranslation("gratitude");
  // The header actions never shrink, so every pixel of narrowness comes out
  // of the title block (#885's failure class). At phone width the labelled
  // Favourite button collapses to an icon, like mood's detail Edit.
  const { width: windowWidth } = useWindowDimensions();
  const wideHeader = windowWidth >= 640;
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
        <LoadingState title={t("detail.title")} />
      </SafeAreaView>
    );
  }

  if (!entry) {
    return (
      <SafeAreaView className="flex-1 bg-background">
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
    } catch {
      // The thrown message is a backend/internal string, English for every user -
      // translated copy only (i18n rule, #1060). The mutation cache's global onError
      // already reports the failure to Sentry.
      setDeleteError(t("detail.deleteError"));
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
    } catch {
      // The thrown message is a backend/internal string, English for every user -
      // translated copy only (i18n rule, #1060). The mutation cache's global onError
      // already reports the failure to Sentry.
      setFavoriteError(t("detail.favoriteError"));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScreenTopBar leading="back" />
      <ScrollView contentContainerClassName="grow p-6">
        <View className={cn(FORM_COLUMN, "gap-6")}>
          {/* Actions ride the header row top-right (design 6c, #877), not a
              row under the subline. The title block shrinks; the actions
              never do. */}
          <View className="flex-row items-start justify-between gap-4">
            <View className="min-w-0 flex-1 gap-2">
              <Text variant="h1">{dateTitle}</Text>
              <Text variant="muted">
                {t("detail.loggedSummary", { time: loggedTime, count: lines.length })}
              </Text>
            </View>
            <View className="shrink-0 flex-row flex-wrap justify-end gap-2">
              {wideHeader ? (
                <Button
                  disabled={starMutation.isPending}
                  onPress={() => void toggleFavorite()}
                  variant={entry.starred ? "tinted" : "outline"}
                >
                  <Icon name={entry.starred ? "star" : "star-outline"} className="size-4" />
                  <Text>{entry.starred ? t("detail.unfavorite") : t("detail.favorite")}</Text>
                </Button>
              ) : (
                // Icon-only at phone width: three ~40dp icons leave the title
                // its column; the accessible name keeps the full verb.
                <Button
                  accessibilityLabel={entry.starred ? t("detail.unfavorite") : t("detail.favorite")}
                  disabled={starMutation.isPending}
                  onPress={() => void toggleFavorite()}
                  size="icon"
                  variant={entry.starred ? "tinted" : "outline"}
                >
                  <Icon name={entry.starred ? "star" : "star-outline"} className="size-4" />
                </Button>
              )}
              <Button
                accessibilityLabel={t("detail.edit")}
                onPress={() =>
                  pushWithOrigin({
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
                {/* Muted at rest (design 6c): the confirm dialog carries the
                    destructive weight; a red icon idling on the screen is an
                    alarm nothing has raised (#877). */}
                <Icon name="delete-outline" className="size-4 text-muted-foreground" />
              </Button>
            </View>
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

          {/* Right-aligned quiet link (design 6c), not a centred button. */}
          <View className="items-end">
            <ShowAllLink label={t("home.viewAll")} route="/tools/gratitude-log/entries" />
          </View>
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
