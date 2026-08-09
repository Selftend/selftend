import { router } from "expo-router";
import { ActivityIndicator, Pressable, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { ScreenTopBar } from "@/src/components/app/screen-top-bar";
import { FORM_COLUMN } from "@/src/lib/layout";
import { LoadingState } from "@/src/components/app/screen-state";
import { PhaseTimingBar } from "@/src/features/breathing/phase-timing-bar";
import { SessionLengthButtons } from "@/src/features/breathing/session-length-buttons";
import { cycleSeconds, formatClock, totalSeconds } from "@/src/features/breathing/cycle-math";
import {
  breathingChipColors,
  breathingColorChoicesFor,
} from "@/src/features/breathing/exercise-colors";
import {
  useBreathingExercise,
  useBreathingExercises,
  useDeleteBreathingExercise,
  useSaveBreathingExercise,
} from "@/src/features/breathing/exercises-queries";
import {
  BREATHING_NAME_MAX,
  PHASE_STEP,
  PHASE_STEPPER_MAX,
  SUGGESTED_PATTERNS,
  breathingExerciseInputSchema,
  EMPTY_EXERCISE_INPUT,
} from "@/src/features/breathing/exercise-schema";
import {
  nextUnusedBreathingColor,
  type BreathingExercise,
  type BreathingExerciseColor,
  type BreathingExerciseInput,
} from "@/src/features/breathing/exercise-types";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { cn } from "@/lib/utils";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useColorSchemeName } from "@/src/lib/color-scheme";
import { useRoomStyle } from "@/src/lib/use-room-style";
import { useRovingFocus } from "@/src/lib/roving-focus";
import { useSingleFlight } from "@/src/lib/use-single-flight";

type PhaseKey = "inhaleSeconds" | "holdInSeconds" | "exhaleSeconds" | "holdOutSeconds";

const PHASE_FIELDS: { key: PhaseKey; labelKey: string }[] = [
  { key: "inhaleSeconds", labelKey: "breathing.phases.inhale" },
  { key: "holdInSeconds", labelKey: "breathing.phases.hold" },
  { key: "exhaleSeconds", labelKey: "breathing.phases.exhale" },
  { key: "holdOutSeconds", labelKey: "breathing.phases.holdOut" },
];

function toInput(e: BreathingExercise): BreathingExerciseInput {
  return {
    name: e.name,
    inhaleSeconds: e.inhaleSeconds,
    holdInSeconds: e.holdInSeconds,
    exhaleSeconds: e.exhaleSeconds,
    holdOutSeconds: e.holdOutSeconds,
    cycles: e.cycles,
    color: e.color,
  };
}

function phasesOf(input: BreathingExerciseInput) {
  return PHASE_FIELDS.map((f) => ({
    label: f.key === "inhaleSeconds" ? ("inhale" as const) : ("hold" as const),
    durationSeconds: input[f.key],
  }));
}

