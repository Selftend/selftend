import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { Section } from "@/src/components/app/section";
import { JournalOnboarding } from "@/src/components/app/journal-onboarding-modal";
import { EmptyState } from "@/src/components/app/screen-state";
import { BarChart } from "@/src/components/charts/bar-chart";
import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { formatRelativeActivity } from "@/src/utils/relative-time";
import { countWords } from "@/src/features/journal/word-count";
import { JournalCard } from "@/src/features/journal/journal-card";
import {
  formatJournalMonth,
  formatJournalRecentWhen,
  formatJournalWritingRange,
  groupRecentJournalEntries,
  JOURNAL_WRITING_DAYS,
  type JournalRecentSection,
} from "@/src/features/journal/journal-overview";
import {
  useJournalEntries,
  useJournalEntryCount,
  useJournalWritingDays,
  useJournalWordTotal,
} from "@/src/features/journal/queries";
import { cn } from "@/lib/utils";
import { HOME_COLUMN } from "@/src/lib/layout";
import { useRoomStyle } from "@/src/lib/use-room-style";
import { useSession } from "@/src/providers/session-provider";
import { formatInstantAtOffset, parseLocalNoon } from "@/src/utils/date";

export default function JournalListScreen() {
  const { t, i18n } = useTranslation("journal");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: entries } = useJournalEntries(userId, 50);
  // Exact lifetime totals for the hero - the list is capped at 50, so its length and its
  // body word sum would both freeze once a user passes the cap. Both stats are counted
  // server-side; the loaded entries only stand in until those numbers arrive.
  const { data: totalEntries } = useJournalEntryCount(userId);
  const { data: totalWords } = useJournalWordTotal(userId);
  const { data: writingDays } = useJournalWritingDays(userId, JOURNAL_WRITING_DAYS);

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
  const hasWritingChart = Boolean(writingDays?.some((day) => day.wordCount > 0));

  // Stable across renders so memoized JournalCards aren't invalidated by a parent re-render.
  const openEntry = useCallback((id: string) => router.push(`/tools/journal/${id}`), []);

  const roomStyle = useRoomStyle("ink");

  return (
    <>
      <JournalOnboarding
        visible={forceOnboarding}
        onComplete={() => setForceOnboarding(false)}
        onDismiss={() => setForceOnboarding(false)}
      />
      <SafeAreaView
        className="flex-1 bg-background"
        edges={["bottom", "left", "right"]}
        style={roomStyle}
      >
        <ScrollView contentContainerClassName="grow p-4">
          <View className={cn(HOME_COLUMN)}>
            <ModuleHomeHeader
              addWidgetCategory="journal"
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
            <Button onPress={() => router.push("/tools/journal/new")} className="mt-6 self-start">
              <Icon name="add" className="size-4 text-primary-foreground" />
              <Text>{t("cta.new")}</Text>
            </Button>

            {hasWritingChart && writingDays ? (
              <Section
                ruled={false}
                title={t("sections.writing")}
                action={
                  <Text variant="muted" className="text-xs tabular-nums">
                    {formatJournalWritingRange(writingDays, i18n.language)}
                  </Text>
                }
              >
                <BarChart
                  bars={writingDays.map((day) => ({
                    key: day.dayKey,
                    value: day.wordCount,
                    label: new Intl.DateTimeFormat(i18n.language, { day: "numeric" }).format(
                      parseLocalNoon(day.dayKey),
                    ),
                    accessibilityLabel: t("writing.barLabel", {
                      date: new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(
                        parseLocalNoon(day.dayKey),
                      ),
                      count: day.wordCount,
                    }),
                  }))}
                  barAreaHeight={72}
                  minBarHeight={8}
                  zeroHeight={2}
                  tintClass="bg-primary"
                  barClassName="rounded-sm"
                  columnClassName="gap-1.5"
                  labelClassName="tabular-nums"
                  className="gap-1"
                />
                <Text variant="muted" className="text-xs">
                  {t("writing.caption")}
                </Text>
              </Section>
            ) : null}

            {entries && entries.length === 0 ? (
              <Section ruled={hasWritingChart}>
                <EmptyState
                  icon="edit-note"
                  title={t("list.empty.title")}
                  description={t("list.empty.description")}
                  action={{
                    label: t("list.empty.cta"),
                    onPress: () => router.push("/tools/journal/new"),
                  }}
                />
              </Section>
            ) : recentSections.length > 0 ? (
              <Section
                ruled={hasWritingChart}
                title={t("sections.entries")}
                action={
                  <Pressable
                    accessibilityRole="link"
                    hitSlop={8}
                    onPress={() => router.push("/tools/journal/entries")}
                    className="flex-row items-center gap-1 active:opacity-80"
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
