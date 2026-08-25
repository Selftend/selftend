import { router, useLocalSearchParams, type Href } from "expo-router";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { ScreenTopBar } from "@/src/components/app/screen-top-bar";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { DetailRow } from "@/src/components/app/detail-row";
import { ChipRun, StaticChip } from "@/src/components/app/selectable-chip";
import { LoadingState } from "@/src/components/app/screen-state";
import { MOOD_EMOJI_BY_SCORE } from "@/src/components/app/mood-scale";
import { FORM_COLUMN } from "@/src/lib/layout";
import { useDeleteMoodLog, useMoodLog, useMoodLogs } from "@/src/features/mood/queries";
import { ShowAllLink } from "@/src/components/app/show-all-link";
import type { MoodLog } from "@/src/features/mood/types";
import { formatRelativeDayKey } from "@/src/utils/relative-time";
import { useEmotionDisplay } from "@/src/features/mood/use-emotion-display";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { formatAtOffset, formatCompactAtOffset } from "@/src/utils/date";
import { useRoomStyle } from "@/src/lib/use-room-style";

/**
 * The one linked strategy the app can produce, and where its row leads.
 *
 * `linked_strategy` is not a form field and never was: `modules/cbt/activities/[id]`
 * is the only writer, and it always writes this one slug. Rendering `entry.linkedStrategy`
 * raw - which is what shipped - put the literal string `behavioral-activation` on screen
 * in both locales, an untranslated user-visible string.
 *
 * An unrecognised slug renders no row at all. That hides nothing the user wrote: this
 * value is a system marker, not their words, and a row we cannot name is a row that
 * would have to show the slug again.
 */
const LINKED_STRATEGIES: Record<string, { labelKey: string; href: string }> = {
  "behavioral-activation": {
    labelKey: "detail.strategies.behavioralActivation",
    href: "/modules/cbt/activities",
  },
};

