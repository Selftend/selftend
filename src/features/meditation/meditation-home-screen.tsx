import { Redirect, useFocusEffect, useLocalSearchParams } from "expo-router";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { useCallback, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { BarChart } from "@/src/components/charts/bar-chart";
import { Button } from "@/src/components/react-native-reusables/button";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Switch } from "@/src/components/react-native-reusables/switch";
import { Text } from "@/src/components/react-native-reusables/text";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { AMBIENT_SOUNDS } from "@/src/constants/breathing-sounds";
import { Section } from "@/src/components/app/section";
import { ScreenLoading } from "@/src/components/app/screen-state";
import { MeditationInfo } from "@/src/components/app/meditation-info-modal";
import {
  MeditationOnboarding,
  type MeditationOnboardingResult,
} from "@/src/components/app/meditation-onboarding-modal";
import {
  BELL_CHOICES,
  bellChoiceFromStored,
  bellChoiceKey,
  bellChoicePatch,
} from "@/src/features/meditation/interval";
import { DurationSlider } from "@/src/features/meditation/duration-slider";
import { VolumeSlider } from "@/src/components/app/volume-slider";
import { computeWindowInsights } from "@/src/features/meditation/insights";
import { MeditationDailyLifeCard } from "@/src/features/meditation/meditation-daily-life-card";
import { MeditationInsightsCard } from "@/src/features/meditation/meditation-insights-card";
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
import {
  DEFAULT_INTERACTIVE_HIT_SLOP,
  enterKeyActivationProps,
  spaceKeyActivationProps,
} from "@/src/lib/accessibility";
import { HOME_COLUMN } from "@/src/lib/layout";
import { formatCompactAtOffset, parseLocalNoon } from "@/src/utils/date";
import { formatRelativeDayKey } from "@/src/utils/relative-time";

/** The pre-selected length when the user has no stored preference. */
const DEFAULT_DURATION = 12;

/** Five rows and one link out - the overview lists, the all-sits screen holds (#696). */
const RECENT_SITS = 5;

