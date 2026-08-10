import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { BarChart } from "@/src/components/charts/bar-chart";
import { Button } from "@/src/components/react-native-reusables/button";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { Section } from "@/src/components/app/section";
import { MeditationInfo } from "@/src/components/app/meditation-info-modal";
import {
  MeditationOnboarding,
  type MeditationOnboardingResult,
} from "@/src/components/app/meditation-onboarding-modal";
import { INTERVAL_OPTIONS_MINUTES } from "@/src/features/timer/interval";
import { TimerWidget } from "@/src/features/timer/timer-widget";
import { MeditationDailyLifeCard } from "@/src/features/meditation/meditation-daily-life-card";
import { MeditationInsightsCard } from "@/src/features/meditation/meditation-insights-card";
import { MeditationPracticesSection } from "@/src/features/meditation/meditation-practices-section";
import {
  buildMinutesWindow,
  MINUTES_WINDOW_DAYS,
  minutesWindowFromIso,
  windowTotalMinutes,
} from "@/src/features/meditation/minutes-window";
import {
  useMeditationMedianMinutes,
  useMeditationMinutesWindow,
  useMeditationProgramState,
  useMeditationSessions,
  useMeditationSessionCount,
  useUpsertMeditationProgramState,
} from "@/src/features/meditation/queries";
import { median } from "@/src/features/meditation/median";
import { getStage } from "@/src/features/meditation/stages";
import type { MeditationSession, StageNumber } from "@/src/features/meditation/types";
import { useUserPreferences, useUpdateUserPreferences } from "@/src/features/settings/queries";
import { useSession } from "@/src/providers/session-provider";
import { parseHHmm } from "@/src/utils/time";
import { cn } from "@/lib/utils";
import { DEFAULT_INTERACTIVE_HIT_SLOP, spaceKeyActivationProps } from "@/src/lib/accessibility";
import { HOME_COLUMN } from "@/src/lib/layout";
import { useRoomStyle } from "@/src/lib/use-room-style";
import { formatAtOffset, parseLocalNoon } from "@/src/utils/date";
import { formatRelativeDayKey } from "@/src/utils/relative-time";

/**
 * The lengths the design offers, in minutes (#785).
 *
 * A row of choices, not a dial. The drag-picker this replaces could express 63
 * minutes and made the user work for 12; six named lengths cover what people
 * actually sit and are one tap each.
 */
const DURATION_OPTIONS = [5, 10, 12, 20, 30, 45] as const;

/** The pre-selected length when the user has no stored preference. */
const DEFAULT_DURATION = 12;

/** Five rows and one link out - the overview lists, the all-sits screen holds (#696). */
const RECENT_SITS = 5;

