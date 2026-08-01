import { router, useLocalSearchParams, type Href } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { ContentSheet } from "@/src/components/app/content-sheet";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { CrisisSupportBar } from "@/src/components/app/crisis-support-bar";
import { LoadingState } from "@/src/components/app/screen-state";
import { MoodScale } from "@/src/components/app/mood-scale";
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
import { parseBodyChips, toggleBodyChip } from "@/src/features/mood/body-sensations";
import { useCompleteActivity } from "@/src/features/activities/queries";
import { useMoodLog, useMoodLogs, useSaveMoodLog } from "@/src/features/mood/queries";
import { ManageEmotionsModal } from "@/src/features/mood/manage-emotions-modal";
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

function paramValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

// Memoized so it re-renders only when the emotion list or the selection changes - not on
// every keystroke in the notes / four-box text fields, which re-render the parent screen.
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
    <View className="flex-row flex-wrap gap-2">
      {emotions.map((emotion) => {
        const selected = selectedIds.includes(emotion.id);
        return (
          <Pressable
            key={emotion.id}
            accessibilityLabel={emotion.name}
            accessibilityRole="checkbox"
            aria-checked={selected}
            onPress={() => onToggle(emotion.id)}
            className={cn(
              "min-w-[72px] items-center gap-1 rounded-2xl border-2 px-2 py-2",
              selected ? "border-primary bg-primary/10" : "border-border bg-card",
            )}
            {...spaceKeyActivationProps(() => onToggle(emotion.id))}
          >
            <Text className="text-2xl">{emotion.emoji}</Text>
            <Text
              className={cn(
                "text-center text-[11px]",
                selected ? "font-semibold text-primary" : "text-muted-foreground",
              )}
              numberOfLines={1}
            >
              {emotion.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});

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
  const rawScore = paramValue(params.score);
  const parsedScore = rawScore != null ? Number(rawScore) : null;
  // The only valid scores are the integers 1-5 (MoodScale steps; DB CHECK 1..5). Reject
  // non-numeric, non-integer, and out-of-range `score` route params, not just NaN.
  const initialScore =
    parsedScore != null && Number.isInteger(parsedScore) && parsedScore >= 1 && parsedScore <= 5
      ? parsedScore
      : null;

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
    setShowDeeper(
      Boolean(
        existingEntry.situation ||
        existingEntry.thoughts ||
        existingEntry.behaviours ||
        existingEntry.bodilySensations,
      ),
    );
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

      router.replace(`/tools/mood-tracker/${saved.id}` as Parameters<typeof router.replace>[0]);
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
        contentClassName="mx-auto w-full max-w-2xl gap-6"
        hero={
          editMode ? undefined : (
            // Create mode gets the field treatment: the full-bleed rose field
            // with the sheet lip rising over it, outside the max-width column.
            <View>
              <ModuleHomeHeader
                variant="field"
                hue="be"
                icon="mood"
                title={tMood("checkin.title")}
                moduleLabel={tMood("checkin.moduleLabel")}
                description={tMood("checkin.tagline")}
              />
              <ContentSheet />
            </View>
          )
        }
        footer={
          <View className="mx-auto w-full max-w-2xl gap-3">
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
        {editMode ? (
          <View className="gap-2">
            <ScreenHeader title={t("mood.editTitle")} />
            <Text variant="muted">{t("mood.editDescription")}</Text>
          </View>
        ) : null}

        <CrisisSupportBar />

        <View ref={scoreSectionRef} className="gap-3">
          <Label>{t("mood.scoreLabel")}</Label>
          <Text variant="muted">{t("mood.scoreHint")}</Text>
          <MoodScale
            value={moodScore}
            onChange={(score) => {
              setMoodScore(score);
              setScoreError("");
            }}
          />
          {scoreError ? (
            <Text className="text-sm text-destructive" {...politeLiveRegionProps()}>
              {scoreError}
            </Text>
          ) : null}
        </View>

        {showBreathingNudge ? (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: "/tools/breathing/session",
                params: { pattern: "box-breathing" },
              })
            }
          >
            <Card>
              <CardHeader>
                <CardTitle aria-level={2}>{t("breathing.nudgeTitle")}</CardTitle>
                <CardDescription>{t("breathing.nudgeDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Text className="text-primary text-sm font-medium">
                  {t("breathing.nudgeButton")} →
                </Text>
              </CardContent>
            </Card>
          </Pressable>
        ) : null}

        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Label>{t("mood.emotionsLabel")}</Label>
            <Pressable
              onPress={() => setManageEmotionsOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={tMood("emotions.manage.title")}
            >
              <Text className="text-xs text-primary">{tMood("emotions.manage.title")}</Text>
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

        <View className="gap-2">
          <Label>{t("mood.loggedAtLabel")}</Label>
          <DateTimeField
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
        </View>

        <View className="gap-2">
          <Label>{t("mood.notesLabel")}</Label>
          <Textarea
            accessibilityLabel={t("mood.notesLabel")}
            onChangeText={setNotes}
            placeholder={t("mood.notesPlaceholder")}
            value={notes}
          />
        </View>

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
            <View className="gap-4 rounded-2xl border border-border bg-muted p-4">
              <Text variant="muted" className="text-[13px]">
                {t("mood.goDeeperIntro")}
              </Text>
              <View className="gap-4">
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
                              // Accent ink, not `text-be` (#368): the selected chip stacks
                              // be/10 on the be/[0.06] "go deeper" box on the room
                              // background, and the published accent reads 3.81:1 through
                              // that stack - be clears AA on the bare room surfaces, not
                              // through two tints of itself.
                              selected ? "text-accent-ink font-medium" : "text-foreground",
                            )}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </MobileFormScreen>
    </View>
  );
}
