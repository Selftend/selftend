import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { PlusIcon } from "lucide-react-native";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { BackButton } from "@/src/components/app/back-button";
import { EmptyState } from "@/src/components/app/screen-state";
import { formatMoodRelativeTime } from "@/src/features/mood/relative-time";
import { useJournalEntries } from "@/src/features/journal/queries";
import type { JournalEntry } from "@/src/features/journal/types";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useSession } from "@/src/providers/session-provider";

export default function JournalListScreen() {
  const { t } = useTranslation("journal");
  const { user } = useSession();
  const { data: entries } = useJournalEntries(user?.id ?? null, 50);

  const list = entries ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <BackButton showLabel={false} className="-ml-2" />
              <Text variant="h1">{t("title")}</Text>
            </View>
            <Text variant="muted" className="max-w-[64ch]">
              {t("description")}
            </Text>
          </View>

          <Button
            onPress={() => router.push("/tools/journal/new" as Parameters<typeof router.push>[0])}
            className="self-start"
          >
            <Icon as={PlusIcon} className="size-4 text-primary-foreground" />
            <Text>{t("cta.new")}</Text>
          </Button>

          {list.length === 0 ? (
            <EmptyState
              title={t("list.empty.title")}
              description={t("list.empty.description")}
              action={{
                label: t("list.empty.cta"),
                onPress: () =>
                  router.push("/tools/journal/new" as Parameters<typeof router.push>[0]),
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
      onPress={() => router.push(`/tools/journal/${entry.id}` as Parameters<typeof router.push>[0])}
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
