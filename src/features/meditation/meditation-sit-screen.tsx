import { router, useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { FocusSessionShell } from "@/src/components/app/focus-session-shell";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { ScreenTopBar } from "@/src/components/app/screen-top-bar";
import { ChipRun, SelectableChip } from "@/src/components/app/selectable-chip";
import { formatClock } from "@/src/features/breathing/cycle-math";
import {
  useMeditationProgramState,
  useSaveMeditationSession,
  useUpdateMeditationSessionReflection,
} from "@/src/features/meditation/queries";
import type {
  MeditationObstacleTag,
  MeditationSession,
  StageNumber,
} from "@/src/features/meditation/types";
import { cn } from "@/lib/utils";
import { announceMessage } from "@/src/lib/accessibility";
import { FORM_COLUMN } from "@/src/lib/layout";
import { playOneShot, prepareOneShot, type PreparedOneShot } from "@/src/lib/native-audio";
import { occurrenceTimeFromDate } from "@/src/lib/occurrence-time";
import { useUserPreferences } from "@/src/features/settings/queries";
import { bellChoiceFromKey, bellSecondsFor } from "@/src/features/meditation/interval";
import { useAccentHsl, useThemeHex } from "@/src/lib/theme-palette";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

type SitPhase = "sitting" | "after";
/** Where a finished sit goes: into the reflection, or straight out. */
type SitExit = "after" | "leave";

const TICK_MS = 250;
const DEFAULT_DURATION_MINUTES = 12;
const MAX_DURATION_MINUTES = 180;
// The design's focal element: a 220px ring, 2px stroke, countdown in the centre.
// At the 360dp floor the content column is 312px, so it fits without scaling.
const RING_SIZE = 220;
const RING_RADIUS = 100;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// #1130 replaced both placeholders with the Round A ElevenLabs masters, encoded to
// .m4a like the rest of the set. ⚠️ `interval-temple-block` ships 2.85 LU under the
// -23 #1139 asked for: its only take peaks at -0.63 dBTP, so it can only be
// attenuated to reach the ceiling. Recorded rather than hidden.
const bellSound = require("@/assets/sounds/meditation-bell.m4a") as number;
const intervalSound = require("@/assets/sounds/interval-temple-block.m4a") as number;

/**
 * The bells one sit rings, each loaded ahead of its moment (#1744). A slot is
 * `null` once its bell has rung - or, for the interval bell, reloaded behind the
 * ring, because the next one is due a spacing later.
 */
type BellSlot = "opening" | "end" | "interval";
type SitBells = Record<BellSlot, PreparedOneShot | null>;
const BELL_ASSETS: Record<BellSlot, number> = {
  opening: bellSound,
  end: bellSound,
  interval: intervalSound,
};

/**
 * The reflection's five chips, fixed as `7b` draws them - not the per-stage
 * obstacle list the old form offered. All five are existing `obstacle_tags`
 * values, which is what lets the reflection persist without a schema change.
 */
const PULL_TAGS: readonly MeditationObstacleTag[] = [
  "resistance",
  "fatigue",
  "impatience",
  "boredom",
  "mindWandering",
];

/** A positive whole-minute route param, or the fallback - deep links can supply anything. */
function safeMinutes(raw: string | undefined, fallback: number, max: number): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > max) return fallback;
  return n;
}

/**
 * Screen `7b` (#786): the sit timer on the shared focus shell, then the
 * reflection that is three optional taps rather than a form.
 *
 * The two panels the design draws side by side are two sequential states of one
 * flow - `sitting` and `after` - so they are two renders of this one screen.
 *
 * What carries the timer across backgrounding: a wall-clock anchor. The start
 * instant lives in a ref and every tick recomputes elapsed time from the
 * current clock, so a JS interval that is throttled or suspended for the whole
 * sit resumes exact the moment the app foregrounds. The interval is cadence
 * only, never the source of time. (What it cannot carry is sound: a bell due
 * while the app is suspended on native rings on return, not on time - the same
 * limit the widget this replaces had.)
 *
 * The sit is RECORDED the moment it finishes - early or in full - before the
 * reflection is offered. "Saved already" is guardrail copy, and the code has to
 * make it true: `Skip` navigates away from a row that already exists, and the
 * reflection is an UPDATE of that row.
 */