export default function MeditationHomeScreen() {
  const pushWithOrigin = usePushWithOrigin();
  const openSessions = () => pushWithOrigin("/tools/meditation/sessions");
  const { t, i18n } = useTranslation("meditation");
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

  // Null until the user picks, so a preference arriving after first paint still
  // lands - but a pick made before it arrives is never overwritten.
  const [pickedDuration, setPickedDuration] = useState<number | null>(null);
  const [pickedBell, setPickedBell] = useState<string | null>(null);
  const durationMinutes = pickedDuration ?? preferredDuration ?? DEFAULT_DURATION;
  // Same null-until-picked shape as the length above, and for the same reason:
  // the stored bell arrives with the preferences query, after first paint. The
  // two stored columns resolve to one choice here (#1189) - half-time is not a
  // spacing, so it cannot live in the minutes column.
  const storedBell = bellChoiceFromStored(
    preferences?.meditationIntervalBellMinutes ?? 0,
    preferences?.meditationBellAtHalf ?? false,
  );
  const bellKey = pickedBell ?? bellChoiceKey(storedBell);
  const [pickedBellVolume, setPickedBellVolume] = useState<number | null>(null);
  const bellVolume = pickedBellVolume ?? preferences?.bellVolume ?? 1;
  // The sit's ambient bed (#1742): its OWN pair of preferences, never the
  // breathing pair - rain chosen for breathing must not play under a sit the
  // person never asked it for. Null-until-picked, like the bell above.
  const [pickedBed, setPickedBed] = useState<string | null>(null);
  const bedId = pickedBed ?? preferences?.meditationAmbientSoundId ?? "none";
  const [pickedBedVolume, setPickedBedVolume] = useState<number | null>(null);
  const bedVolume = pickedBedVolume ?? preferences?.meditationAmbientVolume ?? 0.5;
  // The bells' tap (#1741): one preference, also toggled from a running breathing
  // session. Off by default and on every account that never touched it.
  const [pickedHaptic, setPickedHaptic] = useState<boolean | null>(null);
  const hapticCues = pickedHaptic ?? preferences?.hapticCues ?? false;

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
    ? formatCompactAtOffset(lastSession.completedAt, lastSession.completedOffsetMinutes)
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

  // Both of the card's controls used to forget on every visit (#1190): the
  // length was written only by the onboarding wizard, and the bell was stored
  // nowhere at all.
  //
  // Writes are best-effort, exactly like the breathing session's volume writes:
  // the local pick is authoritative for this visit, so a failed write must not
  // surface as an error or become an unhandled rejection.
  //
  // The length persists on COMMIT, not on change - a drag emits once per whole
  // minute it crosses, which would be a write per minute of travel. The bell is
  // a discrete choice, so its change already is its commit.
  function commitDuration(minutes: number) {
    if (!userId) return;
    void upsertProgramState
      .mutateAsync({ preferredDurationMinutes: minutes })
      .catch(() => undefined);
  }

  function pickBell(key: string) {
    setPickedBell(key);
    if (!userId) return;
    const choice = BELL_CHOICES.find((c) => bellChoiceKey(c) === key);
    if (!choice) return;
    // One writer for the pair, so the two columns cannot drift apart.
    void updatePreferences.mutateAsync(bellChoicePatch(choice)).catch(() => undefined);
  }

  // Volume drags like the length does, so it persists on commit for the same
  // reason: a drag emits per pan move (#1188).
  function commitBellVolume(volume: number) {
    if (!userId) return;
    void updatePreferences.mutateAsync({ bellVolume: volume }).catch(() => undefined);
  }

  // The bed is a discrete choice like the bell, so its change is its commit; its
  // volume drags like the bell's, so it persists on commit (#1742).
  function pickBed(id: string) {
    setPickedBed(id);
    if (!userId) return;
    void updatePreferences.mutateAsync({ meditationAmbientSoundId: id }).catch(() => undefined);
  }

  function commitBedVolume(volume: number) {
    if (!userId) return;
    void updatePreferences.mutateAsync({ meditationAmbientVolume: volume }).catch(() => undefined);
  }

  // A switch is its own commit, like the bed's choice (#1741).
  function pickHapticCues(value: boolean) {
    setPickedHaptic(value);
    if (!userId) return;
    void updatePreferences.mutateAsync({ hapticCues: value }).catch(() => undefined);
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
  // The insights card reduces over the same rows and the same drawn day keys as
  // the chart, so the two surfaces never disagree about what the window held.
  const windowInsights = useMemo(
    () =>
      computeWindowInsights(
        windowSessions ?? [],
        minutesWindow.map((day) => day.dayKey),
      ),
    [windowSessions, minutesWindow],
  );
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
      // The wizard's preferred time seeds the reminder columns but never ENABLES the
      // reminder (#981): enabling it here wrote no `reminder_consent` and armed no push
      // channel, so the reminder it promised could not be delivered on any platform. The
      // contextual prompt after the first session is what asks.
      await updatePreferences.mutateAsync({
        meditationReminderHour: preferredTime.hour,
        meditationReminderMinute: preferredTime.minute,
        enabledModules: addModule(preferences.enabledModules, "meditation"),
      });
      setForceWizard(false);
    } catch {
      // The thrown message is a backend/internal string, English for every user -
      // translated copy only (i18n rule, #1060). The mutation cache's global onError
      // already reports the failure to Sentry.
      setOnboardingError(t("onboarding.commit.error"));
    }
  }

  // The practices reference moved to its own route (#853); a `?practice=` deep
  // link aimed at the overview follows it there rather than dying quietly.
  if (practice) {
    return <Redirect href={{ pathname: "/tools/meditation/practices", params: { practice } }} />;
  }

  if (prefsLoading) {
    return <ScreenLoading title={t("module.home.title")} />;
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
        // The ternary this replaces only ever produced `undefined` while the
        // wizard was invisible (`visible={forceWizard}`), so it withheld a
        // dismiss from nobody.
        onDismiss={() => setForceWizard(false)}
      />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-4">
          {/* No gap: `Section` carries its own py-6, and the hairline belongs
              between two sections' padding rather than across a flex gap. */}
          <View className={cn(HOME_COLUMN)}>
            <ModuleHomeHeader
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
                {endsAbout !== null ? (
                  <Text variant="muted" className="text-[12.5px] tabular-nums">
                    {t("module.home.endsAbout", { time: endsAbout })}
                  </Text>
                ) : null}
              </View>

              {/* Per-minute again (#930, reversing #785's six chips): drag for
                  distance, the steppers for precision. A stored preference of
                  any whole minute is directly expressible, so the old
                  seventh-button append for off-list preferences is gone. */}
              <DurationSlider
                testID="sit-length-slider"
                value={durationMinutes}
                onChange={pickDuration}
                onCommit={commitDuration}
              />
              <ChoiceRow
                testID="sit-bell-choices"
                label={t("timer:interval.label")}
                itemClassName="min-w-[68px]"
                options={BELL_CHOICES.map((choice) => ({
                  value: bellChoiceKey(choice),
                  label:
                    choice.kind === "off"
                      ? t("timer:interval.off")
                      : choice.kind === "half"
                        ? t("timer:interval.half")
                        : t("duration.minutes", { count: choice.minutes }),
                }))}
                value={bellKey}
                onChange={pickBell}
              />
              {/* The one lane with no control was the loudest sound in the app
                  (#1188): every bell fired at a hardcoded 1 while both breathing
                  lanes had a slider. It governs all three bells - start, end and
                  interval - not just the interval row above it, which is why the
                  label says "bell" and not "interval bell". 0 is off. */}
              <View className="gap-2" testID="sit-bell-volume">
                <View className="flex-row items-baseline justify-between gap-3">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    {t("timer:bell.volumeLabel")}
                  </Text>
                  <Text className="text-[13px] font-semibold tabular-nums text-foreground">
                    {bellVolume > 0 ? `${Math.round(bellVolume * 100)}%` : t("timer:bell.muted")}
                  </Text>
                </View>
                <VolumeSlider
                  value={bellVolume}
                  onChange={setPickedBellVolume}
                  onCommit={commitBellVolume}
                  accessibilityLabel={t("timer:bell.volumeLabel")}
                />
              </View>
              {/* The bells' non-sound counterpart (#1741): a tap per bell, and per
                  breath phase in the breathing session, for a person who cannot
                  hear the cue or sits with the bells at 0. Opt-in, off by default,
                  a supplement and never required (#777). Native only, so the row
                  is not offered on web at all (docs/accessibility.md). */}
              {Platform.OS !== "web" ? (
                <View className="flex-row items-center gap-4" testID="sit-haptic-cues">
                  <View className="flex-1 gap-1">
                    <Text className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      {t("timer:bell.hapticLabel")}
                    </Text>
                    <Text variant="muted" className="text-[13px]">
                      {t("timer:bell.hapticHint")}
                    </Text>
                  </View>
                  <Switch
                    accessibilityLabel={t("timer:bell.hapticLabel")}
                    accessibilityHint={t("timer:bell.hapticHint")}
                    checked={hapticCues}
                    onCheckedChange={pickHapticCues}
                  />
                </View>
              ) : null}
              {/* A bed under the sit (#1742), beside the bell volume because a
                  lane with no volume control is an accessibility regression, not
                  a follow-up (docs/accessibility.md). The nine breathing beds,
                  named by the breathing keys, but stored as the sit's OWN
                  preference. "None" is the first row and the default, and nothing
                  here says a bed is expected: the volume only appears once one
                  has been chosen, so the silent default is one row, not two. */}
              <ChoiceRow
                testID="sit-bed-choices"
                label={t("timer:ambient.label")}
                options={AMBIENT_SOUNDS.map((sound) => ({
                  value: sound.id,
                  label: t(`cbt:${sound.labelKey}` as Parameters<typeof t>[0]),
                }))}
                value={bedId}
                onChange={pickBed}
              />
              {bedId !== "none" ? (
                <View className="gap-2" testID="sit-bed-volume">
                  <View className="flex-row items-baseline justify-between gap-3">
                    <Text className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      {t("timer:ambient.volumeLabel")}
                    </Text>
                    <Text className="text-[13px] font-semibold tabular-nums text-foreground">
                      {`${Math.round(bedVolume * 100)}%`}
                    </Text>
                  </View>
                  <VolumeSlider
                    value={bedVolume}
                    onChange={setPickedBedVolume}
                    onCommit={commitBedVolume}
                    accessibilityLabel={t("timer:ambient.volumeLabel")}
                  />
                </View>
              ) : null}
              {/* `lg`, so the screen's primary action clears the 44dp touch
                  floor on a phone - the default button is 40dp tall. The rows
                  above ARE the setup; Begin hands both choices to the sitting
                  screen (#786), which owns the clock from there. */}
              <Button
                size="lg"
                onPress={() =>
                  pushWithOrigin({
                    pathname: "/tools/meditation/session",
                    params: { duration: String(durationMinutes), bell: bellKey },
                  })
                }
                className="self-start px-8"
              >
                <Text>{t("module.home.begin")}</Text>
              </Button>
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
                  onPress={() => pushWithOrigin("/tools/meditation/stages")}
                />
                <PracticeRow
                  icon="menu-book"
                  title={t("module.learn.title")}
                  subtitle={t("module.learn.subtitle")}
                  onPress={() => pushWithOrigin("/tools/meditation/learn")}
                  ruled
                />
                <PracticeRow
                  icon="self-improvement"
                  title={t("practices.sectionLabel")}
                  subtitle={t("module.home.practicesRowSubtitle")}
                  onPress={() => pushWithOrigin("/tools/meditation/practices")}
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

            {currentStage === 10 ? (
              <Section title={t("module.dailyLife.title")}>
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
                    onPress={openSessions}
                    className="flex-row items-center gap-1 active:opacity-70"
                    role="link"
                    {...enterKeyActivationProps(openSessions)}
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

            {/* Gated on sits in the window, not on lifetime history: a card
                about the last thirty days has nothing to say when they were
                empty, and an empty Section would still draw its hairline. */}
            {windowSessions && windowInsights.sessionCount > 0 ? (
              <Section>
                <MeditationInsightsCard
                  insights={windowInsights}
                  windowDays={MINUTES_WINDOW_DAYS}
                />
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
  value: string;
  label: string;
}

interface ChoiceRowProps {
  label: string;
  options: ChoiceOption[];
  value: string;
  onChange: (value: string) => void;
  /** Per-button minimum width, which is what decides where the row wraps. */
  itemClassName?: string;
  /** On the group, so a test can scope to it - the two rows share labels like `5 min`. */
  testID?: string;
}

/**
 * One pick from a run of named choices - the interval bell. (The sit's length
 * used this row too until #930 gave it back its per-minute slider.)
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
  const pushWithOrigin = usePushWithOrigin();
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
        pushWithOrigin({ pathname: "/tools/meditation/sessions/[id]", params: { id: session.id } })
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
