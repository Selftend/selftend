import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { HelpSheet } from "@/src/components/app/help-sheet";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { ShowAllLink } from "@/src/components/app/show-all-link";
import { formatClock } from "@/src/features/breathing/cycle-math";
import {
  useBreathingSessions,
  useBreathingSessionCount,
  useBreathingTotalMinutes,
} from "@/src/features/breathing/queries";
import { breathingPatterns, breathingSlugs } from "@/src/constants/breathing";
import type { BreathingPhase } from "@/src/constants/breathing";
import {
  PatternDot,
  PatternPlayGlyph,
  phaseCountsLabel,
} from "@/src/features/breathing/phase-timing-bar";
import type { BreathingExerciseColor } from "@/src/features/breathing/exercise-types";
import { useBreathingExercises } from "@/src/features/breathing/exercises-queries";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { HOME_COLUMN } from "@/src/lib/layout";
import { useRoomStyle } from "@/src/lib/use-room-style";
import { useSession } from "@/src/providers/session-provider";
import { cn } from "@/lib/utils";
import type { MindfulnessSession } from "@/src/features/mindfulness/types";
import { formatCompactAtOffset } from "@/src/utils/date";

/** Rows shown before the section defers to the all-sessions screen. */
const RECENT_ROWS = 5;

interface PatternRow {
  key: string;
  /** The `?pattern=` value: a built-in's slug, or a custom pattern's row id. */
  routeParam: string;
  name: string;
  description: string | null;
  phases: BreathingPhase[];
  color: BreathingExerciseColor;
}