export function MeditationSitScreen() {
  const { t } = useTranslation("meditation");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const navigation = useNavigation();
  const showToast = useToastStore((state) => state.showToast);
  const params = useLocalSearchParams<{ duration?: string; bell?: string }>();
  const { data: preferences } = useUserPreferences(userId);

  const durationMinutes = safeMinutes(
    params.duration,
    DEFAULT_DURATION_MINUTES,
    MAX_DURATION_MINUTES,
  );
  const totalSeconds = durationMinutes * 60;
  // `half` cannot travel as a minute count - half of a 25-minute sit is 12.5,
  // which the integer param would drop on the floor (#1189). It travels as a
  // key instead, and only becomes a number here, where the length is known.
  // The "a spacing at or past the whole length never rings" rule moved into
  // bellSecondsFor with it.
  const bellChoice = bellChoiceFromKey(params.bell);
  const bellSeconds = bellSecondsFor(bellChoice, totalSeconds);

  const { data: programState, isFetched, isError } = useMeditationProgramState(userId);
  const currentStage: StageNumber = (programState?.currentStage ?? 1) as StageNumber;
  // No save may run before this settles: a stage 2-10 user reopening the app
  // onto a sit that ran out in the background would otherwise race the query
  // and permanently record `stage_at_session = 1` (Codex P2 on #850). A settled
  // error still saves - stage 1 is then the best available answer, and holding
  // a finished sit hostage to a failing query would be worse.
  const stageSettled = isFetched || isError;
  // The ticking effect subscribes once per phase and calls finishSit through a
  // stale closure; the stage it saves must be the stage at SAVE time, not at
  // subscribe time - program state usually loads a beat after mount.
  const stageRef = useRef(currentStage);
  useEffect(() => {
    stageRef.current = currentStage;
  }, [currentStage]);

  const saveMutation = useSaveMeditationSession(userId);
  const updateMutation = useUpdateMeditationSessionReflection(userId);

  const [phase, setPhase] = useState<SitPhase>("sitting");
  // True exactly while this screen holds navigation focus. The ticking effect
  // keys on it: a transient blur (a route pushed above a still-mounted screen)
  // clears the interval via the focus cleanup, and without this flag nothing
  // would ever resubscribe it - phase and paused are unchanged on refocus, so
  // the countdown would come back frozen (Codex P2 on #850).
  const [focused, setFocused] = useState(false);
  const [paused, setPaused] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  // A finish that has been asked for - by the clock running out, the Finish
  // early button, or the exit dialog - but may not have run yet: saving waits
  // for the stage query to settle, and the effect below fires when both hold.
  const [finishRequested, setFinishRequested] = useState<SitExit | null>(null);
  const [savedSession, setSavedSession] = useState<MeditationSession | null>(null);
  const [pulls, setPulls] = useState<MeditationObstacleTag[]>([]);
  const [note, setNote] = useState("");

  // The one session clock. Controls act only once it exists (#848's preroll
  // lesson): before beginSit() sets it there is nothing true to save.
  const startMsRef = useRef(0);
  // Non-zero exactly while paused; both the tick and the save path read it so
  // they measure the same paused-aware elapsed time.
  const pausedAtMsRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishingRef = useRef(false);
  // How many whole bell intervals have already sounded (or been skipped). Seeded
  // instead of replayed after a background stretch: three missed bells on
  // foreground would be noise, not timekeeping.
  const bellCountRef = useRef(0);
  // Bell volume rides a ref, not the closure: the tick and the focus effect are
  // created once per sit, so a value read directly would be the one that
  // happened to be loaded at the time - and the preferences query resolves
  // after first paint. 1 until it arrives, which is the pre-#1188 behaviour.
  const bellVolumeRef = useRef(1);
  useEffect(() => {
    bellVolumeRef.current = preferences?.bellVolume ?? 1;
  }, [preferences?.bellVolume]);
  // The bells this sit will ring are LOADED here, on mount, not at their moments
  // (#1744): `playOneShot` builds its player when the bell is due, and the opening
  // bell - fired the instant the sit starts, in the focus effect below - arrived
  // late by the asset load. Declared ABOVE that focus effect on purpose: effects
  // run in order, so the players exist before the start bell asks for one. The
  // opening and end bells are the same asset, prepared twice; the interval bell
  // only when a spacing is set. Whatever never rang is let go with the sit.
  // Off stays off: at 0 nothing is built, so a user who muted the bells never
  // has the global audio session configured on their behalf (#1188). The
  // moment's volume is still read from `bellVolumeRef` when a bell rings.
  const bellsOn = (preferences?.bellVolume ?? 1) > 0;
  const bellsRef = useRef<SitBells | null>(null);
  useEffect(() => {
    if (!bellsOn || phase !== "sitting") return;
    const bells: SitBells = {
      opening: prepareOneShot(BELL_ASSETS.opening),
      end: prepareOneShot(BELL_ASSETS.end),
      interval: bellSeconds > 0 ? prepareOneShot(BELL_ASSETS.interval) : null,
    };
    bellsRef.current = bells;
    return () => {
      bellsRef.current = null;
      for (const bell of Object.values(bells)) bell?.release();
    };
  }, [bellsOn, bellSeconds, phase]);
  const ring = (slot: BellSlot) => {
    const asset = BELL_ASSETS[slot];
    const volume = bellVolumeRef.current;
    const bells = bellsRef.current;
    const prepared = bells?.[slot];
    if (!bells || !prepared) {
      // Not loaded ahead: the bells are off (nothing plays at 0), or a refocus
      // restarted the sit after its opening bell was spent. At the moment, as before.
      playOneShot(asset, volume);
      return;
    }
    prepared.play(volume);
    bells[slot] = slot === "interval" ? prepareOneShot(asset) : null;
  };
  // The end bell and the finish request fire once per sit: a pause/resume while
  // the finish waits on the stage query resubscribes the tick, and an unguarded
  // completion branch would ring the end bell again.
  const completionRef = useRef(false);

  const elapsedNow = () => ((pausedAtMsRef.current || Date.now()) - startMsRef.current) / 1000;

  /**
   * Record the sit. `completed` is derived from the clock, not from who called:
   * a sit that ran out while backgrounded is complete even though the tick that
   * notices runs minutes later - and its occurrence instant is the moment the
   * timer actually reached zero, not the moment the app was reopened.
   */
  const finishSit = async (exit: SitExit) => {
    if (!startMsRef.current) return;
    if (finishingRef.current) return;
    finishingRef.current = true;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const elapsed = elapsedNow();
    const completed = elapsed >= totalSeconds;
    const endedAt = completed ? new Date(startMsRef.current + totalSeconds * 1000) : new Date();
    const recordedMinutes = completed
      ? durationMinutes
      : Math.max(1, Math.round(Math.min(elapsed, totalSeconds) / 60));
    try {
      const session = await saveMutation.mutateAsync({
        stageAtSession: stageRef.current,
        durationMinutes: recordedMinutes,
        occurredAt: occurrenceTimeFromDate(endedAt),
        reflection: "",
        obstacleTags: [],
        mindWanderingEpisodes: null,
        dullnessLevel: null,
        distractionLevel: null,
        moodAfter: null,
        techniqueUsed: null,
      });
      if (exit === "leave") {
        router.replace("/tools/meditation");
        return;
      }
      setSavedSession(session);
      setPhase("after");
      announceMessage(t("sit.after.title", { count: session.durationMinutes }));
    } catch {
      // The sit is NOT recorded; un-finish so Pause / Finish early can retry.
      // The request state clears too - a retry must be a fresh transition or
      // the effect below would never re-fire for it.
      finishingRef.current = false;
      setFinishRequested(null);
      showToast({ title: t("common:feedback.problem"), tone: "error" });
    }
  };

  // Runs the requested finish once the stage is settled. Reactive rather than
  // ref-driven on purpose: the query resolving is a render, and a background-
  // completed sit whose request arrived first must save the moment it lands.
  useEffect(() => {
    if (!finishRequested || !stageSettled) return;
    void finishSit(finishRequested);
    // finishSit reads its inputs via refs; the request and the gate are the deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finishRequested, stageSettled]);

  const pauseSession = useCallback(() => {
    if (pausedAtMsRef.current) return;
    pausedAtMsRef.current = Date.now();
    setPaused(true);
  }, []);

  const resumeSession = () => {
    if (!pausedAtMsRef.current) return;
    // Shift the anchor by the paused stretch so the clock resumes where it stopped.
    startMsRef.current += Date.now() - pausedAtMsRef.current;
    pausedAtMsRef.current = 0;
    setPaused(false);
  };

  useEffect(() => {
    if (phase !== "sitting" || paused || !focused) return;

    const tick = () => {
      if (!startMsRef.current || finishingRef.current) return;
      const elapsed = elapsedNow();
      setSecondsLeft(Math.max(0, Math.ceil(totalSeconds - elapsed)));

      if (elapsed >= totalSeconds) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        if (!completionRef.current) {
          completionRef.current = true;
          ring("end");
          setFinishRequested("after");
        }
        return;
      }
      if (bellSeconds > 0) {
        const boundary = Math.floor(elapsed / bellSeconds);
        if (boundary > bellCountRef.current) {
          // Ring only a boundary crossed just now. One crossed minutes ago
          // means the app was suspended over it - that bell's moment has
          // passed, and a late (or stacked) catch-up on foreground is noise,
          // not timekeeping.
          const sinceBoundarySeconds = elapsed - boundary * bellSeconds;
          if (boundary - bellCountRef.current === 1 && sinceBoundarySeconds < 2) {
            ring("interval");
          }
          bellCountRef.current = boundary;
        }
      }
    };

    const id = setInterval(tick, TICK_MS);
    intervalRef.current = id;
    tick();

    return () => {
      clearInterval(id);
      intervalRef.current = null;
    };
    // The tick reads time via refs; re-subscribing every render would stutter the cadence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, paused, focused]);

  // Shell B's Escape (#1256) leaves through `router.replace`, so it lands here
  // with the OS back gesture and the web back button - every uninvited exit
  // passes this guard. Mid-sit they pause the clock and ask (#777) -
  // confirming finishes and saves, then honours the exit rather than detouring
  // through a reflection the user was leaving. Once the sit is recorded the
  // guard stands down: backing out of the reflection is just skipping it.
  useEffect(() => {
    return navigation.addListener("beforeRemove", (event) => {
      if (phase !== "sitting" || finishingRef.current || !startMsRef.current) return;
      event.preventDefault();
      pauseSession();
      setExitDialogOpen(true);
    });
  }, [navigation, phase, pauseSession]);

  // The clock starts when the screen gains focus and dies when it loses it.
  // Navigating away mid-sit through the confirmation above SAVES; exits that
  // never pass through this navigator (sign-out, deep links replacing the
  // stack) discard, exactly as breathing's session does.
  useFocusEffect(
    useCallback(() => {
      startMsRef.current = Date.now();
      pausedAtMsRef.current = 0;
      bellCountRef.current = 0;
      completionRef.current = false;
      finishingRef.current = false;
      ring("opening");
      setFocused(true);
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        startMsRef.current = 0;
        pausedAtMsRef.current = 0;
        bellCountRef.current = 0;
        finishingRef.current = false;
        setFocused(false);
        setPhase("sitting");
        setPaused(false);
        setExitDialogOpen(false);
        setFinishRequested(null);
        setSavedSession(null);
        setPulls([]);
        setNote("");
        setSecondsLeft(totalSeconds);
      };
      // Mount/focus-scoped: the params cannot change under a focused screen.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  if (phase === "after" && savedSession) {
    return (
      <AfterSit
        minutes={savedSession.durationMinutes}
        pulls={pulls}
        onTogglePull={(tag) =>
          setPulls((prev) =>
            prev.includes(tag) ? prev.filter((existing) => existing !== tag) : [...prev, tag],
          )
        }
        note={note}
        onChangeNote={setNote}
        isPending={updateMutation.isPending}
        onSkip={() => router.replace("/tools/meditation")}
        onSave={async () => {
          try {
            await updateMutation.mutateAsync({
              sessionId: savedSession.id,
              patch: { obstacleTags: pulls, reflection: note },
            });
            router.replace("/tools/meditation");
          } catch {
            showToast({ title: t("common:feedback.problem"), tone: "error" });
          }
        }}
      />
    );
  }

  return (
    <FocusSessionShell eyebrow={t("sit.eyebrow", { stage: currentStage })}>
      <View className="grow items-center justify-center py-8">
        <SitRing
          secondsLeft={secondsLeft}
          totalSeconds={totalSeconds}
          subline={
            paused
              ? t("sit.paused")
              : bellSeconds <= 0
                ? t("sit.progress", { minutes: durationMinutes })
                : bellChoice.kind === "half"
                  ? t("sit.progressWithHalfBell", { minutes: durationMinutes })
                  : t("sit.progressWithBell", {
                      minutes: durationMinutes,
                      bell: bellSeconds / 60,
                    })
          }
        />
      </View>

      <View className="flex-row items-center justify-center gap-2 pb-1 pt-6">
        <Button onPress={paused ? resumeSession : pauseSession} variant="outline">
          <Icon className="size-[18px] text-foreground" name={paused ? "play-arrow" : "pause"} />
          <Text>{paused ? t("sit.resume") : t("sit.pause")}</Text>
        </Button>
        <Button
          disabled={saveMutation.isPending}
          onPress={() => setFinishRequested("after")}
          variant="ghost"
        >
          <Text>{t("sit.finishEarly")}</Text>
        </Button>
      </View>

      <ConfirmDialog
        cancelLabel={t("sit.exit.cancel")}
        confirmLabel={t("sit.exit.confirm")}
        destructive={false}
        isPending={saveMutation.isPending}
        message={t("sit.exit.message")}
        onCancel={() => {
          setExitDialogOpen(false);
          resumeSession();
        }}
        onConfirm={() => {
          setExitDialogOpen(false);
          setFinishRequested("leave");
        }}
        title={t("sit.exit.title")}
        visible={exitDialogOpen}
      />
    </FocusSessionShell>
  );
}

/**
 * The 220px countdown ring. A progress indicator, not a pacer (#786): it
 * carries no instruction, so it never tweens - the arc steps with the same
 * once-a-second state the countdown text renders, which is also exactly the
 * reduce-motion behaviour, so both modes share one code path.
 *
 * Colours come through the theme helpers, never literals: the arc is the active
 * style's accent (the same accent the shell's wash derives from - a module hue
 * here would make the hue identity, which #691 rules out), the track the
 * muted foreground at low alpha. test/theme-token-sync.test.ts holds this file
 * to zero raw colour literals, the tripwire #310 earned.
 */
function SitRing({
  secondsLeft,
  totalSeconds,
  subline,
}: {
  secondsLeft: number;
  totalSeconds: number;
  subline: string;
}) {
  const accent = useAccentHsl();
  const trackHex = useThemeHex("--muted-foreground");
  // The arc shows what REMAINS and drains as the sit runs - `7b` draws 70% of
  // the ring for a countdown reading 08:24 of 12 min.
  const remainingFraction = totalSeconds > 0 ? Math.min(1, secondsLeft / totalSeconds) : 0;

  return (
    <View
      className="items-center justify-center"
      style={{ width: RING_SIZE, height: RING_SIZE }}
      testID="sit-ring"
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      >
        <Svg
          width={RING_SIZE}
          height={RING_SIZE}
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          style={{ transform: [{ rotate: "-90deg" }] }}
        >
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke={trackHex}
            strokeOpacity={0.18}
            strokeWidth={2}
          />
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke={accent(1)}
            strokeLinecap="round"
            strokeWidth={2}
            strokeDasharray={`${RING_CIRCUMFERENCE}`}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - remainingFraction)}
          />
        </Svg>
      </View>
      <View className="items-center gap-1">
        {/* The countdown is deliberately NOT a live region - announcing every
            second would bury a screen reader; the phase changes announce. */}
        <Text className="text-[40px] font-bold tracking-tight tabular-nums">
          {formatClock(secondsLeft)}
        </Text>
        <Text variant="muted" className="text-[13px] tabular-nums">
          {subline}
        </Text>
      </View>
    </View>
  );
}

/**
 * The reflection, already saved behind it. Three optional taps, a note, and two
 * ways out that both leave the recorded sit intact.
 *
 * Chips are `SelectableChip` - accent ink on a 10% tint - never the design's
 * raw iris-on-iris-tint, the shape #368 measured under AA. The steadiness scale
 * `7b` draws is absent: `meditation_sessions` has no column that can carry it,
 * and a new health-adjacent field needs feature-level justification, not a
 * design slice - see the follow-up issue linked from #786.
 */
function AfterSit({
  minutes,
  pulls,
  onTogglePull,
  note,
  onChangeNote,
  isPending,
  onSkip,
  onSave,
}: {
  minutes: number;
  pulls: MeditationObstacleTag[];
  onTogglePull: (tag: MeditationObstacleTag) => void;
  note: string;
  onChangeNote: (value: string) => void;
  isPending: boolean;
  onSkip: () => void;
  onSave: () => void;
}) {
  const { t } = useTranslation("meditation");

  return (
    <View className="flex-1" testID="meditation-sit-after-room">
      <MobileFormScreen
        contentClassName={cn(FORM_COLUMN, "gap-6")}
        // The sit itself escapes through `FocusSessionShell`; this after-sit
        // form is a separate return that carried no chrome, so the only ways
        // off it were its own Skip and Save buttons - "some pressable" rather
        // than the Escape, which is the widening G4 forbids (#1328).
        topBar={<ScreenTopBar />}
        footer={
          <View className={cn(FORM_COLUMN, "flex-row items-center justify-between gap-3")}>
            <Button disabled={isPending} onPress={onSkip} variant="ghost">
              <Text>{t("sit.after.skip")}</Text>
            </Button>
            <Button disabled={isPending} onPress={onSave}>
              <Text>{t("sit.after.save")}</Text>
            </Button>
          </View>
        }
      >
        <View className="gap-1.5 pt-4">
          <Text className="text-xl font-bold tracking-tight" role="heading" aria-level={1}>
            {t("sit.after.title", { count: minutes })}
          </Text>
          {/* Load-bearing guardrail copy: what makes the reflection optional in
              fact, not just in principle. It ships verbatim (#786). */}
          <Text variant="muted" className="text-[13.5px]">
            {t("sit.after.saved")}
          </Text>
        </View>

        <View className="gap-3 border-t border-border pt-5">
          <Text className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {t("sit.after.pulledLabel")}
          </Text>
          <ChipRun>
            {PULL_TAGS.map((tag) => (
              <SelectableChip
                key={tag}
                label={t(`module.obstacles.${tag}`)}
                selected={pulls.includes(tag)}
                onToggle={() => onTogglePull(tag)}
                testID={`sit-pull-${tag}`}
              />
            ))}
          </ChipRun>
        </View>

        <View className="gap-2">
          <Textarea
            value={note}
            onChangeText={onChangeNote}
            placeholder={t("sit.after.notePlaceholder")}
            accessibilityLabel={t("sit.after.notePlaceholder")}
            numberOfLines={3}
          />
        </View>
      </MobileFormScreen>
    </View>
  );
}
