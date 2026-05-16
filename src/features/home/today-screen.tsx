import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { useActivities } from "@/src/features/activities/queries";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { useGratitudeEntries } from "@/src/features/gratitude/queries";
import { useJournalEntries } from "@/src/features/journal/queries";
import { useMeditationSessions } from "@/src/features/meditation/queries";
import { useMindfulnessSessions } from "@/src/features/mindfulness/queries";
import { useMoodLogs } from "@/src/features/mood/queries";
import { usePlanItems } from "@/src/features/plan/queries";
import type { CarePlanItem } from "@/src/features/plan/types";
import { useSelfCareLog } from "@/src/features/self-care/queries";
import { useSession } from "@/src/providers/session-provider";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

type ModulePillar = "cbt" | "act" | "dbt";

interface ModuleTile {
  key: ModulePillar;
  href: string;
  abbreviation: string;
  nameKey: string;
  descriptionKey: string;
  badgeKey: "live" | "soon";
  footerKey: "inDesign" | "onRoadmap" | null;
  containerClass: string;
  markClass: string;
  badgeClass: string;
}

const MODULES: ModuleTile[] = [
  {
    key: "cbt",
    href: "/modules/cbt",
    abbreviation: "CBT",
    nameKey: "today.modules.cbtName",
    descriptionKey: "today.modules.cbtDescription",
    badgeKey: "live",
    footerKey: null,
    containerClass: "border-primary/30",
    markClass: "bg-primary/15 border-primary/30 text-primary",
    badgeClass: "bg-act/15 text-act",
  },
  {
    key: "act",
    href: "/modules/act",
    abbreviation: "ACT",
    nameKey: "today.modules.actName",
    descriptionKey: "today.modules.actDescription",
    badgeKey: "soon",
    footerKey: "inDesign",
    containerClass: "border-act/30",
    markClass: "bg-act/15 border-act/30 text-act",
    badgeClass: "bg-muted text-muted-foreground",
  },
  {
    key: "dbt",
    href: "/modules/dbt",
    abbreviation: "DBT",
    nameKey: "today.modules.dbtName",
    descriptionKey: "today.modules.dbtDescription",
    badgeKey: "soon",
    footerKey: "onRoadmap",
    containerClass: "border-be/30",
    markClass: "bg-be/15 border-be/30 text-be",
    badgeClass: "bg-muted text-muted-foreground",
  },
];

interface SharedTool {
  key: string;
  href: string;
  icon: MaterialIconName;
  nameKey: string;
  subKey: string;
  iconBg: string;
  iconColor: string;
}

const SHARED_TOOLS: SharedTool[] = [
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
    key: "progress",
    href: "/progress",
    icon: "timeline",
    nameKey: "today.tools.progress",
    subKey: "today.tools.progressSub",
    iconBg: "bg-be/15",
    iconColor: "text-be",
  },
];

function getDateKey(value: string | null | undefined) {
  return value?.slice(0, 10) ?? "";
}

