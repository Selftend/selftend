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
import { useJournalEntryCount } from "@/src/features/journal/queries";
import { useMoodLogs, useMoodLogCount } from "@/src/features/mood/queries";
import { getMoodSummary } from "@/src/features/mood/summaries";
import { useSleepLogCount } from "@/src/features/sleep/queries";
import { useSession } from "@/src/providers/session-provider";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

interface ToolTile {
  key: "mood" | "gratitude" | "journal" | "grounding" | "sleep" | "habits";
  href: Href;
  icon: MaterialIconName;
  nameKey: string;
  subKey: string;
  iconBg: string;
  iconColor: string;
}

const TOOLS: ToolTile[] = [
  {
    key: "mood",
    href: "/tools/mood-tracker",
    icon: "mood",
    nameKey: "today.tools.moodTracker",
    subKey: "today.tools.moodTrackerSub",
    iconBg: "bg-be/15",
    iconColor: "text-be",
  },
  {
    key: "journal",
    href: "/tools/journal",
    icon: "edit-note",
    nameKey: "today.tools.journal",
    subKey: "today.tools.journalSub",
    iconBg: "bg-primary/15",
    iconColor: "text-primary",
  },
  {
    key: "gratitude",
    href: "/tools/gratitude-log",
    icon: "favorite",
    nameKey: "today.tools.gratitudeLog",
    subKey: "today.tools.gratitudeLogSub",
    iconBg: "bg-primary/15",
    iconColor: "text-primary",
  },
  {
    key: "grounding",
    href: "/tools/grounding",
    icon: "anchor",
    nameKey: "today.tools.grounding",
    subKey: "today.tools.groundingSub",
    iconBg: "bg-be/15",
    iconColor: "text-be",
  },
  {
    key: "sleep",
    href: "/tools/sleep",
    icon: "bedtime",
    nameKey: "today.tools.sleep",
    subKey: "today.tools.sleepSub",
    iconBg: "bg-be/15",
    iconColor: "text-be",
  },
  {
    key: "habits",
    href: "/tools/habits",
    icon: "task-alt",
    nameKey: "today.tools.habits",
    subKey: "today.tools.habitsSub",
    iconBg: "bg-primary/15",
    iconColor: "text-primary",
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
      <View className={cn("size-12 items-center justify-center rounded-xl", tool.iconBg)}>
        <Icon name={tool.icon} className={cn("size-6", tool.iconColor)} />
      </View>
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center gap-2">
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