export function BreathingExerciseEditorScreen({ exerciseId }: { exerciseId?: string | null }) {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const showToast = useToastStore((s) => s.showToast);

  const editMode = Boolean(exerciseId);
  // Create mode fetches the list too, where it used to fetch only in edit mode:
  // the auto-assigned colour below needs to know which colours are taken. It is
  // one query, already warm from the overview the user navigated in from.
  const { data: cachedList } = useBreathingExercises(userId);
  const fromCache = exerciseId ? (cachedList?.find((e) => e.id === exerciseId) ?? null) : null;
  const { data: fetched, isLoading } = useBreathingExercise(
    editMode && !fromCache ? userId : null,
    editMode && !fromCache ? exerciseId! : null,
  );
  const existing = editMode ? (fromCache ?? fetched ?? null) : null;

  const saveMutation = useSaveBreathingExercise(userId);
  const deleteMutation = useDeleteBreathingExercise(userId);
  const [input, setInput] = useState<BreathingExerciseInput>(EMPTY_EXERCISE_INPUT);
  const [error, setError] = useState("");

  // Hydrate field state ONCE per exercise id; keying on the id (not the object) stops a
  // later refetch's new object identity from clobbering the user's in-progress edits.
  const hydratedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!existing) return;
    if (hydratedIdRef.current === existing.id) return;
    hydratedIdRef.current = existing.id;
    setInput(toInput(existing));
    setError("");
  }, [existing]);

  // Seed a new pattern's colour with the first one the user isn't already
  // using, ONCE, when the list arrives - and never in edit mode, and never
  // after the user has touched the picker themselves.
  const seededColorRef = useRef(false);
  useEffect(() => {
    if (editMode || seededColorRef.current || !cachedList) return;
    seededColorRef.current = true;
    setInput((prev) => ({ ...prev, color: nextUnusedBreathingColor(cachedList) }));
  }, [cachedList, editMode]);

  function update<K extends keyof BreathingExerciseInput>(
    key: K,
    value: BreathingExerciseInput[K],
  ) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  function stepPhase(key: PhaseKey, delta: number) {
    setInput((prev) => {
      // The ceiling is the stepper's 12s OR whatever this field already holds,
      // whichever is higher - so a pattern saved with a 20s phase before this
      // screen existed is not silently rewritten to 12 by a single tap on `+`.
      const ceiling = Math.max(PHASE_STEPPER_MAX, prev[key]);
      const next = Math.min(ceiling, Math.max(0, prev[key] + delta));
      return { ...prev, [key]: next };
    });
  }

  const scheme = useColorSchemeName();
  const swatches = breathingColorChoicesFor(input.color);
  const colorRoving = useRovingFocus({
    count: swatches.length,
    activeIndex: Math.max(0, swatches.indexOf(input.color)),
    onActivate: (index) => update("color", swatches[index]),
  });

  const phases = phasesOf(input);
  const secondsPerCycle = cycleSeconds(phases);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/tools/breathing" as Parameters<typeof router.replace>[0]);
  };

  const handleSave = useSingleFlight(async () => {
    if (!user) return;
    const trimmed = { ...input, name: input.name.trim() };
    const parsed = breathingExerciseInputSchema.safeParse(trimmed);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      setError(
        first?.message === "required"
          ? t("breathing.builder.nameRequired")
          : first?.message === "activePhase"
            ? t("breathing.builder.activePhaseRequired")
            : t("breathing.builder.saveError"),
      );
      return;
    }
    setError("");
    try {
      await saveMutation.mutateAsync({ input: parsed.data, id: exerciseId ?? undefined });
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("breathing.builder.saveError"));
    }
  });

  const handleDelete = async () => {
    if (!exerciseId) return;
    try {
      await deleteMutation.mutateAsync(exerciseId);
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      goBack();
    } catch {
      showToast({ title: t("common:feedback.problem"), tone: "error" });
    }
  };

  const roomStyle = useRoomStyle("aqua");

  if (editMode && !fromCache && isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" style={roomStyle}>
        <View className="flex-1 justify-center">
          <LoadingState title={t("breathing.builder.editTitle")} />
        </View>
      </SafeAreaView>
    );
  }

  const saving = saveMutation.isPending;

  return (
    // The room wrapper carries the token re-pour; MobileFormScreen's own
    // bg-background surfaces re-resolve to the aqua pour through it.
    <View className="flex-1" style={roomStyle} testID="breathing-editor-room">
      <MobileFormScreen
        contentClassName={cn(FORM_COLUMN, "gap-7")}
        topBar={<ScreenTopBar leading="close" />}
        footer={
          <View className={cn(FORM_COLUMN, "flex-row items-center justify-between gap-3")}>
            <Button onPress={goBack} variant="ghost">
              <Text>{t("breathing.builder.cancel")}</Text>
            </Button>
            <Button disabled={saving || !user} onPress={() => void handleSave()}>
              {saving ? <ActivityIndicator color="#ffffff" /> : null}
              <Text>{saving ? t("breathing.builder.saving") : t("breathing.builder.save")}</Text>
            </Button>
          </View>
        }
      >
        {/* The name IS the heading (design `4d`): a borderless 26px input where a
            labelled field used to sit under a separate h1. No breadcrumb eyebrow
            - the bar above already carries the trail. */}
        <TextInput
          accessibilityLabel={t("breathing.builder.nameLabel")}
          className="text-[26px] font-bold tracking-tight text-foreground"
          maxLength={BREATHING_NAME_MAX}
          onChangeText={(v) => update("name", v)}
          placeholder={t("breathing.builder.namePlaceholder")}
          placeholderTextColor="hsl(var(--muted-foreground))"
          value={input.name}
        />

        <View className="gap-3.5 border-y border-border py-5">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {t("breathing.builder.timingLabel")}
            </Text>
            <Text
              testID="breathing-cycle-length"
              variant="muted"
              className="shrink-0 text-[12.5px] tabular-nums"
            >
              {t("breathing.builder.perCycle", { value: formatClock(secondsPerCycle) })}
            </Text>
          </View>

          <PhaseTimingBar phases={phases} color={input.color} />

          {/* Four columns at 360dp: (328 − 3×10) / 4 = 74dp each. The two 26px
              glyph buttons plus a 34px value read as 86px of content, so they sit
              on ONE row only because the value shrinks between them; the touch
              target is carried by hitSlop, which takes each 26dp button past the
              44dp floor without widening the drawn control. */}
          <View className="flex-row gap-2.5">
            {PHASE_FIELDS.map((f) => (
              <View key={f.key} className="flex-1 items-center gap-2">
                <Text className="text-xs font-semibold text-muted-foreground">{t(f.labelKey)}</Text>
                <View className="flex-row items-center gap-1.5">
                  <StepperButton
                    glyph="−"
                    label={`${t(f.labelKey)} −`}
                    onPress={() => stepPhase(f.key, -PHASE_STEP)}
                  />
                  <Text className="min-w-[34px] text-center text-[15px] font-semibold tabular-nums">
                    {t("breathing.builder.seconds", { value: input[f.key] })}
                  </Text>
                  <StepperButton
                    glyph="+"
                    label={`${t(f.labelKey)} +`}
                    onPress={() => stepPhase(f.key, PHASE_STEP)}
                  />
                </View>
              </View>
            ))}
          </View>

          <View className="flex-row flex-wrap items-center gap-2">
            <Text variant="muted" className="text-xs">
              {t("breathing.builder.startFrom")}
            </Text>
            {SUGGESTED_PATTERNS.map((p) => (
              <Pressable
                key={p.key}
                accessibilityRole="button"
                hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                onPress={() =>
                  setInput((prev) => ({
                    ...prev,
                    inhaleSeconds: p.inhaleSeconds,
                    holdInSeconds: p.holdInSeconds,
                    exhaleSeconds: p.exhaleSeconds,
                    holdOutSeconds: p.holdOutSeconds,
                  }))
                }
                className="rounded-full border border-border px-3 py-1.5"
                role="button"
              >
                {/* Zero phases are dropped from the label, so coherent reads
                    "5.5-5.5" rather than "5.5-0-5.5-0" - the same rule the
                    timing bar applies to the phase itself. */}
                <Text className="text-xs font-semibold tabular-nums text-muted-foreground">
                  {[p.inhaleSeconds, p.holdInSeconds, p.exhaleSeconds, p.holdOutSeconds]
                    .filter((n) => n > 0)
                    .join("-")}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="gap-3">
          <View className="flex-row items-baseline justify-between gap-3">
            <Text className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {t("breathing.builder.defaultLengthLabel")}
            </Text>
            <Text variant="muted" className="shrink-0 text-[12.5px] tabular-nums">
              {t("breathing.cycles", { count: input.cycles })} ·{" "}
              {formatClock(totalSeconds(phases, input.cycles))}
            </Text>
          </View>
          <SessionLengthButtons
            secondsPerCycle={secondsPerCycle}
            selectedCycles={input.cycles}
            onSelect={(cycles) => update("cycles", cycles)}
          />
          {/* Load-bearing: without it the default reads as a commitment rather
              than a starting point, which is what makes a five-button default
              acceptable in a non-punitive product at all. */}
          <Text variant="muted" className="text-[12.5px]">
            {t("breathing.builder.lengthChangeable")}
          </Text>
        </View>

        <View className="flex-row items-center gap-4">
          <Text className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {t("breathing.builder.accentLabel")}
          </Text>
          <View
            accessibilityLabel={t("breathing.builder.accentLabel")}
            accessibilityRole="radiogroup"
            className="flex-1 flex-row gap-2"
            role="radiogroup"
            testID="breathing-accent-picker"
          >
            {swatches.map((color, index) => {
              const chip = breathingChipColors(color, scheme);
              const active = input.color === color;
              const onPress = () => update("color", color as BreathingExerciseColor);
              return (
                <Pressable
                  key={color}
                  accessibilityRole="radio"
                  aria-checked={active}
                  accessibilityLabel={t(`breathing.builder.colors.${color}` as const)}
                  hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                  onPress={onPress}
                  // flex-1 across the row: six swatches over a 328dp column is
                  // 48dp each, clear of the 44dp floor without hitSlop; a
                  // seventh grandfathered one is 40dp, which hitSlop carries.
                  className="h-11 flex-1 items-center justify-center rounded-full"
                  role="radio"
                  {...colorRoving.getItemProps(index, onPress)}
                >
                  <View
                    className="size-6 rounded-full"
                    style={{
                      backgroundColor: chip.fill,
                      borderWidth: 2,
                      // The selected ring is `ink`, not the raw hue: it has to
                      // read as a state against the surface, and ink is the one
                      // stop held to a contrast floor.
                      borderColor: active ? chip.ink : chip.border,
                    }}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

        {editMode ? (
          <Button onPress={() => void handleDelete()} variant="ghost">
            <Text className="text-destructive">{t("breathing.builder.delete")}</Text>
          </Button>
        ) : null}
      </MobileFormScreen>
    </View>
  );
}

function StepperButton({
  glyph,
  label,
  onPress,
}: {
  glyph: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onPress}
      className="size-[26px] items-center justify-center rounded-full border border-border"
      role="button"
    >
      <Text className="text-sm leading-none text-muted-foreground">{glyph}</Text>
    </Pressable>
  );
}
