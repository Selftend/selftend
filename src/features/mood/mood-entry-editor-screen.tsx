import { router, useLocalSearchParams, type Href } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { ScreenTopBar } from "@/src/components/app/screen-top-bar";
import { FORM_COLUMN } from "@/src/lib/layout";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { CrisisSupportBar } from "@/src/components/app/crisis-support-bar";
import { LoadingState } from "@/src/components/app/screen-state";
import { MoodScale } from "@/src/components/app/mood-scale";
import { ChipRun, SelectableChip } from "@/src/components/app/selectable-chip";
import { DateTimeField } from "@/src/components/app/date-time-field";
import { cn } from "@/lib/utils";
import { useRoomStyle } from "@/src/lib/use-room-style";
import {
  announceMessage,
  DEFAULT_INTERACTIVE_HIT_SLOP,
  politeLiveRegionProps,
  spaceKeyActivationProps,
} from "@/src/lib/accessibility";
import { useSingleFlight } from "@/src/lib/use-single-flight";
import { occurrenceTimeFromDate, type CapturedOffsetMinutes } from "@/src/lib/occurrence-time";
import { formatInstantAtOffset } from "@/src/utils/date";
import { parseBodyChips, toggleBodyChip } from "@/src/features/mood/body-sensations";
import { useCompleteActivity } from "@/src/features/activities/queries";
import { useMoodLog, useMoodLogs, useSaveMoodLog } from "@/src/features/mood/queries";
import { consumeMoodSeed } from "@/src/stores/mood-seed-store";
import { ManageEmotionsModal } from "@/src/features/mood/manage-emotions-modal";
import { seedEmotionsForThoughtRecord } from "@/src/features/mood/thought-record-handoff";
import { seedThoughtRecord } from "@/src/stores/thought-record-seed-store";
import { type EmotionDisplay, useEmotionDisplay } from "@/src/features/mood/use-emotion-display";
import type { MoodLog } from "@/src/features/mood/types";
import { useSession } from "@/src/providers/session-provider";

const BODY_CHIP_KEYS = [
  "chestTight",
  "shoulders",
  "jaw",
  "stomach",
  "restless",
  "heavy",
  "warm",
  "tired",
] as const;

interface MoodEntryEditorScreenProps {
  fallbackHref: Href;
  mode: "create" | "edit";
  moodId?: string | null;
}

interface InheritedDeeperFields {
  situation: boolean;
  thoughts: boolean;
  behaviours: boolean;
  bodilySensations: boolean;
}

const NO_INHERITED: InheritedDeeperFields = {
  situation: false,
  thoughts: false,
  behaviours: false,
  bodilySensations: false,
};

function hasInheritedField(fields: InheritedDeeperFields) {
  return fields.situation || fields.thoughts || fields.behaviours || fields.bodilySensations;
}

function paramValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * One flat run of chips, in the order the USER set (#738, decided on #699).
 *
 * Not two valence groups: `emotion_preferences` carries a `position` column, an
 * index on it, an `ORDER BY` that reads it, and an entire manage-emotions screen
 * built to reorder it. Grouping by valence would quietly overrule all of that -
 * drag order would only sort *within* a group - and custom emotions have no
 * valence column to group by at all. Between a taxonomy the system imposes and
 * an order the user set on purpose, the user's order wins.
 *
 * `allEmotions` already arrives sorted by `position` with custom rows inline, so
 * this renders it as-is rather than re-sorting or partitioning.
 *
 * Memoized so it re-renders only when the emotion list or the selection changes - not on
 * every keystroke in the notes / four-box text fields, which re-render the parent screen.
 */
const EmotionGrid = memo(function EmotionGrid({
  emotions,
  selectedIds,
  onToggle,
}: {
  emotions: EmotionDisplay[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <ChipRun>
      {emotions.map((emotion) => (
        <SelectableChip
          key={emotion.id}
          emoji={emotion.emoji}
          label={emotion.name}
          onToggle={() => onToggle(emotion.id)}
          selected={selectedIds.includes(emotion.id)}
        />
      ))}
    </ChipRun>
  );
});

/**
 * The design language's section eyebrow — 11px, 600, 0.1em-tracked uppercase —
 * with the quieter "— optional" tail rendered in normal case (design `2b`).
 * Replaces the sentence-case bold `Label`s the old shell used (#869).
 */
function SectionEyebrow({ title, optionalTag }: { title: string; optionalTag?: string }) {
  return (
    <Text className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
      {title}
      {optionalTag ? (
        <Text className="text-[11px] font-medium normal-case tracking-normal text-muted-foreground/75">
          {" — "}
          {optionalTag}
        </Text>
      ) : null}
    </Text>
  );
}

export function MoodEntryEditorScreen({
  fallbackHref,
  mode,
  moodId = null,
}: MoodEntryEditorScreenProps) {
  const { t } = useTranslation("cbt");
  const { t: tMood } = useTranslation("mood");
  const roomStyle = useRoomStyle("be");
  const { user } = useSession();
  const params = useLocalSearchParams<{
    completeActivityId?: string | string[];
    linkedStrategy?: string | string[];
    score?: string | string[];
  }>();
  const linkedStrategy = paramValue(params.linkedStrategy) ?? null;
  const completeActivityId = paramValue(params.completeActivityId) ?? null;
  /**
   * Home's tap arrives in memory, never in the URL (#952). Consumed once on mount, the
   * same shape `use-thought-record-editor.ts:32` uses for the emotions seed - reading it
   * during render would clear it before the form could apply it.
   */
  const [seededScore] = useState(consumeMoodSeed);
  const rawScore = paramValue(params.score);
  const parsedScore = rawScore != null ? Number(rawScore) : null;
  // The only valid scores are the integers 1-5 (MoodScale steps; DB CHECK 1..5). Reject
  // non-numeric, non-integer, and out-of-range `score` route params, not just NaN.
  //
  // The route param survives for the mood tracker, which still pushes one
  // (`mood-tracker-screen.tsx`); #961 owns retiring that half. The seed wins when both
  // are present, because only a stale link can produce a param the user did not just tap.
  const paramScore =
    parsedScore != null && Number.isInteger(parsedScore) && parsedScore >= 1 && parsedScore <= 5
      ? parsedScore
      : null;
  const initialScore = seededScore ?? paramScore;

  const { data: cachedList } = useMoodLogs(mode === "edit" ? (user?.id ?? null) : null, 30);
  const fromCache = moodId ? (cachedList?.find((log) => log.id === moodId) ?? null) : null;
  const { data: fetched, isLoading } = useMoodLog(
    mode === "edit" && !fromCache ? (user?.id ?? null) : null,
    mode === "edit" && !fromCache ? moodId : null,
  );
  const existingEntry: MoodLog | null = mode === "edit" ? (fromCache ?? fetched ?? null) : null;

  const saveMutation = useSaveMoodLog(user?.id ?? null);
  const completeActivityMutation = useCompleteActivity(user?.id ?? null);
  const [moodScore, setMoodScore] = useState<number | null>(initialScore);
  const [emotions, setEmotions] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [loggedAt, setLoggedAt] = useState<string>(() => new Date().toISOString());
  const [loggedOffsetMinutes, setLoggedOffsetMinutes] = useState<CapturedOffsetMinutes>(
    () => occurrenceTimeFromDate().occurredOffsetMinutes,
  );
  const [error, setError] = useState("");
  const [scoreError, setScoreError] = useState("");
  const scoreSectionRef = useRef<View>(null);
  const [situation, setSituation] = useState("");
  const [thoughts, setThoughts] = useState("");
  const [behaviours, setBehaviours] = useState("");
  const [bodilySensations, setBodilySensations] = useState("");
  // Which of the four CBT fields this entry ALREADY held when it loaded (#739, decided
  // on #698). Captured once at hydration rather than read from live state, so clearing a
  // field mid-edit doesn't yank its own input out from under the cursor.
  const [inheritedFields, setInheritedFields] = useState<InheritedDeeperFields>(NO_INHERITED);
  const [showDeeper, setShowDeeper] = useState(false);
  const [manageEmotionsOpen, setManageEmotionsOpen] = useState(false);
  const editMode = mode === "edit";
  const saving = saveMutation.isPending || completeActivityMutation.isPending;
  const { allEmotions, isLoading: emotionsLoading } = useEmotionDisplay();

  // Hydrate local field state from the saved entry ONCE per entry id. Keying on the id
  // (not the object) stops a later list/detail refetch - which produces a new object
  // identity - from clobbering the user's in-progress edits mid-session.
  const hydratedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!existingEntry) return;
    if (hydratedIdRef.current === existingEntry.id) return;
    hydratedIdRef.current = existingEntry.id;

    setMoodScore(existingEntry.moodScore);
    setEmotions(existingEntry.emotions);
    setNotes(existingEntry.notes);
    setLoggedAt(existingEntry.loggedAt);
    // Carry a missing offset through as null rather than deriving one from this
    // device: an entry whose origin was never recorded must not be re-stamped
    // with wherever the user happens to be while fixing a typo (#250).
    setLoggedOffsetMinutes(existingEntry.loggedOffsetMinutes ?? null);
    setSituation(existingEntry.situation);
    setThoughts(existingEntry.thoughts);
    setBehaviours(existingEntry.behaviours);
    setBodilySensations(existingEntry.bodilySensations);
    const inherited: InheritedDeeperFields = {
      situation: existingEntry.situation.length > 0,
      thoughts: existingEntry.thoughts.length > 0,
      behaviours: existingEntry.behaviours.length > 0,
      bodilySensations: existingEntry.bodilySensations.length > 0,
    };
    setInheritedFields(inherited);
    // Auto-open only when there is inherited reflection to see. An entry with none gets
    // the same collapsed invitation a new check-in gets.
    setShowDeeper(hasInheritedField(inherited));
    setError("");
  }, [existingEntry]);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  };

  const handleSave = useSingleFlight(async () => {
    if (!user) return;
    if (!moodScore) {
      const message = tMood("checkin.scoreRequired");
      setScoreError(message);
      announceMessage(message);
      // The score row isn't focusable, so scroll it (and the error) into view on
      // web; native keeps the announcement only.
      const node = scoreSectionRef.current as unknown as {
        scrollIntoView?: (options: { block: "center" }) => void;
      } | null;
      if (node && typeof node.scrollIntoView === "function") {
        node.scrollIntoView({ block: "center" });
      }
      return;
    }
    setScoreError("");
    setError("");
    try {
      const saved = await saveMutation.mutateAsync({
        input: {
          moodScore,
          emotions,
          notes,
          linkedStrategy: linkedStrategy ?? existingEntry?.linkedStrategy ?? null,
          loggedAt,
          loggedOffsetMinutes,
          situation,
          thoughts,
          behaviours,
          bodilySensations,
        },
        moodLogId: editMode ? (moodId ?? undefined) : undefined,
      });

      if (completeActivityId) {
        await completeActivityMutation.mutateAsync({
          activityId: completeActivityId,
          moodAfter: moodScore,
        });
        router.replace(
          `/modules/cbt/activities/${completeActivityId}` as Parameters<typeof router.replace>[0],
        );
        return;
      }

      router.replace(`/tools/check-in/${saved.id}` as Parameters<typeof router.replace>[0]);
    } catch (e) {
      const message = e instanceof Error ? e.message : t("mood.saveError");
      setError(message);
      // The error renders next to the footer's Save button (a polite live
      // region on web); announce for native screen readers too.
      announceMessage(message);
    }
  });

  // Stable so the memoized EmotionGrid isn't re-rendered while the user types in the
  // notes / four-box fields (those keystrokes re-render the screen, not the grid).
  const toggleEmotion = useCallback((emotion: string) => {
    setEmotions((prev) =>
      prev.includes(emotion) ? prev.filter((e) => e !== emotion) : [...prev, emotion],
    );
  }, []);

  // Parse the body-chip CSV once per render instead of inside the chip map (N times).
  const selectedBodyChips = parseBodyChips(bodilySensations);

  /**
   * `push`, never `replace`: the check-in the user is part-way through must survive the
   * detour. The thought record is an invitation, and an invitation you cannot back out of
   * without losing your work is a trap.
   *
   * The seed goes through a store rather than a route param. A param would put the
   * user's emotions in the web address bar, browser history and Sentry's navigation
   * breadcrumbs - see `thought-record-seed-store.ts`. Emotions are the only thing
   * carried; see `thought-record-handoff.ts` for why the note is not mapped to
   * `situation`.
   */
  const openThoughtRecord = () => {
    seedThoughtRecord(seedEmotionsForThoughtRecord(emotions));
    router.push("/modules/cbt/new");
  };

  if (editMode && !fromCache && isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" style={roomStyle}>
        <View className="flex-1 justify-center">
          <LoadingState title={t("mood.editTitle")} />
        </View>
      </SafeAreaView>
    );
  }

  if (editMode && !existingEntry) {
    return (
      <SafeAreaView
        className="flex-1 bg-background"
        edges={["bottom", "left", "right"]}
        style={roomStyle}
      >
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <ScreenHeader title={t("mood.editTitle")} />
            <Text variant="muted">{t("mood.notFound")}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const showBreathingNudge = moodScore !== null && moodScore <= 2;

  return (
    // The room wrapper carries the token re-pour; MobileFormScreen's own
    // bg-background surfaces re-resolve to the rose pour through it.
    <View className="flex-1" style={roomStyle}>
      <MobileFormScreen
        contentClassName={cn(FORM_COLUMN, "gap-6")}
        // Both modes now, where only create mode had chrome: an edit form used to
        // open with no header at all above its fields (#733).
        topBar={<ScreenTopBar leading="close" />}
        footer={
          <View className={cn(FORM_COLUMN, "gap-3")}>
            {/* The save-failure error lives WITH the pinned Save button: a user
              saving from the footer while scrolled must see it without hunting
              through the content column. */}
            {error ? (
              <Text className="text-sm text-destructive" {...politeLiveRegionProps()}>
                {error}
              </Text>
            ) : null}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button onPress={goBack} variant="ghost">
                  <Text>{t("mood.cancel")}</Text>
                </Button>
              </View>
              <View className="flex-1">
                <Button disabled={saving || !user} onPress={() => void handleSave()}>
                  {saving ? <ActivityIndicator color="#ffffff" /> : null}
                  <Text>{editMode ? t("mood.update") : t("mood.save")}</Text>
                </Button>
              </View>
            </View>
          </View>
        }
      >
        {/* No breadcrumb eyebrow above the heading (design `2b`): the bar above
            carries the trail, so a ScreenHeader here would render it twice.
            Centred, with the date-and-time line under it — the tagline died
            with the old shell (#869). The line reads `loggedAt` in its captured
            frame, so it tracks a schedule change below. */}
        <View className="items-center gap-1.5">
          <Text variant="h1" className="text-center">
            {editMode ? t("mood.editTitle") : tMood("checkin.title")}
          </Text>
          <Text variant="muted" className="text-center text-sm">
            {formatInstantAtOffset(loggedAt, loggedOffsetMinutes, {
              weekday: "long",
              day: "numeric",
              month: "long",
              hour: "numeric",
              minute: "2-digit",
            })}
          </Text>
        </View>

        {/* Create only (#906, scoping #882): a fresh check-in is the moment a user
            may be in distress; editing an old entry is curation. The row stays the
            first element above the scale on create (#692), and stays on the other
            nine consumers. */}
        {!editMode && <CrisisSupportBar />}

        {/* The bare centred scale between hairlines (design `2b`): no label
            block, no helper — the post-selection caption is the selected
            label's confirmation (`Good · 4 of 5`). */}
        <View ref={scoreSectionRef} className="gap-4 border-y border-border py-6">
          <MoodScale
            value={moodScore}
            onChange={(score) => {
              setMoodScore(score);
              setScoreError("");
            }}
          />
          <View className="min-h-[22px] flex-row flex-wrap items-baseline justify-center gap-x-2">
            {moodScore !== null ? (
              <>
                <Text className="text-[15px] font-semibold text-primary-ink">
                  {tMood(`checkin.scaleLabels.${moodScore}`)}
                </Text>
                <Text variant="muted" className="text-[13px] tabular-nums">
                  {tMood("checkin.scoreOutOf", { score: moodScore })}
                </Text>
              </>
            ) : null}
          </View>
          {scoreError ? (
            <Text className="text-center text-sm text-destructive" {...politeLiveRegionProps()}>
              {scoreError}
            </Text>
          ) : null}
        </View>

        {/* An accented single-line hairline row, not a card (#869): glyph, one
            line of copy, the accent-ink link — the old card headline died with
            the card. */}
        {showBreathingNudge ? (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: "/tools/breathing/session",
                params: { pattern: "box-breathing" },
              })
            }
            className="flex-row items-center gap-3 border-y border-border py-3.5 active:opacity-70"
          >
            <Icon name="air" className="size-5 text-primary-ink" />
            <Text className="flex-1 text-[13.5px]">{t("breathing.nudgeDescription")}</Text>
            <Text className="text-[13px] font-semibold text-primary-ink">
              {t("breathing.nudgeButton")} →
            </Text>
          </Pressable>
        ) : null}

        <View className="gap-4">
          <View className="flex-row items-baseline justify-between">
            <SectionEyebrow title={t("mood.emotionsTitle")} optionalTag={t("mood.optionalTag")} />
            <Pressable
              onPress={() => setManageEmotionsOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={tMood("emotions.manage.title")}
            >
              <Text className="text-[12.5px] text-muted-foreground">
                {tMood("emotions.manage.link")}
              </Text>
            </Pressable>
          </View>
          {emotionsLoading ? (
            <ActivityIndicator />
          ) : (
            <EmotionGrid emotions={allEmotions} selectedIds={emotions} onToggle={toggleEmotion} />
          )}
        </View>

        <ManageEmotionsModal
          visible={manageEmotionsOpen}
          onClose={() => setManageEmotionsOpen(false)}
        />

        <View className="gap-2.5">
          <SectionEyebrow title={t("mood.notesTitle")} optionalTag={t("mood.optionalTag")} />
          <Textarea
            accessibilityLabel={t("mood.notesTitle")}
            onChangeText={setNotes}
            placeholder={t("mood.notesPlaceholder")}
            value={notes}
          />
        </View>

        {/* The hairline schedule row (design `2b`, matching 6b's identical
            row) — the boxed input died with the old shell (#869). */}
        <DateTimeField
          appearance="row"
          value={loggedAt}
          offsetMinutes={loggedOffsetMinutes}
          onChange={(next) => {
            setLoggedAt(next);
            // A known offset survives a time correction - the user is restating
            // when, not where. Only an entry with no captured offset picks one
            // up here, from the device now doing the restating.
            setLoggedOffsetMinutes(
              loggedOffsetMinutes ?? occurrenceTimeFromDate(new Date(next)).occurredOffsetMinutes,
            );
          }}
          accessibilityLabel={t("mood.loggedAtLabel")}
        />

        <View className="gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("mood.goDeeperTitle")}
            aria-expanded={showDeeper}
            onPress={() => setShowDeeper((v) => !v)}
            className="flex-row items-center gap-2"
          >
            <Icon
              name={showDeeper ? "expand-less" : "expand-more"}
              className="size-5 text-muted-foreground"
            />
            <Text className="text-sm font-medium">{t("mood.goDeeperTitle")}</Text>
          </Pressable>
          {showDeeper ? (
            // No box. The design's disclosure body is plain text on the background - a
            // bordered panel here would be the one card left on a screen that gave up
            // its cards (#733).
            <View className="gap-4">
              {/* Reflection this entry already holds stays editable, and stays FIRST:
                  the user opened this to reach their own words, not the invitation. The
                  create form no longer offers these fields, but taking them away from an
                  entry that has text would mean deleting the check-in to edit them. */}
              {inheritedFields.situation ? (
                <View className="gap-1.5">
                  <Text className="text-[13px] font-bold">{t("mood.situationLabel")}</Text>
                  <Text variant="muted" className="text-[12px]">
                    {t("mood.situationHelp")}
                  </Text>
                  <Textarea
                    accessibilityLabel={t("mood.situationLabel")}
                    onChangeText={setSituation}
                    placeholder={t("mood.situationPlaceholder")}
                    value={situation}
                  />
                </View>
              ) : null}
              {inheritedFields.thoughts ? (
                <View className="gap-1.5">
                  <Text className="text-[13px] font-bold">{t("mood.thoughtsLabel")}</Text>
                  <Text variant="muted" className="text-[12px]">
                    {t("mood.thoughtsHelp")}
                  </Text>
                  <Textarea
                    accessibilityLabel={t("mood.thoughtsLabel")}
                    onChangeText={setThoughts}
                    placeholder={t("mood.thoughtsPlaceholder")}
                    value={thoughts}
                  />
                </View>
              ) : null}
              {inheritedFields.behaviours ? (
                <View className="gap-1.5">
                  <Text className="text-[13px] font-bold">{t("mood.responseLabel")}</Text>
                  <Text variant="muted" className="text-[12px]">
                    {t("mood.responseHelp")}
                  </Text>
                  <Textarea
                    accessibilityLabel={t("mood.responseLabel")}
                    onChangeText={setBehaviours}
                    placeholder={t("mood.behavioursPlaceholder")}
                    value={behaviours}
                  />
                </View>
              ) : null}
              {inheritedFields.bodilySensations ? (
                <View className="gap-1.5">
                  <Text className="text-[13px] font-bold">{t("mood.bodyLabel")}</Text>
                  <Text variant="muted" className="text-[12px]">
                    {t("mood.bodyHelp")}
                  </Text>
                  <View className="flex-row flex-wrap gap-2 pt-1">
                    {BODY_CHIP_KEYS.map((key) => {
                      const label = t(`mood.bodyChips.${key}`);
                      const selected = selectedBodyChips.includes(label);
                      return (
                        <Pressable
                          key={key}
                          accessibilityRole="checkbox"
                          aria-checked={selected}
                          accessibilityLabel={label}
                          hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                          onPress={() => setBodilySensations((prev) => toggleBodyChip(prev, label))}
                          className={cn(
                            "rounded-full border px-3 py-1.5",
                            selected ? "border-border bg-muted" : "border-border bg-card",
                          )}
                          {...spaceKeyActivationProps(() =>
                            setBodilySensations((prev) => toggleBodyChip(prev, label)),
                          )}
                        >
                          <Text
                            className={cn(
                              "text-[13px]",
                              // Accent ink, not `text-be` (#368/#691): hue encodes data,
                              // not identity, and the published accent measured 3.81:1
                              // through the tint stack this chip used to sit on.
                              selected ? "text-primary-ink font-medium" : "text-foreground",
                            )}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {/* The invitation. This is the one place the product suggests MORE work, so
                  what keeps it an offer is load-bearing - but #963 established that the
                  offer has to come from "you can", not from the product announcing that it
                  will not pressure you. Naming the absent pressure is what puts it in the
                  room (#711). */}
              <View className="gap-2.5">
                <Text variant="muted" className="text-[13px]">
                  {t("mood.goDeeperInvite")}
                </Text>
                <Pressable
                  accessibilityRole="link"
                  onPress={openThoughtRecord}
                  hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                  {...spaceKeyActivationProps(openThoughtRecord)}
                >
                  <Text className="text-[13px] font-semibold text-primary-ink">
                    {t("mood.goDeeperLink")} →
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </MobileFormScreen>
    </View>
  );
}
