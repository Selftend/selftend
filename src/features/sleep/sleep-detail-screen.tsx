import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { DetailRow } from "@/src/components/app/detail-row";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { ScreenTopBar } from "@/src/components/app/screen-top-bar";
import { LoadingState } from "@/src/components/app/screen-state";
import { useDeleteSleepLog, useSleepLog, useSleepLogs } from "@/src/features/sleep/queries";
import { ShowAllLink } from "@/src/components/app/show-all-link";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { FORM_COLUMN } from "@/src/lib/layout";
import { useRoomStyle } from "@/src/lib/use-room-style";
import { formatAtOffset, formatInstantAtOffset } from "@/src/utils/date";
import { formatRelativeDayKey } from "@/src/utils/relative-time";
import { formatDuration } from "@/src/features/sleep/format";

/**
 * Screen `8c` — one sleep entry (#775).
 *
 * Four cards for four facts collapse into one line: the duration and the
 * quality word are the headline, the day and timing are its subline, and the
 * note is the one conditional hairline row. The design drew an `Against you`
 * comparison row and a factors row too; the comparison was removed outright
 * (#838 — a single entry presents factual details, not a score against a
 * personal baseline) and structured factors were rejected (#800), so an entry
 * with no note shows no rows at all.
 */
export default function SleepDetailScreen() {
  const { t, i18n } = useTranslation("sleep");
  const roomStyle = useRoomStyle("ink");
  const { user } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const logId = typeof id === "string" ? id : null;
  const showToast = useToastStore((state) => state.showToast);

  const { data: cachedList } = useSleepLogs(user?.id ?? null, 50);
  const fromCache = logId ? (cachedList?.find((l) => l.id === logId) ?? null) : null;

  const { data: fetched, isLoading } = useSleepLog(
    fromCache ? null : (user?.id ?? null),
    fromCache ? null : logId,
  );

  const entry = fromCache ?? fetched ?? null;
  const deleteMutation = useDeleteSleepLog(user?.id ?? null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const confirmDelete = async () => {
    if (!entry) return;
    setDeleteError("");
    try {
      await deleteMutation.mutateAsync(entry.id);
      setConfirmOpen(false);
      showToast({ title: t("feedback.deleted"), tone: "success" });
      router.replace("/tools/sleep" as Parameters<typeof router.replace>[0]);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : t("detail.deleteError"));
    }
  };

  if (!fromCache && isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" style={roomStyle}>
        <View className="flex-1 justify-center">
          <LoadingState title={t("detail.title")} />
        </View>
      </SafeAreaView>
    );
  }

  if (!entry) {
    return (
      <SafeAreaView
        className="flex-1 bg-background"
        edges={["bottom", "left", "right"]}
        style={roomStyle}
      >
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <ScreenHeader title={t("detail.title")} />
            <Text variant="muted">{t("detail.notFound")}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const trimmedNotes = entry.notes.trim();
  const qualityWord = t(`quality.${entry.quality}` as Parameters<typeof t>[0]);

  // The day in the frame the entry was captured in, then the timing. A windowed
  // entry shows its own bounds, each read at the offset captured at that bound
  // (#800: a sleep may cross a DST or zone change, so the two frames differ);
  // a duration-only entry shows the occurrence timestamp it always had. The
  // separator joins here in code — no translation string carries its own "·".
  const timeOptions = { hour: "numeric", minute: "2-digit" } as const;
  const subline = [
    formatRelativeDayKey(entry.dayKey, t),
    entry.window
      ? t("detail.windowTimes", {
          start: formatInstantAtOffset(
            entry.window.startedAt,
            entry.window.startedOffsetMinutes,
            timeOptions,
            i18n.language,
          ),
          end: formatInstantAtOffset(
            entry.window.endedAt,
            entry.window.endedOffsetMinutes,
            timeOptions,
            i18n.language,
          ),
        })
      : formatAtOffset(entry.loggedAt, entry.loggedOffsetMinutes),
  ].join(" · ");

  return (
    <View className="flex-1" style={roomStyle}>
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        {/* The trail rides the bar, not the column: chrome for the screen rather
            than part of the document (#733). */}
        <ScreenTopBar leading="back" />

        <ScrollView contentContainerClassName="grow px-6 pt-10 pb-14">
          <View className={`${FORM_COLUMN} gap-8`}>
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1 gap-0.5">
                <Text className="font-display text-2xl font-bold tracking-tight tabular-nums">
                  {formatDuration(entry.durationMinutes, t)} · {qualityWord}
                </Text>
                <Text variant="muted" className="text-[13px] tabular-nums">
                  {subline}
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                {/* Default size, not "sm": the adjacent trash is size="icon"
                    (h-10 sm:h-9), and only the default shares that height —
                    an sm pill sits 4px shorter and reads as broken (#911). */}
                <Button
                  onPress={() => router.push(`/tools/sleep/${entry.id}/edit`)}
                  variant="outline"
                >
                  <Icon name="edit" className="size-4" />
                  <Text>{t("detail.edit")}</Text>
                </Button>
                <Button
                  onPress={() => setConfirmOpen(true)}
                  variant="ghost"
                  size="icon"
                  accessibilityLabel={t("detail.delete")}
                >
                  <Icon name="delete-outline" className="size-[18px] text-muted-foreground" />
                </Button>
              </View>
            </View>

            {trimmedNotes ? (
              <View>
                <DetailRow label={t("detail.notes")}>
                  <Text className="text-sm leading-relaxed">{trimmedNotes}</Text>
                </DetailRow>
                {/* Closing hairline: the rows are top-ruled, so the last one
                    needs a floor or the column stops mid-air. */}
                <View className="border-t border-border" />
              </View>
            ) : null}

            <View className="items-end">
              <ShowAllLink label={t("allHistory.link")} route="/tools/sleep/history" />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

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
    </View>
  );
}
