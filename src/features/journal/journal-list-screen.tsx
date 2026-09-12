import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { Section } from "@/src/components/app/section";
import { SegmentedControl } from "@/src/components/app/segmented-control";
import { JournalOnboarding } from "@/src/components/app/journal-onboarding-modal";
import { EmptyState } from "@/src/components/app/screen-state";
import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { enterKeyActivationProps } from "@/src/lib/accessibility";
import { formatRelativeActivity } from "@/src/utils/relative-time";
import { countWords } from "@/src/features/journal/word-count";
import { JournalCard } from "@/src/features/journal/journal-card";
import {
  formatJournalMonth,
  formatJournalRecentWhen,
  formatJournalWritingRange,
  groupRecentJournalEntries,
  type JournalRecentSection,
} from "@/src/features/journal/journal-overview";
import {
  JournalWritingChart,
  JournalWritingChartReservation,
} from "@/src/features/journal/journal-writing-chart";
import {
  useJournalEntries,
  useJournalEntryCount,
  useJournalWritingBuckets,
  useJournalWordTotal,
} from "@/src/features/journal/queries";
import type { JournalWritingRange } from "@/src/features/journal/types";
import { cn } from "@/lib/utils";
import { HOME_COLUMN } from "@/src/lib/layout";
import { useSession } from "@/src/providers/session-provider";
import { formatInstantAtOffset } from "@/src/utils/date";