export default function BreathingScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const { data: customExercises } = useBreathingExercises(user?.id ?? null);
  const customIds = (customExercises ?? []).map((e) => e.id);
  const { data: sessions } = useBreathingSessions(user?.id ?? null, 50, customIds);
  const { data: sessionCount } = useBreathingSessionCount(user?.id ?? null);
  const { data: totalMinutes } = useBreathingTotalMinutes(user?.id ?? null);
  const [helpOpen, setHelpOpen] = useState(false);

  // Sessions are a recent window; scan for the latest completedAt rather than
  // trusting order, mirroring the sleep tracker's last-logged derivation.
  // The whole session is kept, not just the instant: the label renders in the
  // frame the session was captured in (#433 §3).
  const lastSession = (sessions ?? []).reduce<MindfulnessSession | null>(
    (latest, s) => (latest === null || s.completedAt > latest.completedAt ? s : latest),
    null,
  );
  const lastWhen = lastSession
    ? formatCompactAtOffset(lastSession.completedAt, lastSession.completedOffsetMinutes)
    : null;
  // `sessions` is undefined while loading and after a failed fetch with no cache.
  // It also resolves early against the built-in patterns alone, because the query
  // is enabled before `customExercises` arrives to widen the name filter - so the
  // early result is not merely incomplete, it is wrong in both directions: a user
  // whose only history is custom patterns briefly sees an empty list, and a user
  // whose newest session is a custom pattern briefly sees an older built-in one
  // billed as their last. So the whole subline waits for the full name set.
  const historyLoaded = Boolean(sessions && customExercises);
  const lastStat = !historyLoaded
    ? null
    : lastWhen
      ? t("breathing.overview.lastAt", { when: lastWhen })
      : t("breathing.overview.neverLogged");

  const patternName = (exerciseName: string) => {
    if (breathingSlugs.includes(exerciseName)) {
      return t(`breathing.exercises.${exerciseName}.title`);
    }
    return (
      (customExercises ?? []).find((e) => e.id === exerciseName)?.name ??
      t("breathing.deletedExercise")
    );
  };

  // Built-ins and the user's own patterns are ONE list, as the design draws it:
  // both are things you tap to breathe, and splitting them made the built-ins a
  // single "Start a session" card that hid which pattern it would open.
  const patterns: PatternRow[] = [
    ...breathingPatterns.map((p) => ({
      key: p.slug,
      routeParam: p.slug,
      name: t(`breathing.exercises.${p.slug}.title`),
      description: t(`breathing.exercises.${p.slug}.shortDescription`),
      phases: p.phases,
      color: p.color,
    })),
    ...(customExercises ?? []).map((e) => ({
      key: e.id,
      routeParam: e.id,
      name: e.name,
      // No description line for a user's own pattern. The design fills this with
      // "Yours · saved Tuesday", but `created_at` carries no UTC offset, so any
      // date rendered from it would be in the wrong frame for a user who has
      // travelled - and the phase counts on the right already say what the
      // pattern is. An empty second line is honest; a wrong date is not.
      description: null,
      phases: [
        { label: "inhale" as const, durationSeconds: e.inhaleSeconds },
        { label: "hold" as const, durationSeconds: e.holdInSeconds },
        { label: "exhale" as const, durationSeconds: e.exhaleSeconds },
        { label: "holdOut" as const, durationSeconds: e.holdOutSeconds },
      ],
      color: e.color,
    })),
  ];

  const recent = (sessions ?? []).slice(0, RECENT_ROWS);
  const roomStyle = useRoomStyle("aqua");

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={["bottom", "left", "right"]}
      style={roomStyle}
    >
      <ScrollView contentContainerClassName="grow p-4">
        <View className={cn(HOME_COLUMN, "gap-9")}>
          <ModuleHomeHeader
            addWidgetCategory="breathing"
            tourScope="breathing"
            title={t("breathing.title")}
            description={t("breathing.tagline")}
            actions={[
              { type: "notifications", targetKey: "breathing" },
              {
                type: "info",
                onPress: () => setHelpOpen(true),
                accessibilityLabel: t("breathing.helpLabel"),
              },
            ]}
            // Count and noun split, so the number carries the foreground ink and
            // the unit stays muted. Both figures are exact lifetime totals from
            // the server; neither is a reduction over the capped list below.
            // `overview.sessions` / `overview.minutes` resolve to the BARE noun -
            // the count is passed only to select the plural form, and the number
            // itself rides `value` so the header can ink it separately. A single
            // "{{count}} sessions" string could not be split without slicing a
            // translated string, which breaks in any locale that puts the number
            // elsewhere.
            stats={[
              ...(sessionCount !== undefined
                ? [
                    {
                      value: String(sessionCount),
                      label: t("breathing.overview.sessions", { count: sessionCount }),
                    },
                  ]
                : []),
              ...(totalMinutes !== undefined
                ? [
                    {
                      value: String(totalMinutes),
                      label: t("breathing.overview.minutes", { count: totalMinutes }),
                    },
                  ]
                : []),
              ...(lastStat ? [{ value: "", label: lastStat }] : []),
            ]}
          />

          <HelpSheet helpKey="breathing" visible={helpOpen} onDismiss={() => setHelpOpen(false)} />

          <View className="gap-1">
            <SectionHeader
              title={t("breathing.overview.patternsTitle")}
              action={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("breathing.overview.newPattern")}
                  hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                  onPress={() => router.push("/tools/breathing/new")}
                  className="flex-row items-center gap-1 active:opacity-70"
                  role="button"
                >
                  <Text variant="muted" className="shrink-0 text-[12.5px] font-semibold">
                    {t("breathing.overview.newPattern")}
                  </Text>
                  {/* This one baked its arrow into the string too, which put a glyph in
                    the accessible name right beside a door that had just stopped doing
                    that. Decorative icon here as well; `Icon` is aria-hidden. */}
                  <Icon name="arrow-forward" className="size-3.5 text-muted-foreground" />
                </Pressable>
              }
            />
            {patterns.length === 0 ? (
              <Text variant="muted" className="border-t border-border py-4 text-sm">
                {t("breathing.overview.noPatterns")}
              </Text>
            ) : (
              patterns.map((p) => (
                <Pressable
                  key={p.key}
                  accessibilityRole="button"
                  accessibilityLabel={t("breathing.overview.startPattern", { name: p.name })}
                  hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                  onPress={() =>
                    router.push({
                      pathname: "/tools/breathing/session",
                      params: { pattern: p.routeParam },
                    })
                  }
                  className="flex-row items-center gap-4 border-t border-border px-2.5 py-4 active:bg-accent/40"
                  role="button"
                >
                  <PatternDot color={p.color} />
                  <View className="min-w-0 flex-1 gap-1">
                    <Text className="text-[15px] font-semibold tracking-tight">{p.name}</Text>
                    {p.description ? (
                      <Text variant="muted" className="text-[13px] leading-snug">
                        {p.description}
                      </Text>
                    ) : null}
                  </View>
                  <Text variant="muted" className="shrink-0 text-[12.5px] tabular-nums">
                    {phaseCountsLabel(p.phases)}
                  </Text>
                  <PatternPlayGlyph />
                </Pressable>
              ))
            )}
            <View className="h-px bg-border" />
          </View>

          <View className="gap-1">
            <SectionHeader
              title={t("breathing.overview.recentTitle")}
              action={
                <ShowAllLink
                  label={t("breathing.overview.showAll")}
                  route="/tools/breathing/history"
                />
              }
            />
            {recent.length === 0 ? (
              <Text variant="muted" className="border-t border-border py-4 text-sm">
                {t("breathing.history.empty")}
              </Text>
            ) : (
              recent.map((s) => (
                <View
                  key={s.id}
                  className="flex-row items-center gap-4 border-t border-border px-2.5 py-3"
                >
                  <Text className="flex-1 text-sm" numberOfLines={1}>
                    {patternName(s.exerciseName)}
                  </Text>
                  {s.cycles != null ? (
                    <Text variant="muted" className="shrink-0 text-[12.5px] tabular-nums">
                      {t("breathing.cycles", { count: s.cycles })}
                    </Text>
                  ) : null}
                  <Text className="shrink-0 text-[12.5px] tabular-nums">
                    {s.durationSeconds != null
                      ? formatClock(s.durationSeconds)
                      : t("breathing.minutes", { value: s.durationMinutes })}
                  </Text>
                  <Text variant="muted" className="shrink-0 text-xs tabular-nums">
                    {formatCompactAtOffset(s.completedAt, s.completedOffsetMinutes)}
                  </Text>
                </View>
              ))
            )}
            <View className="h-px bg-border" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * A section's label and its one link. `Load 5 more` is deliberately absent - a
 * fixed five rows and a link to the full screen, as the rest of the redesign
 * landed, rather than a button that grows the page indefinitely.
 *
 * The action is a node rather than a label and a handler, because the two sections
 * take different kinds: the sessions section takes the shared `ShowAllLink` door
 * (#1375), and the patterns section a plain creation button.
 */
function SectionHeader({ title, action }: { title: string; action: ReactNode }) {
  return (
    <View className="flex-row items-center justify-between gap-3 pb-1.5">
      <Text className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {title}
      </Text>
      {action}
    </View>
  );
}