function getMoodSummary(
  moodLogs: { loggedAt: string; moodScore: number }[] | undefined,
  days: number,
) {
  if (!moodLogs || moodLogs.length === 0) {
    return { average: null as number | null, count: 0 };
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const scores = moodLogs
    .filter((log) => new Date(log.loggedAt).getTime() >= start.getTime())
    .map((log) => log.moodScore);

  if (scores.length === 0) {
    return { average: null as number | null, count: 0 };
  }

  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return { average: Math.round(average * 10) / 10, count: scores.length };
}

function pickGreetingKey(hour: number) {
  if (hour < 12) return "today.greetingMorning";
  if (hour < 18) return "today.greetingAfternoon";
  return "today.greetingEvening";
}

function getDisplayName(user: { user_metadata?: Record<string, unknown> } | null) {
  if (!user) return null;
  const metadata = user.user_metadata ?? {};
  const fullName = typeof metadata.full_name === "string" ? metadata.full_name : null;
  if (fullName && fullName.trim().length > 0) {
    return fullName.trim().split(/\s+/)[0];
  }
  const name = typeof metadata.name === "string" ? metadata.name : null;
  if (name && name.trim().length > 0) {
    return name.trim().split(/\s+/)[0];
  }
  return null;
}

export default function TodayScreen() {
  const { t, i18n } = useTranslation("navigation");
  const { user } = useSession();

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const hour = today.getHours();
  const dateLabel = new Intl.DateTimeFormat(i18n.language, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(today);

  const greeting = t(pickGreetingKey(hour));
  const displayName = getDisplayName(user);
  const greetingLine = displayName
    ? t("today.greetingWithName", { greeting, name: displayName })
    : t("today.greetingPlain", { greeting });

  const { data: moodLogs } = useMoodLogs(user?.id ?? null, 30);
  const { data: activities } = useActivities(user?.id ?? null);
  const { data: thoughtRecords } = useThoughtRecords(user?.id ?? null);
  const { data: todaySelfCareLog } = useSelfCareLog(user?.id ?? null, todayKey);
  const { data: carePlanItems } = usePlanItems(user?.id ?? null);
  const { data: meditationSessions } = useMeditationSessions(user?.id ?? null);
  const { data: mindfulnessSessions } = useMindfulnessSessions(user?.id ?? null);
  const { data: journalEntries } = useJournalEntries(user?.id ?? null);
  const { data: gratitudeEntries } = useGratitudeEntries(user?.id ?? null);

  const sevenDayMood = getMoodSummary(moodLogs, 7);
  const thirtyDayMood = getMoodSummary(moodLogs, 30);
  const todaysMoodLogs = moodLogs?.filter((log) => getDateKey(log.loggedAt) === todayKey) ?? [];
  const moodToday =
    todaysMoodLogs.length > 0
      ? {
          score: todaysMoodLogs[todaysMoodLogs.length - 1].moodScore,
          count: todaysMoodLogs.length,
        }
      : null;

  const scheduledToday =
    activities
      ?.filter((activity) => !activity.completedAt && getDateKey(activity.scheduledAt) === todayKey)
      .slice(0, 2) ?? [];
  const incompleteThoughtRecord =
    thoughtRecords?.find((record) => !record.balancedThought?.trim()) ?? null;

  const todayRows: TodayPlanRow[] = [
    ...scheduledToday.map((activity) => ({
      key: `activity-${activity.id}`,
      icon: "directions-run" as MaterialIconName,
      title: activity.activityName,
      labelKey: "today.plan.activityLabel",
      actionKey: "today.plan.open",
      onPress: () =>
        router.push(`/modules/cbt/activities/${activity.id}` as Parameters<typeof router.push>[0]),
      pillar: "act" as const,
    })),
    ...(incompleteThoughtRecord
      ? [
          {
            key: `thought-${incompleteThoughtRecord.id}`,
            icon: "article" as MaterialIconName,
            title: incompleteThoughtRecord.automaticThought,
            labelKey: "today.plan.thoughtRecordLabel",
            actionKey: "today.plan.resume",
            onPress: () =>
              router.push(
                `/modules/cbt/history/${incompleteThoughtRecord.id}` as Parameters<
                  typeof router.push
                >[0],
              ),
            pillar: "think" as const,
          },
        ]
      : []),
    ...(todaySelfCareLog
      ? []
      : [
          {
            key: "self-care",
            icon: "favorite" as MaterialIconName,
            title: t("today.plan.evening"),
            labelKey: "today.plan.selfCareLabel",
            actionKey: "today.plan.open",
            onPress: () =>
              router.push("/modules/cbt/self-care" as Parameters<typeof router.push>[0]),
            pillar: "be" as const,
            subtitle: t("today.plan.eveningSub"),
          },
        ]),
  ];

  return (
    <>
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            {/* Header */}
            <View className="gap-2">
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("today.eyebrow", { date: dateLabel })}
              </Text>
              <Text variant="h1">{greetingLine}</Text>
              <Text variant="muted" className="max-w-[60ch]">
                {t("today.subtitle")}
              </Text>
            </View>

            {/* Quick actions */}
            <View className="flex-row flex-wrap gap-2">
              <View className="min-w-[150px] flex-1 basis-[150px]">
                <QuickActionButton
                  icon="mood"
                  label={t("today.quickActions.logMood")}
                  onPress={() =>
                    router.push("/tools/mood-tracker/new" as Parameters<typeof router.push>[0])
                  }
                />
              </View>
              <View className="min-w-[150px] flex-1 basis-[150px]">
                <QuickActionButton
                  icon="article"
                  label={t("today.quickActions.thoughtRecord")}
                  onPress={() =>
                    router.push("/modules/cbt/new" as Parameters<typeof router.push>[0])
                  }
                />
              </View>
              <View className="min-w-[150px] flex-1 basis-[150px]">
                <QuickActionButton
                  icon="self-improvement"
                  label={t("today.quickActions.meditate")}
                  onPress={() =>
                    router.push("/tools/meditation" as Parameters<typeof router.push>[0])
                  }
                />
              </View>
              <View className="min-w-[150px] flex-1 basis-[150px]">
                <QuickActionButton
                  icon="favorite"
                  label={t("today.quickActions.selfCare")}
                  onPress={() =>
                    router.push("/modules/cbt/self-care" as Parameters<typeof router.push>[0])
                  }
                />
              </View>
              <View className="min-w-[150px] flex-1 basis-[150px]">
                <QuickActionButton
                  icon="edit-note"
                  label={t("today.quickActions.journal")}
                  onPress={() =>
                    router.push("/tools/journal/new" as Parameters<typeof router.push>[0])
                  }
                />
              </View>
            </View>

            {/* Mood snapshot */}
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text variant="h3">{t("today.moodSnapshot.title")}</Text>
                <Button
                  onPress={() =>
                    router.push("/tools/mood-tracker/new" as Parameters<typeof router.push>[0])
                  }
                  size="sm"
                  variant="ghost"
                >
                  <Text>{t("today.moodSnapshot.logMood")}</Text>
                  <Icon name="add" className="size-3.5" />
                </Button>
              </View>
              <View className="flex-row flex-wrap gap-3">
                <StatTile
                  label={t("today.moodSnapshot.sevenDay")}
                  value={sevenDayMood.average === null ? "—" : sevenDayMood.average.toFixed(1)}
                  meta={t("today.moodSnapshot.logsCount", { count: sevenDayMood.count })}
                />
                <StatTile
                  label={t("today.moodSnapshot.thirtyDay")}
                  value={thirtyDayMood.average === null ? "—" : thirtyDayMood.average.toFixed(1)}
                  meta={t("today.moodSnapshot.logsCount", { count: thirtyDayMood.count })}
                />
                <StatTile
                  label={t("today.moodSnapshot.today")}
                  value={moodToday ? String(moodToday.score) : "—"}
                  meta={
                    moodToday
                      ? t("today.moodSnapshot.logsCount", { count: moodToday.count })
                      : t("today.moodSnapshot.notLogged")
                  }
                  muted={!moodToday}
                />
              </View>
            </View>

            {/* Care plan checklist */}
            <CarePlanSection
              carePlanItems={carePlanItems ?? null}
              todayKey={todayKey}
              moodLogs={moodLogs}
              thoughtRecords={thoughtRecords}
              meditationSessions={meditationSessions}
              mindfulnessSessions={mindfulnessSessions}
              journalEntries={journalEntries}
              gratitudeEntries={gratitudeEntries}
              activities={activities}
              todaySelfCareLog={todaySelfCareLog}
            />

            {/* Legacy activity / thought record reminders */}
            {todayRows.length > 0 ? (
              <View className="gap-3">
                <Text variant="h3">{t("today.plan.title")}</Text>
                <Card>
                  <CardContent className="gap-3 pt-6">
                    {todayRows.map((item, index) => (
                      <View key={item.key} className="gap-3">
                        {index > 0 ? <View className="h-px bg-border" /> : null}
                        <PlanRow item={item} />
                      </View>
                    ))}
                  </CardContent>
                </Card>
              </View>
            ) : null}

            {/* Modules row */}
            <View className="gap-3">
              <Text variant="h3">{t("today.modules.title")}</Text>
              <Text variant="muted" className="max-w-[64ch]">
                {t("today.modules.subtitle")}
              </Text>
              <View className="mt-2 flex-row flex-wrap gap-3">
                {MODULES.map((module) => (
                  <ModuleCard key={module.key} module={module} />
                ))}
              </View>
            </View>

            {/* Shared tools */}
            <View className="gap-3">
              <Text variant="h3">{t("today.tools.title")}</Text>
              <Text variant="muted" className="max-w-[64ch]">
                {t("today.tools.subtitle")}
              </Text>
              <View className="mt-2 flex-row flex-wrap gap-2">
                {SHARED_TOOLS.map((tool) => (
                  <SharedToolCard key={tool.key} tool={tool} />
                ))}
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

interface QuickActionButtonProps {
  icon: MaterialIconName;
  label: string;
  onPress: () => void;
}

function QuickActionButton({ icon, label, onPress }: QuickActionButtonProps) {
  return (
    <Button
      accessibilityLabel={label}
      className="h-12 w-full gap-2 px-3"
      onPress={onPress}
      variant="outline"
      size="lg"
    >
      <Icon name={icon} className="size-6 shrink-0" size={24} />
      <Text className="shrink-0 text-sm" numberOfLines={1}>
        {label}
      </Text>
    </Button>
  );
}

interface StatTileProps {
  label: string;
  value: string;
  meta: string;
  muted?: boolean;
}

function StatTile({ label, value, meta, muted = false }: StatTileProps) {
  return (
    <View className="min-w-[140px] flex-1 basis-[140px] gap-1 rounded-xl border border-border bg-card p-4">
      <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Text>
      <Text
        className={cn("text-2xl font-semibold leading-tight", muted && "text-muted-foreground")}
      >
        {value}
      </Text>
      <Text variant="muted" className="text-xs">
        {meta}
      </Text>
    </View>
  );
}

type PlanPillar = "think" | "act" | "be";

interface TodayPlanRow {
  key: string;
  icon: MaterialIconName;
  title: string;
  labelKey: string;
  actionKey: string;
  onPress: () => void;
  pillar: PlanPillar;
  subtitle?: string;
}

const PLAN_PILLAR_BG: Record<PlanPillar, string> = {
  think: "bg-think/15",
  act: "bg-act/15",
  be: "bg-be/15",
};

const PLAN_PILLAR_TEXT: Record<PlanPillar, string> = {
  think: "text-think",
  act: "text-act",
  be: "text-be",
};

function PlanRow({ item }: { item: TodayPlanRow }) {
  const { t } = useTranslation("navigation");
  return (
    <View className="flex-row items-start gap-3">
      <View
        className={cn("size-9 items-center justify-center rounded-lg", PLAN_PILLAR_BG[item.pillar])}
      >
        <Icon name={item.icon} className={cn("size-6", PLAN_PILLAR_TEXT[item.pillar])} />
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-sm font-semibold" numberOfLines={2}>
          {item.title}
        </Text>
        <Text variant="muted" className="text-xs">
          {item.subtitle ?? t(item.labelKey)}
        </Text>
      </View>
      <Button onPress={item.onPress} size="sm" variant="outline">
        <Text>{t(item.actionKey)}</Text>
      </Button>
    </View>
  );
}

const CARE_PLAN_ICONS: Record<string, MaterialIconName> = {
  mood: "mood",
  cbt: "article",
  breathing: "air",
  meditation: "self-improvement",
  gratitude: "favorite",
  journal: "edit-note",
  habits: "directions-run",
  "self-care": "spa",
};

interface CarePlanSectionProps {
  carePlanItems: CarePlanItem[] | null;
  todayKey: string;
  moodLogs: { loggedAt: string }[] | undefined;
  thoughtRecords: { createdAt: string }[] | undefined;
  meditationSessions: { completedAt: string }[] | undefined;
  mindfulnessSessions: { completedAt: string }[] | undefined;
  journalEntries: { createdAt: string }[] | undefined;
  gratitudeEntries: { loggedAt: string }[] | undefined;
  activities: { completedAt: string | null }[] | undefined;
  todaySelfCareLog: unknown;
}

function isToolCompletedToday(
  toolId: string,
  todayKey: string,
  props: CarePlanSectionProps,
): boolean {
  const {
    moodLogs,
    thoughtRecords,
    meditationSessions,
    mindfulnessSessions,
    journalEntries,
    gratitudeEntries,
    activities,
    todaySelfCareLog,
  } = props;
  switch (toolId) {
    case "mood":
      return moodLogs?.some((l) => l.loggedAt.startsWith(todayKey)) ?? false;
    case "cbt":
      return thoughtRecords?.some((r) => r.createdAt.startsWith(todayKey)) ?? false;
    case "breathing":
      return mindfulnessSessions?.some((s) => s.completedAt.startsWith(todayKey)) ?? false;
    case "meditation":
      return meditationSessions?.some((s) => s.completedAt.startsWith(todayKey)) ?? false;
    case "gratitude":
      return gratitudeEntries?.some((e) => e.loggedAt.startsWith(todayKey)) ?? false;
    case "journal":
      return journalEntries?.some((e) => e.createdAt.startsWith(todayKey)) ?? false;
    case "habits":
      return activities?.some((a) => a.completedAt?.startsWith(todayKey)) ?? false;
    case "self-care":
      return Boolean(todaySelfCareLog);
    default:
      return false;
  }
}

function CarePlanSection(props: CarePlanSectionProps) {
  const { t } = useTranslation("navigation");
  const { carePlanItems, todayKey } = props;

  if (carePlanItems === null) {
    return null;
  }

  if (carePlanItems.length === 0) {
    return (
      <View className="gap-3">
        <Text variant="h3">{t("plan.checklist.title")}</Text>
        <Card>
          <CardContent className="gap-4 pt-6 pb-4 items-center">
            <Icon name="checklist" className="size-8 text-muted-foreground" />
            <Text variant="muted" className="text-sm text-center">
              {t("plan.checklist.empty")}
            </Text>
            <Button
              size="sm"
              onPress={() => router.push("/(app)/plan/create" as Parameters<typeof router.push>[0])}
            >
              <Text>{t("plan.checklist.setup")}</Text>
            </Button>
          </CardContent>
        </Card>
      </View>
    );
  }

  const todayItems = carePlanItems.filter(
    (item) => item.frequency === "daily" || item.frequency === "as_needed",
  );

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text variant="h3">{t("plan.checklist.title")}</Text>
        <Button
          size="sm"
          variant="ghost"
          onPress={() => router.push("/(app)/plan" as Parameters<typeof router.push>[0])}
        >
          <Text className="text-xs">{t("plan.checklist.manage")}</Text>
        </Button>
      </View>
      <Card>
        <CardContent className="gap-3 pt-6 pb-4">
          {todayItems.map((item, index) => {
            const completed = isToolCompletedToday(item.toolId, todayKey, props);
            const icon = CARE_PLAN_ICONS[item.toolId] ?? "check-circle";
            const freqKey = `plan.frequency.${item.frequency}`;
            return (
              <View key={item.id} className="gap-3">
                {index > 0 ? <View className="h-px bg-border" /> : null}
                <View className="flex-row items-center gap-3">
                  <View
                    className={cn(
                      "size-9 items-center justify-center rounded-lg",
                      completed ? "bg-primary/15" : "bg-muted",
                    )}
                  >
                    <Icon
                      name={completed ? "check-circle" : icon}
                      className={cn("size-5", completed ? "text-primary" : "text-muted-foreground")}
                    />
                  </View>
                  <View className="flex-1 gap-0.5">
                    <Text
                      className={cn(
                        "text-sm font-semibold",
                        completed && "line-through text-muted-foreground",
                      )}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text variant="muted" className="text-xs">
                      {t(freqKey)}
                    </Text>
                  </View>
                  {!completed ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onPress={() => router.push(item.route as Parameters<typeof router.push>[0])}
                    >
                      <Text>{t("today.plan.open")}</Text>
                    </Button>
                  ) : null}
                </View>
              </View>
            );
          })}
        </CardContent>
      </Card>
    </View>
  );
}

function ModuleCard({ module }: { module: ModuleTile }) {
  const { t } = useTranslation("navigation");
  return (
    <Pressable
      accessibilityHint={t(module.descriptionKey)}
      accessibilityLabel={t(module.nameKey)}
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={() => router.push(module.href as Parameters<typeof router.push>[0])}
      className={cn(
        "min-w-[260px] flex-1 basis-[260px] gap-4 rounded-2xl border bg-card p-5 active:bg-accent/40",
        module.containerClass,
      )}
      role="button"
    >
      <View className="flex-row items-center gap-3">
        <View
          className={cn("size-12 items-center justify-center rounded-xl border", module.markClass)}
        >
          <Text className={cn("text-sm font-bold tracking-wider", module.markClass)}>
            {module.abbreviation}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold">{t(module.nameKey)}</Text>
        </View>
        <View className={cn("rounded-full px-2 py-0.5", module.badgeClass)}>
          <Text
            className={cn("text-[10px] font-semibold uppercase tracking-wider", module.badgeClass)}
          >
            {t(`today.modules.${module.badgeKey}`)}
          </Text>
        </View>
      </View>
      <Text variant="muted" className="text-sm leading-5">
        {t(module.descriptionKey)}
      </Text>
      <View className="flex-row items-center justify-between border-t border-border pt-3">
        <Text variant="muted" className="text-xs">
          {module.footerKey ? t(`today.modules.${module.footerKey}`) : ""}
        </Text>
        <Icon
          name={module.footerKey ? "schedule" : "arrow-forward"}
          className="size-4 text-muted-foreground"
        />
      </View>
    </Pressable>
  );
}

function SharedToolCard({ tool }: { tool: SharedTool }) {
  const { t } = useTranslation("navigation");
  return (
    <Pressable
      accessibilityLabel={t(tool.nameKey)}
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={() => router.push(tool.href as Parameters<typeof router.push>[0])}
      className="min-w-[200px] flex-1 basis-[200px] flex-row items-center gap-3 rounded-xl border border-border bg-card p-3 active:bg-accent/40"
      role="button"
    >
      <View className={cn("size-10 items-center justify-center rounded-lg", tool.iconBg)}>
        <Icon name={tool.icon} className={cn("size-6", tool.iconColor)} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold">{t(tool.nameKey)}</Text>
        <Text variant="muted" className="text-xs">
          {t(tool.subKey)}
        </Text>
      </View>
    </Pressable>
  );
}
