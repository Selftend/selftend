import { type Href } from "expo-router";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { cn } from "@/lib/utils";
import { useBreathingSessionCount } from "@/src/features/breathing/queries";
import { useGratitudeEntryCount } from "@/src/features/gratitude/queries";
import { useGroundingSessionCount } from "@/src/features/grounding/queries";
import { useHabits } from "@/src/features/habits/queries";
import { useJournalEntryCount } from "@/src/features/journal/queries";
import { useMeditationSessionCount } from "@/src/features/meditation/queries";
import { useMoodLogs, useMoodLogCount } from "@/src/features/mood/queries";
import { getMoodSummary } from "@/src/features/mood/summaries";
import { useSleepLogCount } from "@/src/features/sleep/queries";
import { useSession } from "@/src/providers/session-provider";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { CHROME_MARK, CHROME_WASH } from "@/src/lib/theme/chrome";

interface ToolTile {
  /**
   * Also the tool's id elsewhere in the app. It used to double as the lookup
   * key into src/features/home/tool-accent.ts, which is where this hub's eight
   * hues came from; that file is gone (#587) and a tool has no colour to look
   * up, so the key now identifies the tool and nothing more.
   */
  key:
    | "mood"
    | "gratitude"
    | "journal"
    | "breathing"
    | "grounding"
    | "meditation"
    | "sleep"
    | "habits";
  href: Href;
  icon: MaterialIconName;
  nameKey: string;
  subKey: string;
}

export const TOOLS: ToolTile[] = [
  {
    key: "mood",
    href: "/tools/check-in",
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
    key: "breathing",
    href: "/tools/breathing",
    icon: "air",
    nameKey: "today.tools.breathing",
    subKey: "today.tools.breathingSub",
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
    key: "meditation",
    href: "/tools/meditation",
    icon: "self-improvement",
    nameKey: "today.tools.meditation",
    subKey: "today.tools.meditationSub",
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
  const breathingCount = useBreathingSessionCount(user?.id ?? null).data ?? 0;
  const gratitudeCount = useGratitudeEntryCount(user?.id ?? null).data ?? 0;
  const groundingCount = useGroundingSessionCount(user?.id ?? null).data ?? 0;
  const meditationCount = useMeditationSessionCount(user?.id ?? null).data ?? 0;
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
      case "breathing":
        if (breathingCount === 0) return t("tools.stats.breathingNoData");
        return t("tools.stats.breathingSessions", { count: breathingCount });
      case "gratitude":
        if (gratitudeCount === 0) return t("tools.stats.gratitudeNoData");
        return t("tools.stats.gratitudeEntries", { count: gratitudeCount });
      case "grounding":
        if (groundingCount === 0) return t("tools.stats.groundingNoData");
        return t("tools.stats.groundingSessions", { count: groundingCount });
      case "meditation":
        if (meditationCount === 0) return t("tools.stats.meditationNoData");
        return t("tools.stats.meditationSessions", { count: meditationCount });
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
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation("navigation");
  const name = t(tool.nameKey);
  const subtitle = t(tool.subKey);
  return (
    <Pressable
      accessibilityHint={subtitle}
      accessibilityLabel={name}
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={() => pushWithOrigin(tool.href)}
      className="min-w-[260px] flex-1 basis-[260px] flex-row items-center gap-4 rounded-2xl border border-border bg-card p-4 active:bg-accent/40"
      role="button"
    >
      {/*
        Eight tiles, one wash (#587). This hub and /modules were the two screens
        #558's prototype found BYTE-IDENTICAL after the rooms were switched off,
        because their colour was never poured — it was a per-tool `bg-<hue>/10`
        chip with that hue's glyph inside, read straight out of tool-accent.ts.
        It is the exact case the ruling names: eight tools in eight colours,
        where the icon and the name already tell them apart.

        The glyph takes the muted mark rather than the foreground because it sits
        beside the tool's name; a full-strength glyph next to full-strength text
        reads as two competing emphases. Contrast stops being a question here —
        the old figures ran from `think` at 1.90 to `ink` at 4.62 and the map had
        to carry per-hue exceptions to stay above 1.4.11's 3:1. One neutral pair,
        already held to the app's floors, has no exceptions to carry.
      */}
      <View className={cn("size-12 items-center justify-center rounded-xl", CHROME_WASH)}>
        <Icon name={tool.icon} className={cn("size-6", CHROME_MARK)} />
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
