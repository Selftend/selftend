import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { BackButton } from "@/src/components/app/back-button";
import { cn } from "@/lib/utils";
import { useGratitudeEntries } from "@/src/features/gratitude/queries";
import { useJournalEntries } from "@/src/features/journal/queries";
import { useMeditationSessions } from "@/src/features/meditation/queries";
import { useMindfulnessSessions } from "@/src/features/mindfulness/queries";
import { useMoodLogs } from "@/src/features/mood/queries";
import { getMoodSummary } from "@/src/features/mood/summaries";
import { useSession } from "@/src/providers/session-provider";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

interface ToolTile {
  key: "mood" | "mindfulness" | "timer" | "gratitude" | "journal";
  href: string;
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
    key: "mindfulness",
    href: "/tools/mindfulness",
    icon: "air",
    nameKey: "today.tools.mindfulness",
    subKey: "today.tools.mindfulnessSub",
    iconBg: "bg-be/15",
    iconColor: "text-be",
  },
  {
    key: "timer",
    href: "/tools/timer",
    icon: "timer",
    nameKey: "today.tools.timer",
    subKey: "today.tools.timerSub",
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
];

function lastThirtyDaysMinutes(
  sessions: { durationMinutes: number; createdAt: string }[] | undefined,
) {
  if (!sessions || sessions.length === 0) return 0;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 29);
  return sessions
    .filter((s) => new Date(s.createdAt).getTime() >= start.getTime())
    .reduce((sum, s) => sum + s.durationMinutes, 0);
}

export default function ToolsScreen() {
  const { t } = useTranslation("navigation");
  const { user } = useSession();
  const { data: moodLogs } = useMoodLogs(user?.id ?? null, 30);
  const { data: mindfulnessSessions } = useMindfulnessSessions(user?.id ?? null, 30);
  const { data: meditationSessions } = useMeditationSessions(user?.id ?? null, 30);
  const { data: journalEntries } = useJournalEntries(user?.id ?? null, 50);
  const { data: gratitudeEntries } = useGratitudeEntries(user?.id ?? null, 50);

  const moodCount = moodLogs?.length ?? 0;
  const moodAverage = getMoodSummary(moodLogs, 7).average;
  const mindfulnessMinutes = lastThirtyDaysMinutes(mindfulnessSessions);
  const meditationMinutes = lastThirtyDaysMinutes(meditationSessions);
  const journalCount = journalEntries?.length ?? 0;
  const gratitudeCount = gratitudeEntries?.length ?? 0;

  function statFor(key: ToolTile["key"]): string {
    switch (key) {
      case "mood":
        if (moodCount === 0) return t("tools.stats.moodNoData");
        if (moodAverage === null) return t("tools.stats.moodLogs", { count: moodCount });
        return `${t("tools.stats.moodLogs", { count: moodCount })} · ${t("tools.stats.moodLast7", {
          average: moodAverage,
        })}`;
      case "mindfulness":
        if (mindfulnessMinutes === 0) return t("tools.stats.mindfulnessNoData");
        return t("tools.stats.mindfulnessMinutes", { minutes: mindfulnessMinutes });
      case "timer":
        if (meditationMinutes === 0) return t("tools.stats.timerNoData");
        return t("tools.stats.timerMinutes", { minutes: meditationMinutes });
      case "journal":
        if (journalCount === 0) return t("tools.stats.journalNoData");
        return t("tools.stats.journalEntries", { count: journalCount });
      case "gratitude":
        if (gratitudeCount === 0) return t("tools.stats.gratitudeNoData");
        return t("tools.stats.gratitudeEntries", { count: gratitudeCount });
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <BackButton showLabel={false} className="-ml-2" />
              <Text variant="h1">{t("tools.title")}</Text>
            </View>
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
      onPress={() => router.push(tool.href as Parameters<typeof router.push>[0])}
      className="min-w-[260px] flex-1 basis-[260px] flex-row items-center gap-4 rounded-2xl border border-border bg-card p-4 active:bg-accent/40"
      role="button"
    >
      <View className={cn("size-12 items-center justify-center rounded-xl", tool.iconBg)}>
        <Icon name={tool.icon} className={cn("size-6", tool.iconColor)} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-base font-semibold">{name}</Text>
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
