import { memo } from "react";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { Pressable, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { formatDuration } from "@/src/features/sleep/format";
import { seedSleepLogDetail } from "@/src/features/sleep/queries";
import type { SleepLog } from "@/src/features/sleep/types";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { cn } from "@/lib/utils";

const QUALITY_DOTS = [1, 2, 3, 4, 5] as const;

interface SleepEntryRowProps {
  entry: SleepLog;
  /** The right-aligned column, formatted by the surface: a relative day on the
   * overview, a section-scoped time or date on the all-history screen. */
  when: string;
  className?: string;
}

/**
 * One sleep entry as a hairline row (#775): duration, a five-dot quality
 * read-out, the note, and when — replacing the recent list's card-per-entry.
 *
 * The dots encode the level by COUNT of filled dots, a non-colour ordinal cue —
 * but they must not be the only place the level appears for a screen-reader
 * user, so the row's single accessible name carries duration and quality in
 * words. The note rides as the hint: it is a content cue, not the identity.
 */
function SleepEntryRowComponent({ entry, when, className }: SleepEntryRowProps) {
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation("sleep");
  const queryClient = useQueryClient();

  const duration = formatDuration(entry.durationMinutes, t);
  const qualityWord = t(`quality.${entry.quality}` as Parameters<typeof t>[0]);
  const note = entry.notes.trim();

  return (
    <Pressable
      accessibilityHint={note || undefined}
      accessibilityLabel={t("entryRow.a11y", { duration, quality: qualityWord, when })}
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={() => {
        // This row IS the complete record — hand it to the detail cache so an
        // entry past the overview's 50-row window opens even if its own fetch
        // fails (an offline "not found" for an entry the user is looking at).
        seedSleepLogDetail(queryClient, entry);
        pushWithOrigin({ pathname: "/tools/sleep/[id]", params: { id: entry.id } });
      }}
      className={cn("flex-row items-center gap-3 px-0.5 py-3 active:bg-accent/40", className)}
      role="button"
    >
      <Text className="w-[64px] shrink-0 text-[14.5px] font-semibold tabular-nums">{duration}</Text>
      <View className="shrink-0 flex-row gap-0.5">
        {QUALITY_DOTS.map((dot) => (
          <View
            key={dot}
            className={cn(
              "size-[5px] rounded-full",
              dot <= entry.quality ? "bg-primary" : "bg-muted-foreground/25",
            )}
          />
        ))}
      </View>
      <Text variant="muted" className="flex-1 text-[13px]" numberOfLines={1}>
        {note || "—"}
      </Text>
      <Text variant="muted" className="shrink-0 text-xs tabular-nums">
        {when}
      </Text>
    </Pressable>
  );
}

export const SleepEntryRow = memo(SleepEntryRowComponent);
