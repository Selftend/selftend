import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { ToolStats } from "@/src/components/app/tool-stats";
import { JournalOnboarding } from "@/src/components/app/journal-onboarding-modal";
import { EmptyState } from "@/src/components/app/screen-state";
import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { formatMoodRelativeTime } from "@/src/features/mood/relative-time";
import { countWords } from "@/src/features/journal/word-count";
import { JournalCard } from "@/src/features/journal/journal-card";
import { JournalDayCard } from "@/src/features/journal/journal-day-card";
import { useJournalEntries, useJournalEntryCount } from "@/src/features/journal/queries";
import { useSession } from "@/src/providers/session-provider";
import { useSelectedDate } from "@/src/stores/selected-date-store";

export default function JournalListScreen() {
  const { t } = useTranslation("journal");
  const { t: tc } = useTranslation("common");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const { selectedDate, isToday } = useSelectedDate();

  const { data: entries } = useJournalEntries(userId, 50);
  // Exact lifetime total for the hero - the list is capped at 50, so its length would
  // freeze the displayed entry count. (Word count stays a recent-entries figure.)
  const { data: totalEntries } = useJournalEntryCount(userId);

  const [forceOnboarding, setForceOnboarding] = useState(false);

  const allEntries = entries ?? [];

  // Memoize the body word-count (up to ~1 MB of text across 50 entries) and the
  // last-activity scan so they don't recompute on every render - notably every
  // DateBar tap. Pure functions of `entries`.
  const totalWords = useMemo(
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
  const lastWhen = lastActivityAt ? formatMoodRelativeTime(lastActivityAt, t) : null;

  // Stable across renders so memoized JournalCards aren't invalidated by a parent re-render.
  const openEntry = useCallback((id: string) => router.push(`/tools/journal/${id}`), []);

  return (
    <>
      <JournalOnboarding
        visible={forceOnboarding}
        onComplete={() => setForceOnboarding(false)}
        onDismiss={() => setForceOnboarding(false)}
      />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow gap-6 p-4">
          <ModuleHomeHeader
            addWidgetCategory="journal"
            hue="ink"
            icon="edit-note"
            moduleLabel={null}
            title={t("title")}
            description={t("tagline")}
            actions={[
              { type: "notifications", targetKey: "journal" },
              { type: "info", onPress: () => setForceOnboarding(true) },
            ]}
            meta={
              <ToolStats
                accentClassName="text-ink"
                subline={`${t("hero.last")} · ${lastWhen ?? tc("never")}`}
                items={[
                  {
                    value: t("hero.entries", { count: totalEntries ?? allEntries.length }),
                    label: "",
                  },
                  { value: t("hero.words", { count: totalWords }), label: "" },
                ]}
              />
            }
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
              <JournalDayCard entries={allEntries} selectedDate={selectedDate} isToday={isToday} />
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
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
