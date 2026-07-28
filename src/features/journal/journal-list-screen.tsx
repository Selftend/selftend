import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { ContentSheet } from "@/src/components/app/content-sheet";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { ToolStats } from "@/src/components/app/tool-stats";
import { JournalOnboarding } from "@/src/components/app/journal-onboarding-modal";
import { EmptyState } from "@/src/components/app/screen-state";
import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { formatRelativeTime } from "@/src/utils/relative-time";
import { countWords } from "@/src/features/journal/word-count";
import { JournalCard } from "@/src/features/journal/journal-card";
import { JournalDayCard } from "@/src/features/journal/journal-day-card";
import {
  useJournalEntries,
  useJournalEntryCount,
  useJournalWordTotal,
} from "@/src/features/journal/queries";
import { useRoomStyle } from "@/src/lib/use-room-style";
import { useSession } from "@/src/providers/session-provider";
import { useSelectedDate } from "@/src/stores/selected-date-store";

export default function JournalListScreen() {
  const { t } = useTranslation("journal");
  const { t: tc } = useTranslation("common");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const { selectedDate, isToday } = useSelectedDate();

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
  const lastWhen = lastActivityAt ? formatRelativeTime(lastActivityAt, t) : null;
  // `entries` is undefined while loading and after a failed fetch with no
  // cache - only an actually-loaded (possibly empty) history may claim
  // "never", or a returning user's history reads as erased.
  const subline = entries ? `${t("hero.last")} · ${lastWhen ?? tc("never")}` : undefined;

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
          {/* The field + sheet escape the scroll padding so the ink field runs
              edge to edge; the sheet re-adds the inset for its sections. */}
          <View className="-mx-4 -mt-4">
            <ModuleHomeHeader
              variant="field"
              addWidgetCategory="journal"
              hue="ink"
              icon="edit-note"
              moduleLabel={null}
              title={t("title")}
              tourScope="journal"
              description={t("tagline")}
              actions={[
                { type: "notifications", targetKey: "journal" },
                { type: "info", onPress: () => setForceOnboarding(true) },
              ]}
              meta={
                <ToolStats
                  tone="onField"
                  accentClassName="text-accent-ink"
                  subline={subline}
                  sublineTone={lastWhen ? "accent" : "muted"}
                  items={[
                    {
                      value: t("hero.entries", { count: totalEntries ?? allEntries.length }),
                      label: "",
                    },
                    { value: t("hero.words", { count: totalWords ?? loadedWords }), label: "" },
                  ]}
                />
              }
            />
            <ContentSheet className="px-4">
              <View className="gap-6">
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
                    <JournalDayCard
                      entries={allEntries}
                      selectedDate={selectedDate}
                      isToday={isToday}
                    />
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
            </ContentSheet>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
