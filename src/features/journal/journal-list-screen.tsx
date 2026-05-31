import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { ToolStats } from "@/src/components/app/tool-stats";
import { JournalOnboarding } from "@/src/components/app/journal-onboarding-modal";
import { EmptyState } from "@/src/components/app/screen-state";
import { Button } from "@/src/components/react-native-reusables/button";
import { Card } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { formatMoodRelativeTime } from "@/src/features/mood/relative-time";
import { countWords } from "@/src/features/journal/word-count";
import { useJournalEntries } from "@/src/features/journal/queries";
import type { JournalEntry } from "@/src/features/journal/types";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useSession } from "@/src/providers/session-provider";

type SectionKey = "today" | "earlier" | "older";

function groupByPeriod(entries: JournalEntry[]): { key: SectionKey; entries: JournalEntry[] }[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  // Calendar math (not fixed 86.4M-ms days) so the 7-day boundary doesn't drift across DST.
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).getTime();
  const today: JournalEntry[] = [];
  const earlier: JournalEntry[] = [];
  const older: JournalEntry[] = [];
  for (const entry of entries) {
    const ts = new Date(entry.createdAt).getTime();
    if (ts >= startOfToday) today.push(entry);
    else if (ts >= startOfWeek) earlier.push(entry);
    else older.push(entry);
  }
  return [
    { key: "today" as const, entries: today },
    { key: "earlier" as const, entries: earlier },
    { key: "older" as const, entries: older },
  ].filter((s) => s.entries.length > 0);
}

export default function JournalListScreen() {
  const { t } = useTranslation("journal");
  const { t: tc } = useTranslation("common");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: entries } = useJournalEntries(userId, 50);

  const [forceOnboarding, setForceOnboarding] = useState(false);

  const allEntries = entries ?? [];
  const sections = groupByPeriod(allEntries);

  const totalWords = allEntries.reduce((sum, entry) => sum + countWords(entry.body), 0);
  const lastEntry = allEntries[0] ?? null;
  const lastWhen = lastEntry ? formatMoodRelativeTime(lastEntry.createdAt, t) : null;

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
                credit={t("authorEyebrow")}
                subline={`${t("hero.last")} · ${lastWhen ?? tc("never")}`}
                items={[
                  { value: t("hero.entries", { count: allEntries.length }), label: "" },
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
            sections.map((section) => (
              <View key={section.key} className="gap-3">
                <View className="flex-row items-center gap-3">
                  <Text variant="eyebrow" tint={section.key === "today" ? "ink" : undefined}>
                    {t(`sections.${section.key}`)}
                  </Text>
                  <View className="h-px flex-1 bg-border" />
                  <Text variant="muted" className="text-xs">
                    {t("hero.entries", { count: section.entries.length })}
                  </Text>
                </View>
                {section.entries.map((entry) => (
                  <JournalCard
                    key={entry.id}
                    entry={entry}
                    onPress={() => router.push(`/tools/journal/${entry.id}`)}
                  />
                ))}
              </View>
            ))
          )}
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

interface JournalCardProps {
  entry: JournalEntry;
  onPress: () => void;
}

function JournalCard({ entry, onPress }: JournalCardProps) {
  const { t } = useTranslation("journal");
  const when = formatMoodRelativeTime(entry.createdAt, t);
  const title = entry.title.trim().length > 0 ? entry.title.trim() : t("list.untitled");
  const preview = firstLine(entry.body);
  const words = countWords(entry.body);

  return (
    <Pressable
      accessibilityLabel={t("list.viewEntry", { when })}
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onPress}
    >
      <Card spine="ink" className="px-5 py-4 gap-0">
        <View className="flex-row items-baseline justify-between gap-3">
          <Text className="flex-1 text-base font-semibold tracking-tight" numberOfLines={1}>
            {title}
          </Text>
          <Text variant="muted" className="text-xs">
            {when}
          </Text>
        </View>
        {preview.length > 0 ? (
          <Text variant="muted" numberOfLines={2} className="mt-1.5 text-[13px] leading-relaxed">
            {preview}
          </Text>
        ) : null}
        <Text variant="muted" className="mt-2.5 text-[11px] tabular-nums">
          {t("hero.words", { count: words })}
        </Text>
      </Card>
    </Pressable>
  );
}
