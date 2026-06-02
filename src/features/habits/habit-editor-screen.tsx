import { router, type Href } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { LoadingState } from "@/src/components/app/screen-state";
import { colorChipClass } from "@/src/features/habits/habits-home-screen";
import { useHabit, useHabits, useSaveHabit } from "@/src/features/habits/queries";
import { HABIT_COLORS, HABIT_NAME_MAX, habitInputSchema } from "@/src/features/habits/schemas";
import type {
  Habit,
  HabitCadence,
  HabitColor,
  HabitInput,
  HabitKind,
} from "@/src/features/habits/types";
import { useSession } from "@/src/providers/session-provider";
import { cn } from "@/lib/utils";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

interface HabitEditorScreenProps {
  fallbackHref: Href;
  mode: "create" | "edit";
  habitId?: string | null;
}

const EMPTY_INPUT: HabitInput = {
  name: "",
  kind: "build",
  identity: "",
  cuePlan: "",
  stackAfter: "",
  cravingPairing: "",
  twoMinuteVersion: "",
  rewardNote: "",
  cadence: "daily",
  customDays: [1, 2, 3, 4, 5],
  color: "primary",
};

function habitToInput(habit: Habit): HabitInput {
  return {
    name: habit.name,
    kind: habit.kind,
    identity: habit.identity,
    cuePlan: habit.cuePlan,
    stackAfter: habit.stackAfter,
    cravingPairing: habit.cravingPairing,
    twoMinuteVersion: habit.twoMinuteVersion,
    rewardNote: habit.rewardNote,
    cadence: habit.cadence,
    customDays:
      habit.cadence === "custom" && habit.customDays.length === 0
        ? [1, 2, 3, 4, 5]
        : habit.customDays,
    color: habit.color,
  };
}

