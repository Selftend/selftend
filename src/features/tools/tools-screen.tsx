import { router, type Href } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { cn } from "@/lib/utils";
import { useGratitudeEntryCount } from "@/src/features/gratitude/queries";
import { useGroundingSessionCount } from "@/src/features/grounding/queries";
import { useHabits } from "@/src/features/habits/queries";
import { toolAccent } from "@/src/features/home/tool-accent";
import { useJournalEntryCount } from "@/src/features/journal/queries";
import { useMoodLogs, useMoodLogCount } from "@/src/features/mood/queries";
import { getMoodSummary } from "@/src/features/mood/summaries";
import { useSleepLogCount } from "@/src/features/sleep/queries";
import { useSession } from "@/src/providers/session-provider";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

interface ToolTile {
  /**
   * Doubles as the tool's id in src/features/home/tool-accent.ts, which is where
   * this hub's hues come from. A key with no entry there falls back to violet
   * and still renders, so tools-screen.test.tsx pins every one of these to a
   * real entry (#421).
   */
  key: "mood" | "gratitude" | "journal" | "grounding" | "sleep" | "habits";
  href: Href;
  icon: MaterialIconName;
  nameKey: string;
  subKey: string;
}

export const TOOLS: ToolTile[] = [
  {
    key: "mood",
    href: "/tools/mood-tracker",
    icon: "mood",
    nameKey: "today.tools.moodTracker",
    subKey: "today.tools.moodTrackerSub",
  },
  {
    key: "journal",
    href: "/tools/journal",
    icon: "edit-note",
    nameKey: "today.tools.journal",
    subKey: "today.tools.journalSub",
  },
  {
    key: "gratitude",
    href: "/tools/gratitude-log",
    icon: "favorite",
    nameKey: "today.tools.gratitudeLog",
    subKey: "today.tools.gratitudeLogSub",
  },
  {
    key: "grounding",
    href: "/tools/grounding",
    icon: "anchor",
    nameKey: "today.tools.grounding",
    subKey: "today.tools.groundingSub",
  },
  {
    key: "sleep",
    href: "/tools/sleep",
    icon: "bedtime",
    nameKey: "today.tools.sleep",
    subKey: "today.tools.sleepSub",
  },
  {
    key: "habits",
    href: "/tools/habits",
    icon: "task-alt",
    nameKey: "today.tools.habits",
    subKey: "today.tools.habitsSub",
  },
];

export default function ToolsScreen() {
  const { t } = useTranslation("navigation");
  const { user } = useSession();
  // The count tiles use exact head-count queries instead of fetching (and decrypting)
  // full row sets just to read `.length`. Mood still fetches 30 rows for the 7-day average.
  const { data: moodLogs } = useMoodLogs(user?.id ?? null, 30);
  const { data: habits } = useHabits(user?.id ?? null);

  const moodCount = useMoodLogCount(user?.id ?? null).data ?? 0;
  const moodAverage = getMoodSummary(moodLogs, 7).average;
  const journalCount = useJournalEntryCount(user?.id ?? null).data ?? 0;
  const gratitudeCount = useGratitudeEntryCount(user?.id ?? null).data ?? 0;
  const groundingCount = useGroundingSessionCount(user?.id ?? null).data ?? 0;
  const sleepCount = useSleepLogCount(user?.id ?? null).data ?? 0;
  const habitCount = habits?.length ?? 0;

  function statFor(key: ToolTile["key"]): string {
    switch (key) {
      case "mood":
        if (moodCount === 0) return t("tools.stats.moodNoData");
        if (moodAverage === null) return t("tools.stats.moodLogs", { count: moodCount });
        return `${t("tools.stats.moodLogs", { count: moodCount })} · ${t("tools.stats.moodLast7", {
          average: moodAverage,
        })}`;
      case "journal":
        if (journalCount === 0) return t("tools.stats.journalNoData");
        return t("tools.stats.journalEntries", { count: journalCount });
      case "gratitude":
        if (gratitudeCount === 0) return t("tools.stats.gratitudeNoData");
        return t("tools.stats.gratitudeEntries", { count: gratitudeCount });
      case "grounding":
        if (groundingCount === 0) return t("tools.stats.groundingNoData");
        return t("tools.stats.groundingSessions", { count: groundingCount });
      case "sleep":
        if (sleepCount === 0) return t("tools.stats.sleepNoData");
        return t("tools.stats.sleepLogs", { count: sleepCount });
      case "habits":
        if (habitCount === 0) return t("tools.stats.habitsNoData");
        return t("tools.stats.habits", { count: habitCount });
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={t("tools.title")} />
            <Text variant="muted" className="max-w-[64ch]">
              {t("tools.description")}
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-3">
            {TOOLS.map((tool) => (
              <ToolCard key={tool.key} tool={tool} stat={statFor(tool.key)} />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface ToolCardProps {
  tool: ToolTile;
  stat: string;
}

function ToolCard({ tool, stat }: ToolCardProps) {
  const { t } = useTranslation("navigation");
  const name = t(tool.nameKey);
  const subtitle = t(tool.subKey);
  const accent = toolAccent(tool.key);
  return (
    <Pressable
      accessibilityHint={subtitle}
      accessibilityLabel={name}
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={() => router.push(tool.href)}
      className="min-w-[260px] flex-1 basis-[260px] flex-row items-center gap-4 rounded-2xl border border-border bg-card p-4 active:bg-accent/40"
      role="button"
    >
      {/*
        The accent, not the ink (#421): this glyph is static branding beside the
        tool's own name, and it lands on the same `bg-<hue>/10` over `bg-card`
        stack the sidebar paints — ink 4.62, be 4.55, act 3.52, clay 3.39 in
        light, all clear of 1.4.11's 3:1, and higher in dark. `gratitude` already
        carries `think-ink` in the map's `icon` field because raw `think` reads
        1.90 here; darkening the rest to ink would buy no contrast and read as
        disabled.
      */}
      <View className={cn("size-12 items-center justify-center rounded-xl", accent.chip)}>
        <Icon name={tool.icon} className={cn("size-6", accent.icon)} />
      </View>
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center gap-2">
          {/*
            The tile name stays on the neutral foreground rather than taking
            `accent.ink`. The sidebar inks its label only while a row is active,
            where the tint carries state; a hub tile has no active state, so
            hueing every name here would be decoration bought at the price of
            six different text colours on one screen.
          */}
          <Text className="text-base font-semibold">{name}</Text>
        </View>
        <Text variant="muted" className="text-xs">
          {subtitle}
        </Text>
        <View className="mt-1 flex-row items-center gap-1.5">
          <Text variant="muted" className="text-xs">
            {stat}
          </Text>
        </View>
      </View>
      <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
    </Pressable>
  );
}