export default function JournalListScreen() {
  const pushWithOrigin = usePushWithOrigin();
  const openAllEntries = () => pushWithOrigin("/tools/journal/entries");
  const { t, i18n } = useTranslation("journal");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: entries } = useJournalEntries(userId, 50);
  // Exact lifetime totals for the hero - the list is capped at 50, so its length and its
  // body word sum would both freeze once a user passes the cap. Both stats are counted
  // server-side; the loaded entries only stand in until those numbers arrive.
  const { data: totalEntries } = useJournalEntryCount(userId);
  const { data: totalWords } = useJournalWordTotal(userId);
  const [writingRange, setWritingRange] = useState<JournalWritingRange>(30);
  const writingQuery = useJournalWritingBuckets(userId, writingRange);
  const writingBuckets = writingQuery.data;
  /**
   * A read that DID NOT HAPPEN - failed, or never started at all - as opposed to
   * one still on its way. The conjunct is #2237's, from the coping-plan screen:
   * queries keep `networkMode: "online"`, so an offline arrival never fires this
   * read, never errors, and sits at `isPending` true / `isPaused` true. Branching
   * on "no data and no error" alone parked that arrival on a spinner forever,
   * with the retry beside it in a branch that never rendered - on a screen whose
   * other content loads from the cache, so the section read as broken.
   *
   * ☠️ Pending AND paused, never `isPaused` alone, and always `&& !writingBuckets`:
   * a refetch that pauses (or fails) over a drawn chart takes nothing away, and
   * the bars stay.
   */
  const writingUnread =
    !writingBuckets && (writingQuery.isError || (writingQuery.isPending && writingQuery.isPaused));

  const [forceOnboarding, setForceOnboarding] = useState(false);

  const allEntries = entries ?? [];

  // Memoize the body word-count (up to ~1 MB of text across 50 entries) and the
  // last-activity scan so they don't recompute on every render - notably every
  // parent render. Pure functions of `entries`.
  const loadedWords = useMemo(
    () => allEntries.reduce((sum, entry) => sum + countWords(entry.body), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries],
  );
  // "Last journaled" reflects genuine activity, so derive it from the most recent
  // server-set updatedAt - entries are ordered by created_at, which users can backdate.
  const lastActivityAt = useMemo(
    () =>
      allEntries.reduce<string | null>(
        (latest, entry) => (latest === null || entry.updatedAt > latest ? entry.updatedAt : latest),
        null,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries],
  );
  // Activity recency, not an entry label: updatedAt is server-set and carries no
  // captured offset, so the viewer's frame is the only frame it has. Entries
  // themselves label from dayKey (journal-card).
  const lastWhen = lastActivityAt ? formatRelativeActivity(lastActivityAt, t) : null;
  const lastTime = lastActivityAt
    ? formatInstantAtOffset(
        lastActivityAt,
        null,
        { hour: "numeric", minute: "2-digit" },
        i18n.language,
      )
    : null;
  // `entries` is undefined while loading and after a failed fetch with no
  // cache - only an actually-loaded (possibly empty) history may claim
  // "never", or a returning user's history reads as erased.
  // Composed from a key rather than glued together with a "·": the subline is a
  // value-less item in the header's "·"-separated stat run now, so a separator
  // inside it would read as a stat boundary (#733).
  const subline = entries
    ? lastWhen && lastTime
      ? t("hero.last", { when: lastWhen, time: lastTime })
      : t("hero.never")
    : undefined;

  const recentSections = useMemo(() => groupRecentJournalEntries(entries), [entries]);
  // The section is earned by lifetime history, never by the selected range. A
  // thin range may empty the chart, but cannot unmount the control needed to
  // leave that range.
  const hasAnyEntry = (totalEntries ?? allEntries.length) > 0;
  const hasWritingInRange = Boolean(writingBuckets?.some((bucket) => bucket.wordCount > 0));

  // Stable across renders so memoized JournalCards aren't invalidated by a parent re-render.
  const openEntry = useCallback(
    (id: string) => pushWithOrigin(`/tools/journal/${id}`),
    [pushWithOrigin],
  );

  return (
    <>
      <JournalOnboarding
        visible={forceOnboarding}
        onComplete={() => setForceOnboarding(false)}
        onDismiss={() => setForceOnboarding(false)}
      />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-4">
          <View className={cn(HOME_COLUMN)}>
            <ModuleHomeHeader
              title={t("title")}
              tourScope="journal"
              description={t("tagline")}
              actions={[
                { type: "notifications", targetKey: "journal" },
                { type: "info", onPress: () => setForceOnboarding(true) },
              ]}
              stats={[
                {
                  value: String(totalEntries ?? allEntries.length),
                  label: t("hero.entryLabel", { count: totalEntries ?? allEntries.length }),
                },
                {
                  value: String(totalWords ?? loadedWords),
                  label: t("hero.wordLabel", { count: totalWords ?? loadedWords }),
                },
                // The old ToolStats.subline, folded into the row as a value-less
                // item - which is how the design renders "last logged 4:50 pm".
                ...(subline ? [{ value: "", label: subline }] : []),
              ]}
            />
            <Button
              onPress={() => pushWithOrigin("/tools/journal/new")}
              className="mt-6 self-start"
            >
              <Icon name="add" className="size-4 text-primary-foreground" />
              <Text>{t("cta.new")}</Text>
            </Button>

            {hasAnyEntry ? (
              <Section
                ruled={false}
                title={t("sections.writing")}
                action={
                  <Text variant="muted" className="text-xs tabular-nums">
                    {formatJournalWritingRange(writingBuckets ?? [], i18n.language)}
                  </Text>
                }
              >
                <View className="flex-row">
                  <SegmentedControl<JournalWritingRange>
                    value={writingRange}
                    onChange={setWritingRange}
                    options={[
                      { value: 7, label: t("writing.range7") },
                      { value: 30, label: t("writing.range30") },
                      { value: 90, label: t("writing.range90") },
                      { value: "all", label: t("writing.rangeAll") },
                    ]}
                  />
                </View>
                {/*
                    ☠️ The unread test comes FIRST, and the spinner answers only for
                    what is left: a read genuinely in flight. The other order is
                    what parked an offline arrival on a spinner it could not leave.

                    ☠️ `&& !writingBuckets`, never bare `isError`: query-core sets
                    the query's error status on ANY failed fetch, held buckets or
                    not (TanStack's own `isRefetchError`). `journalKeys.all` is
                    invalidated on every entry save, so a failed post-save re-read
                    - or an ordinary refetch past the 60s staleTime - replaced a
                    drawn chart with this line about data still in the cache. The
                    error answers for the blank; loaded bars stay drawn.
                  */}
                {writingUnread ? (
                  <View className="items-start gap-2 py-4">
                    <Text variant="muted" className="text-[13px]">
                      {t("writing.error")}
                    </Text>
                    <Button variant="outline" size="sm" onPress={() => void writingQuery.refetch()}>
                      <Text>{t("errors:fallback.retry")}</Text>
                    </Button>
                  </View>
                ) : !writingBuckets ? (
                  // And it holds the chart's space while it says nothing, so the entries
                  // list below does not rise and drop back as the buckets land (ADR-0009
                  // clause 2). The reservation derives its own columns from the selected
                  // range - see `JournalWritingChartReservation`.
                  //
                  // This arm is what the two above leave: a read that did start and has
                  // not finished. A read that never started, or failed, answers with the
                  // error line and its retry, so the space is held for something actually
                  // on its way.
                  <JournalWritingChartReservation range={writingRange} />
                ) : hasWritingInRange ? (
                  <JournalWritingChart buckets={writingBuckets} />
                ) : (
                  <Text variant="muted" className="py-4 text-[13px]">
                    {t("writing.emptyRange")}
                  </Text>
                )}
              </Section>
            ) : null}

            {entries && entries.length === 0 ? (
              <Section ruled={hasAnyEntry}>
                <EmptyState
                  icon="edit-note"
                  title={t("list.empty.title")}
                  description={t("list.empty.description")}
                  action={{
                    label: t("list.empty.cta"),
                    onPress: () => pushWithOrigin("/tools/journal/new"),
                  }}
                />
              </Section>
            ) : recentSections.length > 0 ? (
              <Section
                ruled={hasAnyEntry}
                title={t("sections.entries")}
                action={
                  <Pressable
                    accessibilityRole="link"
                    hitSlop={8}
                    onPress={openAllEntries}
                    className="flex-row items-center gap-1 active:opacity-80"
                    role="link"
                    {...enterKeyActivationProps(openAllEntries)}
                  >
                    <Text className="text-[13px] font-medium text-primary">
                      {t("list.showAll")}
                    </Text>
                    <Icon name="chevron-right" size={16} className="text-primary" />
                  </Pressable>
                }
                className="gap-5"
              >
                {recentSections.map((section) => (
                  <JournalRecentGroup
                    key={section.key}
                    section={section}
                    language={i18n.language}
                    onOpen={openEntry}
                  />
                ))}
              </Section>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function JournalRecentGroup({
  section,
  language,
  onOpen,
}: {
  section: JournalRecentSection;
  language: string;
  onOpen: (id: string) => void;
}) {
  const { t } = useTranslation("journal");
  const title =
    section.kind === "month"
      ? formatJournalMonth(section.monthKey!, language)
      : t(`groups.${section.kind}`);

  return (
    <View>
      <View className="flex-row items-center gap-3 pb-1">
        <Text className="text-xs font-semibold text-muted-foreground">{title}</Text>
        <View className="h-px flex-1 bg-border" />
      </View>
      {section.data.map((entry) => (
        <JournalCard
          key={entry.id}
          entry={entry}
          when={formatJournalRecentWhen(entry, section.kind, language)}
          onOpen={onOpen}
        />
      ))}
    </View>
  );
}
