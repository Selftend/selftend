import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { JournalOnboarding } from "@/src/components/app/journal-onboarding-modal";
import { EmptyState } from "@/src/components/app/screen-state";
import { formatMoodRelativeTime } from "@/src/features/mood/relative-time";
import { countWords } from "@/src/features/journal/word-count";
import { useJournalEntries } from "@/src/features/journal/queries";
import type { JournalEntry } from "@/src/features/journal/types";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useSession } from "@/src/providers/session-provider";
import { toLocalDateKey, useSelectedDate } from "@/src/stores/selected-date-store";

export default function JournalListScreen() {
  const { t } = useTranslation("journal");
  const { t: tc } = useTranslation("common");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: entries } = useJournalEntries(userId, 50);
  const { selectedDate } = useSelectedDate();

  const [forceOnboarding, setForceOnboarding] = useState(false);

  const list = (entries ?? []).filter((entry) => toLocalDateKey(entry.createdAt) === selectedDate);

  const allEntries = entries ?? [];
  const lastEntry = allEntries[0] ?? null;
  const lastWhen = lastEntry ? formatMoodRelativeTime(lastEntry.createdAt, t) : null;
  const totalWords = allEntries.reduce((sum, entry) => sum + countWords(entry.body), 0);

  return (
    <>
      <JournalOnboarding
        visible={forceOnboarding}
        onComplete={() => setForceOnboarding(false)}
        onDismiss={() => setForceOnboarding(false)}
      />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <ModuleHomeHeader
              title={t("title")}
              hue="ink"
              icon="edit-note"
              description={t("description")}
              actions={[
                { type: "notifications", targetKey: "journal" },
                { type: "info", onPress: () => setForceOnboarding(true) },
              ]}
              meta={
                <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1">
                  <Text variant="muted" className="text-xs">
                    <Text className="text-xs font-bold text-ink">
                      {t("hero.entries", { count: allEntries.length })}
                    </Text>
                  </Text>
                  <Text variant="muted" className="text-xs">
                    <Text className="text-xs font-bold text-ink">
                      {t("hero.words", { count: totalWords })}
                    </Text>
                  </Text>
                  <Text variant="muted" className="text-xs">
                    {t("hero.last")} ·{" "}
                    {lastWhen ? (
                      <Text className="text-xs font-bold text-ink">{lastWhen}</Text>
                    ) : (
                      <Text className="text-xs font-bold text-ink/60">{tc("never")}</Text>
                    )}
                  </Text>
                </View>
              }
            />

            <Button onPress={() => router.push("/tools/journal/new")} className="self-start">
              <Icon name="add" className="size-4 text-primary-foreground" />
              <Text>{t("cta.new")}</Text>
            </Button>

            {list.length === 0 ? (
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
              <View className="gap-3">
                <Text variant="h3">{t("list.recent")}</Text>
                <View className="gap-3">
                  {list.map((entry) => (
                    <JournalEntryRow key={entry.id} entry={entry} />
                  ))}
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function firstLine(body: string) {
  const trimmed = body.trim();
  const idx = trimmed.indexOf("\n");
  return idx === -1 ? trimmed : trimmed.slice(0, idx);
}

interface JournalEntryRowProps {
  entry: JournalEntry;
}

function JournalEntryRow({ entry }: JournalEntryRowProps) {
  const { t } = useTranslation("journal");
  const when = formatMoodRelativeTime(entry.createdAt, t);
  const title = entry.title.trim().length > 0 ? entry.title.trim() : t("list.untitled");
  const preview = firstLine(entry.body);

  return (
    <Pressable
      accessibilityLabel={t("list.viewEntry", { when })}
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={() => router.push(`/tools/journal/${entry.id}`)}
      className="gap-2 rounded-2xl border border-border bg-card p-4 active:bg-accent/40"
      role="button"
    >
      <View className="flex-row items-center justify-between gap-3">
        <Text className="flex-1 text-base font-semibold" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="muted" className="text-xs">
          {when}
        </Text>
      </View>
      <Text variant="muted" numberOfLines={2} className="text-sm">
        {preview}
      </Text>
    </Pressable>
  );
}
