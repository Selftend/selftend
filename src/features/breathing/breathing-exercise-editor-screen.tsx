import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { LoadingState } from "@/src/components/app/screen-state";
import { totalSeconds, formatClock } from "@/src/features/breathing/cycle-math";
import { breathingColorClass } from "@/src/features/breathing/exercise-colors";
import {
  useBreathingExercise,
  useBreathingExercises,
  useDeleteBreathingExercise,
  useSaveBreathingExercise,
} from "@/src/features/breathing/exercises-queries";
import {
  BREATHING_NAME_MAX,
  CYCLES_MAX,
  CYCLES_MIN,
  PHASE_SECONDS_MAX,
  PHASE_STEP,
  SUGGESTED_PATTERNS,
  breathingExerciseInputSchema,
  EMPTY_EXERCISE_INPUT,
} from "@/src/features/breathing/exercise-schema";
import {
  BREATHING_EXERCISE_COLORS,
  type BreathingExercise,
  type BreathingExerciseColor,
  type BreathingExerciseInput,
} from "@/src/features/breathing/exercise-types";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { cn } from "@/lib/utils";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

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

export function BreathingExerciseEditorScreen({ exerciseId }: { exerciseId?: string | null }) {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const showToast = useToastStore((s) => s.showToast);

  const editMode = Boolean(exerciseId);
  const { data: cachedList } = useBreathingExercises(editMode ? userId : null);
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

  useEffect(() => {
    if (!existing) return;
    setInput(toInput(existing));
    setError("");
  }, [existing]);

  function update<K extends keyof BreathingExerciseInput>(
    key: K,
    value: BreathingExerciseInput[K],
  ) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  function stepPhase(key: PhaseKey, delta: number) {
    setInput((prev) => {
      const next = Math.min(PHASE_SECONDS_MAX, Math.max(0, prev[key] + delta));
      return { ...prev, [key]: next };
    });
  }

  const phasesForPreview = PHASE_FIELDS.map((f) => ({
    label: "inhale" as const,
    durationSeconds: input[f.key],
  })).filter((p) => p.durationSeconds > 0);
  const cycleTime = formatClock(totalSeconds(phasesForPreview, input.cycles));

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/tools/breathing" as Parameters<typeof router.replace>[0]);
  };

  const handleSave = async () => {
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
  };

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

  if (editMode && !fromCache && isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("breathing.builder.editTitle")} />
        </View>
      </SafeAreaView>
    );
  }

  const saving = saveMutation.isPending;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow gap-6 p-6 pb-12">
        <ScreenHeader
          title={editMode ? t("breathing.builder.editTitle") : t("breathing.builder.newTitle")}
        />

        <View className="gap-2">
          <Label>{t("breathing.builder.nameLabel")}</Label>
          <Input
            accessibilityLabel={t("breathing.builder.nameLabel")}
            maxLength={BREATHING_NAME_MAX}
            onChangeText={(v) => update("name", v)}
            placeholder={t("breathing.builder.namePlaceholder")}
            value={input.name}
          />
        </View>

        <View className="gap-3">
          <Label>{t("breathing.builder.patternLabel")}</Label>
          <View className="flex-row gap-2">
            {PHASE_FIELDS.map((f) => (
              <View
                key={f.key}
                className="flex-1 items-center gap-1.5 rounded-xl border border-border p-2"
              >
                <Text className="text-xs font-semibold">{t(f.labelKey)}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t(f.labelKey)} +`}
                  hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                  onPress={() => stepPhase(f.key, PHASE_STEP)}
                >
                  <Text className="text-base text-aqua">▲</Text>
                </Pressable>
                <Text className="tabular-nums text-sm font-semibold">
                  {input[f.key].toFixed(1)}s
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t(f.labelKey)} −`}
                  hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                  onPress={() => stepPhase(f.key, -PHASE_STEP)}
                >
                  <Text className="text-base text-aqua">▼</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        <View className="gap-2">
          <Label>{t("breathing.builder.suggestedLabel")}</Label>
          <View className="flex-row flex-wrap gap-2">
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
                className="rounded-full border border-border bg-background px-3 py-1.5"
                role="button"
              >
                <Text className="text-xs font-semibold tabular-nums">
                  {p.inhaleSeconds}-{p.holdInSeconds}-{p.exhaleSeconds}-{p.holdOutSeconds}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="gap-3">
          <Label>{t("breathing.builder.cyclesLabel")}</Label>
          <View className="flex-row items-center justify-center gap-6">
            <Button
              variant="outline"
              accessibilityLabel={t("breathing.decreaseCycles")}
              onPress={() => update("cycles", Math.max(CYCLES_MIN, input.cycles - 1))}
            >
              <Text className="text-lg">−</Text>
            </Button>
            <View className="items-center">
              <Text className="text-3xl font-bold tabular-nums">
                {t("breathing.cycles", { count: input.cycles })}
              </Text>
              <Text variant="muted" className="text-sm tabular-nums">
                {t("breathing.totalTimeLabel")} · {cycleTime}
              </Text>
            </View>
            <Button
              variant="outline"
              accessibilityLabel={t("breathing.increaseCycles")}
              onPress={() => update("cycles", Math.min(CYCLES_MAX, input.cycles + 1))}
            >
              <Text className="text-lg">+</Text>
            </Button>
          </View>
        </View>

        <View className="gap-2">
          <Label>{t("breathing.builder.colorLabel")}</Label>
          <View className="flex-row flex-wrap gap-2">
            {BREATHING_EXERCISE_COLORS.map((color) => {
              const chip = breathingColorClass(color);
              const active = input.color === color;
              return (
                <Pressable
                  key={color}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={t(`breathing.builder.colors.${color}` as const)}
                  hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                  onPress={() => update("color", color as BreathingExerciseColor)}
                  className={cn(
                    "size-9 items-center justify-center rounded-full border",
                    chip.bg,
                    active ? chip.border : "border-border",
                  )}
                  role="button"
                >
                  <View className={cn("size-4 rounded-full border", chip.border, chip.bg)} />
                </Pressable>
              );
            })}
          </View>
        </View>

        {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button onPress={goBack} variant="ghost">
              <Text>{t("breathing.builder.cancel")}</Text>
            </Button>
          </View>
          <View className="flex-1">
            <Button disabled={saving || !user} onPress={() => void handleSave()}>
              {saving ? <ActivityIndicator color="#ffffff" /> : null}
              <Text>{saving ? t("breathing.builder.saving") : t("breathing.builder.save")}</Text>
            </Button>
          </View>
        </View>

        {editMode ? (
          <Button onPress={() => void handleDelete()} variant="ghost">
            <Text className="text-destructive">{t("breathing.builder.delete")}</Text>
          </Button>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
