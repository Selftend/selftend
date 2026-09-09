import { router, useLocalSearchParams } from "expo-router";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { ScreenTopBar } from "@/src/components/app/screen-top-bar";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { ScreenLoading } from "@/src/components/app/screen-state";
import { FORM_COLUMN } from "@/src/lib/layout";
import { DEFAULT_INTERACTIVE_HIT_SLOP, enterKeyActivationProps } from "@/src/lib/accessibility";
import { formatRelativeActivity, formatRelativeDayKey } from "@/src/utils/relative-time";
import {
  useDeleteJournalEntry,
  useJournalEntries,
  useJournalEntry,
} from "@/src/features/journal/queries";
import { countWords } from "@/src/features/journal/word-count";
import type { JournalEntry } from "@/src/features/journal/types";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { formatAtOffset } from "@/src/utils/date";

/**
 * Joins meta segments with the interpunct.
 *
 * The separator belongs to the JOIN, never to a segment's own string. #733
 * shipped the other way round - every `Last · {{when}}` carried its own dot -
 * and the stats row rendered `12 entries · 3,400 words · Last · 5 Jun`. Empty
 * segments drop out rather than leaving a dangling dot.
 */
export function joinMeta(segments: (string | null | undefined)[]): string {
  return segments.filter((segment): segment is string => Boolean(segment)).join(" · ");
}

export default function JournalDetailScreen() {
  const pushWithOrigin = usePushWithOrigin();
  const openAllEntries = () => pushWithOrigin("/tools/journal/entries");
  const { t, i18n } = useTranslation("journal");
  const { user } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const entryId = typeof id === "string" ? id : null;
  const showToast = useToastStore((state) => state.showToast);

  const { data: cachedList } = useJournalEntries(user?.id ?? null, 50);
  const fromCache = entryId ? (cachedList?.find((entry) => entry.id === entryId) ?? null) : null;
  const { data: fetched, isLoading } = useJournalEntry(
    fromCache ? null : (user?.id ?? null),
    fromCache ? null : entryId,
  );
  const entry: JournalEntry | null = fromCache ?? fetched ?? null;

  const deleteMutation = useDeleteJournalEntry(user?.id ?? null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  if (!fromCache && isLoading) {
    return <ScreenLoading title={t("detail.title")} />;
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

  const occurredAt = entry.occurredAt ?? entry.createdAt;
  // Same frame as the card in the list: the captured day, not the viewer's.
  const when = formatRelativeDayKey(entry.dayKey, t);
  const trimmedTitle = entry.title.trim();
  const heading = trimmedTitle.length > 0 ? trimmedTitle : t("detail.title");

  // Rendered in the frame it was captured in, so the time matches the civil day
  // the entry is filed under everywhere else (#250).
  const createdAtLabel = formatAtOffset(occurredAt, entry.occurredOffsetMinutes, i18n.language);
  const words = countWords(entry.body);

  /**
   * One line, where the old screen had a heading, a muted day and a whole card
   * whose only content was a timestamp. A timestamp is not a section.
   *
   * At 360dp this wraps to two lines in `en` and to three in `bg`, where
   * "{{count}} думи" and the long month names both run wider - which is why it
   * is a single wrapping `Text` rather than a no-wrap row.
   */
  const metaLine = joinMeta([when, createdAtLabel, t("detail.words", { count: words })]);

  /**
   * Two frames, deliberately. "Written" is the entry's own captured civil day,
   * the same `dayKey` every other surface files it under. "edited" is a
   * server-set instant with no captured offset, so the viewer's frame is the
   * only frame it has - which is why this file carries the lint exemption.
   *
   * `updatedAt` is touched on every write, so it equals `createdAt` for an entry
   * nobody has come back to; only a real revision earns the second segment.
   */
  const editedLabel =
    entry.updatedAt > entry.createdAt
      ? t("detail.edited", { when: formatRelativeActivity(entry.updatedAt, t) })
      : null;
  const footerLine = joinMeta([t("detail.written", { when }), editedLabel]);

  const confirmDelete = async () => {
    setDeleteError("");
    try {
      await deleteMutation.mutateAsync(entry.id);
      setConfirmOpen(false);
      showToast({ title: t("feedback.deleted"), tone: "success" });
      router.replace("/tools/journal" as Parameters<typeof router.replace>[0]);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : t("detail.deleteError"));
    }
  };

  return (
    <View testID="journal-detail-room" className="flex-1">
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        {/* The trail rides the bar, not the column: chrome for the screen rather
            than part of the document (#733). */}
        <ScreenTopBar leading="back" />

        <ScrollView contentContainerClassName="grow px-6 pt-10 pb-14">
          <View className={`${FORM_COLUMN} gap-8`}>
            <View className="gap-4">
              <View className="flex-row items-start gap-3">
                <Text
                  role="heading"
                  aria-level={1}
                  className="flex-1 font-display text-[26px] font-bold leading-tight tracking-tight"
                >
                  {heading}
                </Text>
                <View className="flex-row items-center gap-1">
                  {/* Default size, not "sm": the adjacent trash is size="icon"
                      (h-10 sm:h-9), and only the default shares that height —
                      an sm pill sits 4px shorter and reads as broken (#911). */}
                  <Button
                    onPress={() => pushWithOrigin(`/tools/journal/${entry.id}/edit`)}
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
              <Text variant="muted" className="text-[13px]">
                {metaLine}
              </Text>
            </View>

            {/*
              The writing gets the page. Two hairlines and nothing else: a card
              here would put the entry inside a panel on a page, which is the
              shape the redesign exists to remove. 16px on the form measure at
              1.7 is a reading column, not a form field.
            */}
            <View className="border-y border-border py-6">
              <Text className="text-base leading-[1.7]">{entry.body}</Text>
            </View>

            <View className="flex-row flex-wrap items-center justify-between gap-3">
              <Text variant="muted" className="text-[13px]">
                {footerLine}
              </Text>
              <Pressable
                accessibilityRole="link"
                hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                onPress={openAllEntries}
                className="flex-row items-center gap-1 active:opacity-70"
                role="link"
                {...enterKeyActivationProps(openAllEntries)}
              >
                <Text className="text-[13px] font-semibold text-primary-ink">
                  {t("detail.showAll")}
                </Text>
                <Icon name="arrow-forward" className="size-3.5 text-primary-ink" />
              </Pressable>
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
