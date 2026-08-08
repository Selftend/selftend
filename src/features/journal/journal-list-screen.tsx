import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { JournalOnboarding } from "@/src/components/app/journal-onboarding-modal";
import { EmptyState } from "@/src/components/app/screen-state";
import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { formatRelativeActivity } from "@/src/utils/relative-time";
import { countWords } from "@/src/features/journal/word-count";
import { JournalCard } from "@/src/features/journal/journal-card";
import { JournalDayCard } from "@/src/features/journal/journal-day-card";
import {
  useJournalEntries,
  useJournalEntryCount,
  useJournalWordTotal,
} from "@/src/features/journal/queries";
import { cn } from "@/lib/utils";
import { HOME_COLUMN } from "@/src/lib/layout";
import { useRoomStyle } from "@/src/lib/use-room-style";
import { useSession } from "@/src/providers/session-provider";
import { useSelectedDate } from "@/src/stores/selected-date-store";

export default function JournalListScreen() {
  const { t } = useTranslation("journal");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const { selectedDate } = useSelectedDate();

  const { data: entries } = useJournalEntries(userId, 50);
  // Exact lifetime totals for the hero - the list is capped at 50, so its length and its
  // body word sum would both freeze once a user passes the cap. Both stats are counted
  // server-side; the loaded entries only stand in until those numbers arrive.
  const { data: totalEntries } = useJournalEntryCount(userId);
  const { data: totalWords } = useJournalWordTotal(userId);

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
  // `entries` is undefined while loading and after a failed fetch with no
  // cache - only an actually-loaded (possibly empty) history may claim
  // "never", or a returning user's history reads as erased.
  // Composed from a key rather than glued together with a "·": the subline is a
  // value-less item in the header's "·"-separated stat run now, so a separator
  // inside it would read as a stat boundary (#733).
  const subline = entries
    ? lastWhen
      ? t("hero.last", { when: lastWhen })
      : t("hero.never")
    : undefined;

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
          <View className={cn(HOME_COLUMN, "gap-6")}>
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
                  value: t("hero.entries", { count: totalEntries ?? allEntries.length }),
                  label: "",
                },
                { value: t("hero.words", { count: totalWords ?? loadedWords }), label: "" },
                // The old ToolStats.subline, folded into the row as a value-less
                // item - which is how the design renders "last logged 4:50 pm".
                ...(subline ? [{ value: "", label: subline }] : []),
              ]}
            />
            <Button onPress={() => router.push("/tools/journal/new")} className="self-start">
              <Icon name="add" className="size-4 text-primary-foreground" />
              <Text>{t("cta.new")}</Text>
            </Button>

            {allEntries.length === 0 ? (
              <EmptyState
                icon="edit-note"
                title={t("list.empty.title")}
                description={t("list.empty.description")}
                action={{
                  label: t("list.empty.cta"),
                  onPress: () => router.push("/tools/journal/new"),
                }}
              />
            ) : (
              <>
                <JournalDayCard entries={allEntries} selectedDate={selectedDate} />
                <View className="gap-3">
                  <View className="flex-row items-center gap-3">
                    <Text variant="eyebrow">{t("sections.history")}</Text>
                    <View className="h-px flex-1 bg-border" />
                    <Text variant="muted" className="text-xs">
                      {t("hero.entries", { count: allEntries.length })}
                    </Text>
                  </View>
                  {allEntries.map((entry) => (
                    <JournalCard key={entry.id} entry={entry} onOpen={openEntry} />
                  ))}
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