export default function MeditationHomeScreen() {
  const { t, i18n } = useTranslation("meditation");
  const roomStyle = useRoomStyle("iris");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const { practice } = useLocalSearchParams<{ practice?: string }>();

  const { data: preferences, isLoading: prefsLoading } = useUserPreferences(userId);
  const { data: programState } = useMeditationProgramState(userId);
  const { data: allSessions } = useMeditationSessions(userId, 200);
  // Exact lifetime total for the hero - the list above is capped at 200, so its length
  // would freeze the displayed "sits" count once a user passes that many.
  const { data: totalSessions } = useMeditationSessionCount(userId);
  // Exact lifetime median for the hero, same reason: a median taken over the capped list
  // is a median of the newest 200 sits, which a daily meditator passes in under seven
  // months - and unlike a rolling window, nothing in the label says so (#337).
  const { data: serverMedianMinutes } = useMeditationMedianMinutes(userId);
  const sessions = allSessions?.slice(0, RECENT_SITS);

  const upsertProgramState = useUpsertMeditationProgramState(userId);
  const updatePreferences = useUpdateUserPreferences(userId);
  const [onboardingError, setOnboardingError] = useState<string | undefined>();
  const [forceInfo, setForceInfo] = useState(false);
  const [forceWizard, setForceWizard] = useState(false);

  const currentStage = (programState?.currentStage ?? 1) as StageNumber;
  const stage = getStage(currentStage);
  const preferredDuration = programState?.preferredDurationMinutes ?? null;
  /**
   * The six drawn lengths, plus the user's own if it is not one of them.
   *
   * Onboarding lets someone commit to 15 minutes, which the design's row does not
   * contain. Dropping it would quietly re-decide their length for them the first
   * time they open the redesigned screen, so it takes a seventh button instead.
   */
  const durationOptions = useMemo(() => {
    const base = [...DURATION_OPTIONS] as number[];
    if (preferredDuration !== null && !base.includes(preferredDuration)) {
      base.push(preferredDuration);
      base.sort((a, b) => a - b);
    }
    return base;
  }, [preferredDuration]);

  // Null until the user picks, so a preference arriving after first paint still
  // lands - but a pick made before it arrives is never overwritten.
  const [pickedDuration, setPickedDuration] = useState<number | null>(null);
  const [bellMinutes, setBellMinutes] = useState<number>(0);
  const [sitting, setSitting] = useState(false);
  const durationMinutes = pickedDuration ?? preferredDuration ?? DEFAULT_DURATION;

  // The loaded sessions only stand in until the server median arrives (undefined while
  // loading); once it does it wins, including a genuine null for "no sessions yet".
  const medianMinutes =
    serverMedianMinutes !== undefined
      ? serverMedianMinutes
      : median((allSessions ?? []).map((s) => s.durationMinutes));

  // "Last sat" derives from the session window the screen already queries; scan
  // for the latest completedAt rather than trusting order (grounding precedent).
  // The whole session is kept, not just the instant, because the label renders
  // in the frame the sit was captured in (#433 §3).
  const lastSession = (allSessions ?? []).reduce<MeditationSession | null>(
    (latest, s) => (latest === null || s.completedAt > latest.completedAt ? s : latest),
    null,
  );
  const lastWhen = lastSession
    ? formatAtOffset(lastSession.completedAt, lastSession.completedOffsetMinutes)
    : null;
  // `allSessions` is undefined while loading and after a failed fetch with no
  // cache - only an actually-loaded (possibly empty) history may claim "no
  // sessions yet", or a returning user's history reads as erased (#320).
  const subline = lastWhen
    ? t("hero.last", { when: lastWhen })
    : allSessions
      ? t("hero.never")
      : undefined;

  const sitCount = totalSessions ?? (allSessions ?? []).length;
  /**
   * `Stage 1 · 24 sits · 12 min typical · last today, 6:03 pm`, split so the
   * count is foreground ink and the noun is muted (#690).
   *
   * The stage is there from the first second of an account, so it always shows.
   * The other two are not: `0 sits · - typical` is the row of zeros #735 met a
   * brand-new check-in user with, and there is no reason to repeat it here.
   */
  const statItems = [
    { value: `${t("hero.stage")} ${stage.number}`, label: "" },
    ...(sitCount > 0
      ? [
          { value: String(sitCount), label: t("hero.sits", { count: sitCount }) },
          ...(medianMinutes !== null
            ? [
                {
                  value: String(medianMinutes),
                  label: t("hero.typicalMinutes"),
                },
              ]
            : []),
        ]
      : []),
    // The old ToolStats.subline, folded into the row as a value-less item -
    // which is how the design renders "last logged 4:50 pm".
    ...(subline ? [{ value: "", label: subline }] : []),
  ];

  /**
   * The one reading of the clock this screen makes.
   *
   * Never during render: a render-time `Date.now()` is unstable under the React
   * Compiler, and this screen re-renders on every query that lands. It is taken
   * on focus and refreshed on every length change - between them, the only two
   * moments where anything derived from it can be seen to move.
   *
   * Re-reading it on FOCUS is what carries the thirty-day window across local
   * midnight. Pinned at mount, the window's bound never rolls over, so a screen
   * left mounted overnight would keep drawing yesterday's thirty days under
   * today's labels until something unrelated invalidated the query.
   */
  const [nowMs, setNowMs] = useState<number | null>(null);
  useFocusEffect(
    useCallback(() => {
      setNowMs(Date.now());
    }, []),
  );

  // The chart's own bounded window, for the third time the same reason: reducing
  // the capped list would silently stop covering thirty days for a heavy user.
  // The bound is day-truncated, so picking a different length re-reads the clock
  // without moving the cache key - only a new civil day does that.
  const windowFromIso = useMemo(
    () => (nowMs === null ? "" : minutesWindowFromIso(MINUTES_WINDOW_DAYS, new Date(nowMs))),
    [nowMs],
  );
  const { data: windowSessions } = useMeditationMinutesWindow(userId, windowFromIso);

  /** "ends about 6:15 pm" - what the chosen length actually costs, in clock time. */
  const endsAbout = useMemo(() => {
    if (nowMs === null) return null;
    const end = new Date(nowMs + durationMinutes * 60_000);
    return new Intl.DateTimeFormat(i18n.language || undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(end);
  }, [nowMs, durationMinutes, i18n.language]);

  function pickDuration(minutes: number) {
    setPickedDuration(minutes);
    setNowMs(Date.now());
  }

  // The same clock reading, so the last column advances with the query bound
  // rather than trailing it by a day after a midnight rollover.
  const minutesWindow = useMemo(
    () =>
      nowMs === null
        ? []
        : buildMinutesWindow(windowSessions, MINUTES_WINDOW_DAYS, new Date(nowMs)),
    [windowSessions, nowMs],
  );
  const minutesTotal = windowTotalMinutes(minutesWindow);
  const minutesRange = useMemo(() => {
    if (minutesWindow.length === 0) return "";
    const fmt = new Intl.DateTimeFormat(i18n.language || undefined, {
      day: "numeric",
      month: "short",
    });
    const first = minutesWindow[0]!.dayKey;
    const last = minutesWindow[minutesWindow.length - 1]!.dayKey;
    return `${fmt.format(parseLocalNoon(first))} – ${fmt.format(parseLocalNoon(last))}`;
  }, [minutesWindow, i18n.language]);

  async function handleOnboardingComplete(result: MeditationOnboardingResult) {
    if (!preferences || !userId) return;
    setOnboardingError(undefined);
    const preferredTime = parseHHmm(result.preferredTimeOfDay) ?? { hour: 7, minute: 0 };
    try {
      await upsertProgramState.mutateAsync({
        currentStage: result.assessedStage,
        assessedStage: result.assessedStage,
        onboardingCompletedAt: new Date().toISOString(),
        preferredDurationMinutes: result.preferredDurationMinutes,
        preferredTimeOfDay: result.preferredTimeOfDay,
      });
      await updatePreferences.mutateAsync({
        meditationOnboardingCompleted: true,
        meditationRemindersEnabled: result.remindersEnabled,
        meditationReminderHour: preferredTime.hour,
        meditationReminderMinute: preferredTime.minute,
        enabledModules: addModule(preferences.enabledModules, "meditation"),
      });
      setForceWizard(false);
    } catch (error) {
      const fallback = t("onboarding.commit.error");
      const detail = error instanceof Error ? error.message : null;
      setOnboardingError(detail ? `${fallback} (${detail})` : fallback);
    }
  }

  if (prefsLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background" style={roomStyle}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <>
      <MeditationInfo
        visible={forceInfo}
        onComplete={() => setForceInfo(false)}
        onDismiss={() => setForceInfo(false)}
      />
      <MeditationOnboarding
        visible={forceWizard}
        isPending={upsertProgramState.isPending || updatePreferences.isPending}
        errorMessage={onboardingError}
        onComplete={(result) => void handleOnboardingComplete(result)}
        onDismiss={forceWizard ? () => setForceWizard(false) : undefined}
      />
      <SafeAreaView
        className="flex-1 bg-background"
        edges={["bottom", "left", "right"]}
        style={roomStyle}
      >
        <ScrollView contentContainerClassName="grow p-4">
          {/* No gap: `Section` carries its own py-6, and the hairline belongs
              between two sections' padding rather than across a flex gap. */}
          <View className={cn(HOME_COLUMN)}>
            <ModuleHomeHeader
              addWidgetCategory="meditation"
              title={t("module.home.title")}
              tourScope="meditation"
              description={t("module.home.subtitle")}
              actions={[
                { type: "tune", onPress: () => setForceWizard(true) },
                { type: "notifications", targetKey: "meditation" },
                { type: "info", onPress: () => setForceInfo(true) },
              ]}
              stats={statItems}
            />

            <Section ruled={false} className="gap-5">
              <View className="flex-row flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <Text variant="h3" aria-level={2} className="text-lg">
                  {t("module.home.todayCard")}
                </Text>
                {!sitting && endsAbout !== null ? (
                  <Text variant="muted" className="text-[12.5px] tabular-nums">
                    {t("module.home.endsAbout", { time: endsAbout })}
                  </Text>
                ) : null}
              </View>

              {sitting ? (
                // The timer owns this block once a sit starts. Its own duration
                // and interval pickers stay hidden: the row above IS the setup,
                // and #786 replaces this in-place timer with the sitting screen.
                <TimerWidget
                  initialDuration={durationMinutes}
                  initialInterval={bellMinutes}
                  showSetup={false}
                  autoStart
                  onIdle={() => setSitting(false)}
                />
              ) : (
                <>
                  <ChoiceRow
                    testID="sit-length-choices"
                    label={t("module.home.durationLabel")}
                    /* 96px floor, so six buttons run across the 720px column and
                       wrap to three-and-three at 360dp rather than clipping
                       `45 min` (and `bg`'s longer `Изкл.` neighbours below). */
                    itemClassName="min-w-[96px]"
                    options={durationOptions.map((minutes) => ({
                      value: minutes,
                      label: t("duration.minutes", { count: minutes }),
                    }))}
                    value={durationMinutes}
                    onChange={pickDuration}
                  />
                  <ChoiceRow
                    testID="sit-bell-choices"
                    label={t("timer:interval.label")}
                    itemClassName="min-w-[68px]"
                    options={INTERVAL_OPTIONS_MINUTES.map((minutes) => ({
                      value: minutes,
                      label:
                        minutes === 0
                          ? t("timer:interval.off")
                          : t("duration.minutes", { count: minutes }),
                    }))}
                    value={bellMinutes}
                    onChange={setBellMinutes}
                  />
                  {/* `lg`, so the screen's primary action clears the 44dp touch
                      floor on a phone - the default button is 40dp tall. */}
                  <Button size="lg" onPress={() => setSitting(true)} className="self-start px-8">
                    <Text>{t("module.home.begin")}</Text>
                  </Button>
                </>
              )}
            </Section>

            <Section title={t("module.home.practiceLabel")} className="gap-0">
              <View>
                <PracticeRow
                  icon="stairs"
                  title={t("module.home.stageRow", {
                    stage: stage.number,
                    name: t(stage.shortTitleKey as Parameters<typeof t>[0]),
                  })}
                  subtitle={t("module.home.stageRowSubtitle")}
                  onPress={() => router.push("/tools/meditation/stages")}
                />
                <PracticeRow
                  icon="menu-book"
                  title={t("module.learn.title")}
                  subtitle={t("module.learn.subtitle")}
                  onPress={() => router.push("/tools/meditation/learn")}
                  ruled
                />
              </View>
            </Section>

            {/*
              The chart earns its place, like check-in's do (#735): thirty empty
              columns are not a picture of a practice, they are a picture of a
              product. `windowSessions` undefined is a window still loading or
              failed, which is not a window with no sits in it.
            */}
            {windowSessions && minutesTotal > 0 ? (
              <Section
                title={t("module.home.minutesSat")}
                action={
                  <Text variant="muted" className="text-[12.5px] tabular-nums">
                    {minutesRange}
                  </Text>
                }
              >
                {/*
                  One node for thirty bars. Each column is 6dp wide at 360dp and
                  carries no label, so thirty unlabelled boxes would be thirty
                  useless stops for a screen reader; the total is the text
                  equivalent, and the rows below carry the individual sits.
                */}
                <View
                  accessible
                  accessibilityRole="image"
                  role="img"
                  accessibilityLabel={t("module.home.minutesA11y", {
                    count: minutesTotal,
                    days: MINUTES_WINDOW_DAYS,
                  })}
                >
                  <BarChart
                    bars={minutesWindow.map((day) => ({ key: day.dayKey, value: day.minutes }))}
                    barAreaHeight={72}
                    minBarHeight={8}
                    // A day with no sit still draws, as a 2px stub: absent and
                    // zero are different facts, and a gap in a thirty-column row
                    // reads as missing data rather than as a rest day.
                    zeroHeight={2}
                    // NOT `bg-muted`, which measures 1.10:1 on card and 1.02:1 on
                    // background - bars that are not low-contrast but invisible
                    // (#725). The accent clears 3:1 in both schemes (WCAG 1.4.11).
                    tintClass="bg-primary"
                    barClassName="rounded-sm"
                    className="gap-1"
                  />
                </View>
              </Section>
            ) : null}

            <Section title={t("practices.sectionLabel")}>
              <MeditationPracticesSection initialPractice={practice} />
            </Section>

            {currentStage === 10 ? (
              <Section>
                <MeditationDailyLifeCard />
              </Section>
            ) : null}

            {/* Five fixed rows and one link out (#696). `Load 5 more` is gone:
                growing this list in place is what the all-sits screen is for. */}
            <Section
              title={t("module.home.recentTitle")}
              action={
                sessions && sessions.length > 0 ? (
                  <Pressable
                    accessibilityRole="link"
                    hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                    onPress={() => router.push("/tools/meditation/sessions")}
                    className="flex-row items-center gap-1 active:opacity-70"
                    role="link"
                  >
                    <Text className="text-[13px] font-semibold text-primary-ink">
                      {t("module.home.showAllSits")}
                    </Text>
                    <Icon name="arrow-forward" className="size-3.5 text-primary-ink" />
                  </Pressable>
                ) : null
              }
            >
              {!sessions || sessions.length === 0 ? (
                <Text variant="muted">{t("module.home.noSessions")}</Text>
              ) : (
                <View>
                  {sessions.map((s, index) => (
                    <SitRow key={s.id} session={s} ruled={index > 0} />
                  ))}
                </View>
              )}
            </Section>

            {allSessions && allSessions.length > 0 ? (
              <Section>
                <MeditationInsightsCard sessions={allSessions} />
              </Section>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function addModule<T extends string>(modules: T[], key: T): T[] {
  return modules.includes(key) ? modules : [...modules, key];
}

interface ChoiceOption {
  value: number;
  label: string;
}

interface ChoiceRowProps {
  label: string;
  options: ChoiceOption[];
  value: number;
  onChange: (value: number) => void;
  /** Per-button minimum width, which is what decides where the row wraps. */
  itemClassName?: string;
  /** On the group, so a test can scope to it - the two rows share labels like `5 min`. */
  testID?: string;
}

/**
 * One pick from a run of named choices - the sit's length, and the interval bell.
 *
 * The label is the design's 11px eyebrow, but on its own line rather than inline
 * with the buttons. Inline is what the design draws and it is the tightest row on
 * the screen: `Interval bell` plus four buttons measures past 328dp usable in
 * `en` before `bg`'s `Междинен звън` makes it worse, and the row neither wraps
 * nor scrolls in the drawing - it would simply clip.
 *
 * A radiogroup, not a row of buttons: exactly one is chosen, and that is what a
 * screen reader should hear. Selection shifts border, fill AND weight together,
 * because a 10% tint is not a distinction on its own (#691), and the ink is
 * `text-primary-ink` rather than `text-primary` - the latter on `bg-primary/10`
 * measures 3.81:1, under AA for text this size (#368).
 */
function ChoiceRow({ label, options, value, onChange, itemClassName, testID }: ChoiceRowProps) {
  return (
    <View className="gap-2">
      <Text className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </Text>
      <View
        // `accessibilityLabel`, not `aria-label`: the group needs a name on
        // native too, and RNW maps this one to `aria-label` on the way out. The
        // View is deliberately NOT `accessible` - that would collapse the four
        // radios inside it into one node on iOS.
        accessibilityLabel={label}
        accessibilityRole="radiogroup"
        role="radiogroup"
        testID={testID}
        className="flex-row flex-wrap gap-2"
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              aria-checked={selected}
              onPress={() => onChange(option.value)}
              // 44dp on the shortest axis without hitSlop: these are the primary
              // controls of the screen, not chips in a long list, so the target
              // is the button itself.
              className={cn(
                "min-h-[44px] grow items-center justify-center rounded-lg border px-3",
                itemClassName,
                selected ? "border-primary bg-primary/10" : "border-border bg-card",
              )}
              role="radio"
              {...spaceKeyActivationProps(() => onChange(option.value))}
            >
              <Text
                className={cn(
                  "text-[13px] tabular-nums",
                  selected ? "font-semibold text-primary-ink" : "text-foreground",
                )}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

interface PracticeRowProps {
  icon: MaterialIconName;
  title: string;
  subtitle: string;
  onPress: () => void;
  ruled?: boolean;
}

/** A door out of the overview, as a hairline row rather than a card. */
function PracticeRow({ icon, title, subtitle, onPress, ruled = false }: PracticeRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onPress}
      className={cn(
        "flex-row items-center gap-4 py-4 active:opacity-70",
        ruled && "border-t border-border",
      )}
      role="button"
    >
      {/* Decorative: the title beside it already names the destination. */}
      <Icon aria-hidden name={icon} className="size-5 text-primary" />
      <View className="flex-1 gap-0.5">
        <Text className="text-[14.5px] font-semibold">{title}</Text>
        <Text variant="muted" className="text-[13px]">
          {subtitle}
        </Text>
      </View>
      <Icon aria-hidden name="chevron-right" className="size-5 text-muted-foreground" />
    </Pressable>
  );
}

/**
 * One recent sit.
 *
 * Two lines rather than the design's one: at 720px a length, a note, a stage
 * badge and a timestamp fit across a single row, and at 360dp they do not - the
 * note is the part that would be squeezed to nothing. It takes its own line,
 * which is the same resolution habits' history row reached (#762).
 */
function SitRow({ session, ruled }: { session: MeditationSession; ruled: boolean }) {
  const { t } = useTranslation("meditation");

  return (
    <Pressable
      accessibilityRole="button"
      // Deliberately NO `accessibilityLabel`. An explicit one overrides the name
      // assembled from the children, which would announce every row as just its
      // length - and three twelve-minute sits would be three identical rows with
      // no way to tell them apart. The children already say length, stage, when
      // and note, in that order.
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={() =>
        router.push({ pathname: "/tools/meditation/sessions/[id]", params: { id: session.id } })
      }
      className={cn("gap-1 py-3 active:opacity-70", ruled && "border-t border-border")}
      role="button"
    >
      <View className="flex-row items-center gap-3">
        <Text className="text-sm font-semibold tabular-nums">
          {t("module.sessions.durationLabel", { count: session.durationMinutes })}
        </Text>
        <View className="flex-1" />
        {/* The shipped chrome badge, unchanged (#588): a stage badge is not the
            module's identity, so it wears no hue. The design draws it as
            `iris/0.1` under `hsl(var(--iris))` text, which is both a module hue
            and the pattern #368 measured at 3.81:1 - it takes neither. */}
        <View className="rounded-full bg-muted px-2 py-0.5">
          <Text className="text-[11px] font-semibold text-primary-ink">
            {t("module.sessions.stageBadge", { stage: session.stageAtSession })}
          </Text>
        </View>
        {/* The entry's CAPTURED civil day, not the viewer's reading of the
            instant - the two disagree after travel (#250). */}
        <Text variant="muted" className="text-xs">
          {formatRelativeDayKey(session.dayKey, t)}
        </Text>
      </View>
      {session.reflection ? (
        <Text variant="muted" className="text-[13px] leading-5" numberOfLines={2}>
          {session.reflection}
        </Text>
      ) : null}
    </Pressable>
  );
}