export default function MoodDetailScreen() {
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation("mood");
  const { t: tCbt } = useTranslation("cbt");
  const roomStyle = useRoomStyle("be");
  // The header row's flanks (emoji + actions) never shrink, so every pixel of
  // narrowness comes out of the title block. At phone width the design's 2c
  // collapses Edit to an icon button and keeps the date on one compact line —
  // without that, the date wraps into a tall ragged column and the title can
  // break a character per line (#885).
  const { width: windowWidth } = useWindowDimensions();
  const wideHeader = windowWidth >= 640;
  const { user } = useSession();
  const { resolveEmotion } = useEmotionDisplay();
  const { id } = useLocalSearchParams<{ id: string }>();
  const moodId = typeof id === "string" ? id : null;
  const showToast = useToastStore((state) => state.showToast);

  const { data: cachedList } = useMoodLogs(user?.id ?? null, 30);
  const fromCache = moodId ? (cachedList?.find((log) => log.id === moodId) ?? null) : null;

  const { data: fetched, isLoading } = useMoodLog(
    fromCache ? null : (user?.id ?? null),
    fromCache ? null : moodId,
  );

  const entry: MoodLog | null = fromCache ?? fetched ?? null;

  const deleteMutation = useDeleteMoodLog(user?.id ?? null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const confirmDelete = async () => {
    if (!entry) return;
    setDeleteError("");
    try {
      await deleteMutation.mutateAsync(entry.id);
      setConfirmOpen(false);
      showToast({ title: t("feedback.deleted"), tone: "success" });
      router.replace("/tools/check-in" as Parameters<typeof router.replace>[0]);
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

  // Same frame as the card that was tapped: the captured day, not the viewer's.
  const when = formatRelativeDayKey(entry.dayKey, t);
  const trimmedNotes = entry.notes.trim();
  const linked = entry.linkedStrategy ? LINKED_STRATEGIES[entry.linkedStrategy] : undefined;

  /**
   * Seven possible rows, every one conditional on having content (#703).
   *
   * The design draws two because its sample entry has two - that is a sample, not the
   * row set. An entry with a score and nothing else shows no rows at all, which is the
   * point: three big empty cards used to make a one-tap check-in look like an
   * unfinished form.
   */
  const rows = [
    entry.emotions.length > 0 ? (
      <DetailRow key="emotions" label={t("detail.emotions")}>
        <ChipRun>
          {entry.emotions.map((emotionId) => {
            const display = resolveEmotion(emotionId);
            return <StaticChip key={emotionId} emoji={display.emoji} label={display.name} />;
          })}
        </ChipRun>
      </DetailRow>
    ) : null,
    trimmedNotes ? (
      <DetailRow key="notes" label={t("detail.notes")}>
        <Text className="text-sm leading-relaxed">{trimmedNotes}</Text>
      </DetailRow>
    ) : null,
    ...(
      [
        ["situation", tCbt("mood.situationLabel"), entry.situation],
        ["thoughts", tCbt("mood.thoughtsLabel"), entry.thoughts],
        ["behaviours", tCbt("mood.behavioursLabel"), entry.behaviours],
        ["sensations", tCbt("mood.sensationsLabel"), entry.bodilySensations],
      ] as const
    ).map(([key, label, raw]) => {
      const value = raw.trim();
      return value ? (
        <DetailRow key={key} label={label}>
          <Text className="text-sm leading-relaxed">{value}</Text>
        </DetailRow>
      ) : null;
    }),
    linked ? (
      <DetailRow key="linkedStrategy" label={t("detail.linkedStrategy")}>
        <Pressable
          accessibilityRole="link"
          hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
          onPress={() => pushWithOrigin(linked.href as Href)}
          className="flex-row items-center gap-1 self-start active:opacity-70"
          role="link"
        >
          <Text className="text-sm font-semibold text-primary-ink">{t(linked.labelKey)}</Text>
          <Icon name="arrow-forward" className="size-3.5 text-primary-ink" />
        </Pressable>
      </DetailRow>
    ) : null,
  ].filter(Boolean);

  return (
    <View className="flex-1" style={roomStyle}>
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        {/* The trail rides the bar, not the column: chrome for the screen rather than
            part of the document (#733). */}
        <ScreenTopBar leading="back" />

        <ScrollView contentContainerClassName="grow px-6 pt-10 pb-14">
          <View className={`${FORM_COLUMN} gap-8`}>
            <View className="flex-row items-center gap-3.5">
              <Text className="text-[40px] leading-none">
                {MOOD_EMOJI_BY_SCORE[entry.moodScore] ?? ""}
              </Text>
              {/* min-w-0: RN-web resolves min-width:auto on a flex child from
                  its content, so without it the title block refuses to shrink
                  and pushes the actions off-screen instead (#885). */}
              <View className="min-w-0 flex-1 gap-0.5">
                <Text className="font-display text-2xl font-bold tracking-tight">
                  {t(`checkin.scaleLabels.${entry.moodScore}`)} · {entry.moodScore}
                </Text>
                {/* The logged-at card folds into this line - a timestamp is not a
                    section, and it was the emptiest card on the screen. One line
                    always (design 2c): at phone width the compact form carries
                    the date, so nothing is lost to the ellipsis in practice. */}
                <Text variant="muted" className="text-[13px]" numberOfLines={1}>
                  {when} ·{" "}
                  {wideHeader
                    ? formatAtOffset(entry.loggedAt, entry.loggedOffsetMinutes)
                    : formatCompactAtOffset(entry.loggedAt, entry.loggedOffsetMinutes)}
                </Text>
              </View>
              <View className="shrink-0 flex-row items-center gap-1">
                {wideHeader ? (
                  // Default size, not "sm": the adjacent trash is size="icon"
                  // (h-10 sm:h-9), and only the default shares that height —
                  // an sm pill sits 4px shorter and reads as broken (#901).
                  <Button
                    onPress={() => pushWithOrigin(`/tools/check-in/${entry.id}/edit`)}
                    variant="outline"
                  >
                    <Icon name="edit" className="size-4" />
                    <Text>{t("detail.edit")}</Text>
                  </Button>
                ) : (
                  // Icon-only at phone width (design 2c's phone header): the
                  // labelled button is a third of the row a 360dp screen
                  // cannot spare.
                  <Button
                    onPress={() => pushWithOrigin(`/tools/check-in/${entry.id}/edit`)}
                    variant="outline"
                    size="icon"
                    accessibilityLabel={t("detail.edit")}
                  >
                    <Icon name="edit" className="size-4" />
                  </Button>
                )}
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

            {rows.length > 0 ? (
              <View>
                {rows}
                {/* Closing hairline: the rows are top-ruled, so the last one needs a
                    floor or the column stops mid-air. */}
                <View className="border-t border-border" />
              </View>
            ) : null}

            <View className="items-end">
              <ShowAllLink label={t("allHistory.link")} route="/tools/check-in/history" />
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