export function HabitEditorScreen({ fallbackHref, mode, habitId = null }: HabitEditorScreenProps) {
  const { t } = useTranslation("habits");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: cachedList } = useHabits(mode === "edit" ? userId : null);
  const fromCache = habitId ? (cachedList?.find((h) => h.id === habitId) ?? null) : null;
  const { data: fetched, isLoading } = useHabit(
    mode === "edit" && !fromCache ? userId : null,
    mode === "edit" && !fromCache ? habitId : null,
  );
  const existing: Habit | null = mode === "edit" ? (fromCache ?? fetched ?? null) : null;

  const saveMutation = useSaveHabit(userId);
  const [input, setInput] = useState<HabitInput>(EMPTY_INPUT);
  const [error, setError] = useState("");

  const editMode = mode === "edit";
  const saving = saveMutation.isPending;

  useEffect(() => {
    if (!existing) return;
    setInput(habitToInput(existing));
    setError("");
  }, [existing]);

  function update<K extends keyof HabitInput>(key: K, value: HabitInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  function toggleCustomDay(day: number) {
    setInput((prev) => {
      const next = new Set(prev.customDays);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return { ...prev, customDays: Array.from(next).sort() };
    });
  }

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  };

  const handleSave = async () => {
    if (!user) return;
    const trimmed: HabitInput = { ...input, name: input.name.trim() };
    if (!trimmed.name) {
      setError(t("form.nameRequired"));
      return;
    }
    if (trimmed.cadence === "custom" && trimmed.customDays.length === 0) {
      setError(t("form.customDaysRequired"));
      return;
    }
    const parsed = habitInputSchema.safeParse(trimmed);
    if (!parsed.success) {
      setError(t("form.saveError"));
      return;
    }
    setError("");
    try {
      const saved = await saveMutation.mutateAsync({
        input: parsed.data,
        habitId: editMode ? (habitId ?? undefined) : undefined,
      });
      router.replace({
        pathname: "/tools/habits/[id]",
        params: { id: saved.id },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("form.saveError"));
    }
  };

  if (editMode && !fromCache && isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("form.editTitle")} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow gap-6 p-6 pb-12">
        <View className="gap-2">
          <ScreenHeader title={editMode ? t("form.editTitle") : t("form.newTitle")} />
        </View>

        <View className="gap-2">
          <Label>{t("form.identityLabel")}</Label>
          <Input
            accessibilityLabel={t("form.identityLabel")}
            onChangeText={(v) => update("identity", v)}
            placeholder={t("form.identityPlaceholder")}
            value={input.identity}
          />
          <Text variant="muted" className="text-xs">
            {t("form.identityHelp")}
          </Text>
        </View>

        <View className="gap-2">
          <Label>{t("form.nameLabel")}</Label>
          <Input
            accessibilityLabel={t("form.nameLabel")}
            maxLength={HABIT_NAME_MAX}
            onChangeText={(v) => update("name", v)}
            placeholder={t("form.namePlaceholder")}
            value={input.name}
          />
        </View>

        <View className="gap-2">
          <Label>{t("form.kindLabel")}</Label>
          <View className="flex-row gap-2">
            <KindChip
              active={input.kind === "build"}
              label={t("form.kindBuild")}
              onPress={() => update("kind", "build" as HabitKind)}
            />
            <KindChip
              active={input.kind === "break"}
              label={t("form.kindBreak")}
              onPress={() => update("kind", "break" as HabitKind)}
            />
          </View>
          <Text variant="muted" className="text-xs">
            {input.kind === "break" ? t("form.kindBreakHelp") : t("form.kindBuildHelp")}
          </Text>
        </View>

        {input.kind === "build" ? (
          <View className="gap-2">
            <Label>{t("form.twoMinuteLabel")}</Label>
            <Input
              accessibilityLabel={t("form.twoMinuteLabel")}
              onChangeText={(v) => update("twoMinuteVersion", v)}
              placeholder={t("form.twoMinutePlaceholder")}
              value={input.twoMinuteVersion}
            />
            <Text variant="muted" className="text-xs">
              {t("form.twoMinuteHelp")}
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            <Label>{t("form.difficultLabel")}</Label>
            <Input
              accessibilityLabel={t("form.difficultLabel")}
              onChangeText={(v) => update("twoMinuteVersion", v)}
              placeholder={t("form.difficultPlaceholder")}
              value={input.twoMinuteVersion}
            />
            <Text variant="muted" className="text-xs">
              {t("form.difficultHelp")}
            </Text>
          </View>
        )}

        <View className="gap-2">
          <Label>{input.kind === "break" ? t("form.invisibleLabel") : t("form.cueLabel")}</Label>
          <Textarea
            accessibilityLabel={
              input.kind === "break" ? t("form.invisibleLabel") : t("form.cueLabel")
            }
            onChangeText={(v) => update("cuePlan", v)}
            placeholder={
              input.kind === "break" ? t("form.invisiblePlaceholder") : t("form.cuePlaceholder")
            }
            value={input.cuePlan}
          />
        </View>

        {input.kind === "build" ? (
          <View className="gap-2">
            <Label>{t("form.stackLabel")}</Label>
            <Input
              accessibilityLabel={t("form.stackLabel")}
              onChangeText={(v) => update("stackAfter", v)}
              placeholder={t("form.stackPlaceholder")}
              value={input.stackAfter}
            />
          </View>
        ) : null}

        <View className="gap-2">
          <Label>
            {input.kind === "break" ? t("form.unattractiveLabel") : t("form.pairingLabel")}
          </Label>
          <Textarea
            accessibilityLabel={
              input.kind === "break" ? t("form.unattractiveLabel") : t("form.pairingLabel")
            }
            onChangeText={(v) => update("cravingPairing", v)}
            placeholder={
              input.kind === "break"
                ? t("form.unattractivePlaceholder")
                : t("form.pairingPlaceholder")
            }
            value={input.cravingPairing}
          />
        </View>

        <View className="gap-2">
          <Label>
            {input.kind === "break" ? t("form.unsatisfyingLabel") : t("form.rewardLabel")}
          </Label>
          <Input
            accessibilityLabel={
              input.kind === "break" ? t("form.unsatisfyingLabel") : t("form.rewardLabel")
            }
            onChangeText={(v) => update("rewardNote", v)}
            placeholder={
              input.kind === "break"
                ? t("form.unsatisfyingPlaceholder")
                : t("form.rewardPlaceholder")
            }
            value={input.rewardNote}
          />
        </View>

        <View className="gap-2">
          <Label>{t("form.cadenceLabel")}</Label>
          <View className="flex-row flex-wrap gap-2">
            <CadenceChip
              active={input.cadence === "daily"}
              label={t("form.cadenceDaily")}
              onPress={() => update("cadence", "daily" as HabitCadence)}
            />
            <CadenceChip
              active={input.cadence === "weekdays"}
              label={t("form.cadenceWeekdays")}
              onPress={() => update("cadence", "weekdays" as HabitCadence)}
            />
            <CadenceChip
              active={input.cadence === "custom"}
              label={t("form.cadenceCustom")}
              onPress={() => update("cadence", "custom" as HabitCadence)}
            />
          </View>
        </View>

        {input.cadence === "custom" ? (
          <View className="gap-2">
            <Label>{t("form.customDaysLabel")}</Label>
            <View className="flex-row gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                <Pressable
                  key={day}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: input.customDays.includes(day) }}
                  hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                  onPress={() => toggleCustomDay(day)}
                  className={cn(
                    "h-10 flex-1 items-center justify-center rounded-md border",
                    input.customDays.includes(day)
                      ? "border-primary bg-primary/15"
                      : "border-border bg-background",
                  )}
                  role="checkbox"
                >
                  <Text className="text-xs font-semibold">{t(`form.weekday.${day}` as const)}</Text>
                </Pressable>
              ))}
            </View>
            <Text variant="muted" className="text-xs">
              {t("form.customDaysHelp")}
            </Text>
          </View>
        ) : null}

        <View className="gap-2">
          <Label>{t("form.colorLabel")}</Label>
          <View className="flex-row flex-wrap gap-2">
            {HABIT_COLORS.map((color) => (
              <ColorChip
                key={color}
                active={input.color === color}
                color={color}
                label={t(`form.colors.${color}` as const)}
                onPress={() => update("color", color as HabitColor)}
              />
            ))}
          </View>
        </View>

        {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button onPress={goBack} variant="ghost">
              <Text>{t("cta.cancel")}</Text>
            </Button>
          </View>
          <View className="flex-1">
            <Button disabled={saving || !user} onPress={() => void handleSave()}>
              {saving ? <ActivityIndicator color="#ffffff" /> : null}
              <Text>{saving ? t("cta.saving") : t("cta.save")}</Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface ChipProps {
  active: boolean;
  label: string;
  onPress: () => void;
}

function KindChip({ active, label, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onPress}
      className={cn(
        "rounded-full border px-4 py-2",
        active ? "border-primary bg-primary/15" : "border-border bg-background",
      )}
      role="button"
    >
      <Text className={cn("text-sm font-semibold", active && "text-primary")}>{label}</Text>
    </Pressable>
  );
}

function CadenceChip({ active, label, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onPress}
      className={cn(
        "rounded-full border px-4 py-2",
        active ? "border-primary bg-primary/15" : "border-border bg-background",
      )}
      role="button"
    >
      <Text className={cn("text-sm", active && "font-semibold text-primary")}>{label}</Text>
    </Pressable>
  );
}

interface ColorChipProps {
  active: boolean;
  color: HabitColor;
  label: string;
  onPress: () => void;
}

function ColorChip({ active, color, label, onPress }: ColorChipProps) {
  const chip = colorChipClass(color);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onPress}
      className={cn(
        "flex-row items-center gap-2 rounded-full border px-3 py-2",
        active ? chip.border : "border-border",
        chip.bg,
      )}
      role="button"
    >
      <View className={cn("size-4 rounded-full border", chip.border, chip.bg)} />
      <Text className={cn("text-xs font-semibold", chip.text)}>{label}</Text>
    </Pressable>
  );
}
