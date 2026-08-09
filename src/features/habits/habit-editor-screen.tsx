import { router, type Href } from "expo-router";
import { ActivityIndicator, Pressable, View, type TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { Disclosure } from "@/src/components/app/disclosure";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { ScreenTopBar } from "@/src/components/app/screen-top-bar";
import { FORM_COLUMN } from "@/src/lib/layout";
import { LoadingState } from "@/src/components/app/screen-state";
import { useHabitChipPalette } from "@/src/features/habits/habit-color";
import { useHabit, useHabits, useSaveHabit } from "@/src/features/habits/queries";
import {
  HABIT_COLOR_CHOICES,
  HABIT_CUE_MAX,
  HABIT_IDENTITY_MAX,
  HABIT_NAME_MAX,
  HABIT_PAIRING_MAX,
  HABIT_REWARD_MAX,
  HABIT_STACK_MAX,
  HABIT_TWO_MINUTE_MAX,
  habitInputSchema,
  nextHabitColor,
} from "@/src/features/habits/schemas";
import type {
  Habit,
  HabitCadence,
  HabitColor,
  HabitInput,
  HabitKind,
} from "@/src/features/habits/types";
import { useRoomStyle } from "@/src/lib/use-room-style";
import { useSession } from "@/src/providers/session-provider";
import { cn } from "@/lib/utils";
import {
  announceMessage,
  DEFAULT_INTERACTIVE_HIT_SLOP,
  politeLiveRegionProps,
  spaceKeyActivationProps,
} from "@/src/lib/accessibility";
import { useRovingFocus } from "@/src/lib/roving-focus";
import { useSingleFlight } from "@/src/lib/use-single-flight";

interface HabitEditorScreenProps {
  fallbackHref: Href;
  mode: "create" | "edit";
  habitId?: string | null;
}

const KIND_OPTIONS: HabitKind[] = ["build", "break"];
const CADENCE_OPTIONS: HabitCadence[] = ["daily", "weekdays", "custom"];

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
  // The head of HABIT_COLOR_CHOICES, so a create form never opens on a retired colour
  // while the habit list is still loading (#764).
  color: "act",
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
  const roomStyle = useRoomStyle("act");
  const { user } = useSession();
  const userId = user?.id ?? null;

  // Create mode reads the list too now, to auto-assign a colour nothing else is using.
  const { data: cachedList } = useHabits(userId);
  const fromCache = habitId ? (cachedList?.find((h) => h.id === habitId) ?? null) : null;
  const { data: fetched, isLoading } = useHabit(
    mode === "edit" && !fromCache ? userId : null,
    mode === "edit" && !fromCache ? habitId : null,
  );
  const existing: Habit | null = mode === "edit" ? (fromCache ?? fetched ?? null) : null;

  const saveMutation = useSaveHabit(userId);
  const [input, setInput] = useState<HabitInput>(EMPTY_INPUT);
  const [error, setError] = useState("");
  // null until the user picks one; see activeColor below.
  const [pickedColor, setPickedColor] = useState<HabitColor | null>(null);
  const nameInputRef = useRef<TextInput>(null);
  // null until the user opens or folds it; see detailsOpen below.
  const [detailsToggled, setDetailsToggled] = useState<boolean | null>(null);

  const editMode = mode === "edit";
  const saving = saveMutation.isPending;

  const kindRoving = useRovingFocus({
    count: KIND_OPTIONS.length,
    activeIndex: Math.max(0, KIND_OPTIONS.indexOf(input.kind)),
    onActivate: (index) => update("kind", KIND_OPTIONS[index]),
  });
  const cadenceRoving = useRovingFocus({
    count: CADENCE_OPTIONS.length,
    activeIndex: Math.max(0, CADENCE_OPTIONS.indexOf(input.cadence)),
    onActivate: (index) => update("cadence", CADENCE_OPTIONS[index]),
  });
  /**
   * The selected colour is **derived**, not stored, until the user picks one (#764).
   *
   * A new habit takes the first offered colour nothing else is using — and computing that
   * at render rather than writing it into state from an effect matters: the habit list is
   * a query, so it can land *after* the form mounts. An effect would either overwrite a
   * choice the user had already made, or need a ref to guard against doing so.
   */
  const activeColor: HabitColor =
    pickedColor ??
    (editMode ? input.color : nextHabitColor((cachedList ?? []).map((h) => h.color)));

  /**
   * ⚠️ `undefined` means the habits query is still in flight, NOT that the user has no
   * habits — and the two imply different colours. Saving is gated on this below, so a
   * cold-opened create form cannot commit `act` while an existing habit already holds it.
   */
  const awaitingHabitsForColor = !editMode && pickedColor === null && cachedList === undefined;

  /**
   * The six offered colours, with the edited habit's own prepended when it **stores** a
   * retired one — so a habit created before the palette was cut keeps its identity.
   *
   * ⚠️ Keyed on the *stored* colour, not the selected one. Keying it on the selection made
   * the retired swatch vanish the moment the user picked anything else, so an accidental
   * tap could not be undone without leaving the form and losing every other edit.
   */
  const grandfathered =
    existing && !(HABIT_COLOR_CHOICES as readonly string[]).includes(existing.color)
      ? existing.color
      : null;

  /**
   * The refinements start folded away, and a break habit opens them (#760).
   *
   * A create form asks for a name, a two-minute version, a cadence and a
   * colour; the rest is refinement that a first habit does not need and that a
   * long form makes feel required. But an EDIT form for a break habit is
   * relabelled throughout - "Friction" where the user expects "Two-minute
   * version" - so it opens with the `kind` switch that explains why on screen.
   *
   * **Derived**, not written from an effect, for the same reason `activeColor`
   * is: `existing` arrives from a query, so it can land after the form mounts.
   * An effect would either clobber a user who had already folded the section
   * back up, or need a ref to guard against doing so. The user's own toggle is
   * an override, so it always outranks the default.
   */
  const detailsOpen = detailsToggled ?? existing?.kind === "break";

  /**
   * `stack_after` is offered only where the habit already stores one, so the
   * stored value - not the live input - decides whether the field exists.
   */
  const storedStackAfter = editMode ? (existing?.stackAfter.trim() ?? "") !== "" : false;

  const colorChoices: HabitColor[] = grandfathered
    ? [grandfathered, ...(HABIT_COLOR_CHOICES as readonly HabitColor[])]
    : [...(HABIT_COLOR_CHOICES as readonly HabitColor[])];

  const colorRoving = useRovingFocus({
    count: colorChoices.length,
    activeIndex: Math.max(0, colorChoices.indexOf(activeColor)),
    onActivate: (index) => setPickedColor(colorChoices[index]),
  });

  // Hydrate field state ONCE per habit id; keying on the id (not the object) stops a later
  // refetch's new object identity from clobbering the user's in-progress edits.
  const hydratedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!existing) return;
    if (hydratedIdRef.current === existing.id) return;
    hydratedIdRef.current = existing.id;
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

  // Sets the inline error (rendered next to the Name field) and announces it to
  // native screen readers; the web announcement comes from the polite live region.
  const showError = (message: string) => {
    setError(message);
    announceMessage(message);
  };

  const handleSave = useSingleFlight(async () => {
    if (!user) return;
    const trimmed: HabitInput = { ...input, name: input.name.trim(), color: activeColor };
    if (!trimmed.name) {
      showError(t("form.nameRequired"));
      // Focusing also scrolls the field into view on web (shared Input behavior).
      nameInputRef.current?.focus();
      return;
    }
    if (trimmed.cadence === "custom" && trimmed.customDays.length === 0) {
      showError(t("form.customDaysRequired"));
      return;
    }
    const parsed = habitInputSchema.safeParse(trimmed);
    if (!parsed.success) {
      showError(t("form.saveError"));
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
      showError(e instanceof Error ? e.message : t("form.saveError"));
    }
  });

  if (editMode && !fromCache && isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" style={roomStyle}>
        <View className="flex-1 justify-center">
          <LoadingState title={t("form.editTitle")} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    // The room wrapper carries the token re-pour; MobileFormScreen's own
    // bg-background surfaces re-resolve to the act pour through it.
    <View testID="habit-editor-room" className="flex-1" style={roomStyle}>
      <MobileFormScreen
        contentClassName={cn(FORM_COLUMN, "gap-6")}
        // Both modes now, where only create mode had chrome: an edit form used to
        // open with no header at all above its fields (#733).
        topBar={<ScreenTopBar leading="close" />}
        footer={
          <View className={cn(FORM_COLUMN, "flex-row gap-3")}>
            <View className="flex-1">
              <Button onPress={goBack} variant="ghost">
                <Text>{t("cta.cancel")}</Text>
              </Button>
            </View>
            <View className="flex-1">
              <Button
                disabled={saving || !user || awaitingHabitsForColor}
                onPress={() => void handleSave()}
              >
                {saving ? <ActivityIndicator color="#ffffff" /> : null}
                <Text>{saving ? t("cta.saving") : t("cta.save")}</Text>
              </Button>
            </View>
          </View>
        }
      >
        {/* No breadcrumb eyebrow above the heading (design `2b`): the bar above
            carries the trail, so a ScreenHeader here would render it twice. */}
        <View className="gap-2">
          <Text variant="h1">{editMode ? t("form.editTitle") : t("form.newTitle")}</Text>
        </View>

        <View className="gap-2">
          <Label>{t("form.nameLabel")}</Label>
          <Input
            ref={nameInputRef}
            accessibilityLabel={t("form.nameLabel")}
            maxLength={HABIT_NAME_MAX}
            onChangeText={(v) => update("name", v)}
            placeholder={t("form.namePlaceholder")}
            value={input.name}
          />
          {error ? (
            <Text className="text-sm text-destructive" {...politeLiveRegionProps()}>
              {error}
            </Text>
          ) : null}
        </View>

        {input.kind === "build" ? (
          <View className="gap-2">
            <Label>{t("form.twoMinuteLabel")}</Label>
            <Input
              accessibilityLabel={t("form.twoMinuteLabel")}
              maxLength={HABIT_TWO_MINUTE_MAX}
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
              maxLength={HABIT_TWO_MINUTE_MAX}
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
          <Label>{t("form.cadenceLabel")}</Label>
          <View
            accessibilityLabel={t("form.cadenceLabel")}
            accessibilityRole="radiogroup"
            className="flex-row flex-wrap gap-2"
            role="radiogroup"
          >
            <CadenceChip
              active={input.cadence === "daily"}
              label={t("form.cadenceDaily")}
              onPress={() => update("cadence", "daily" as HabitCadence)}
              rovingProps={cadenceRoving.getItemProps(0, () =>
                update("cadence", "daily" as HabitCadence),
              )}
            />
            <CadenceChip
              active={input.cadence === "weekdays"}
              label={t("form.cadenceWeekdays")}
              onPress={() => update("cadence", "weekdays" as HabitCadence)}
              rovingProps={cadenceRoving.getItemProps(1, () =>
                update("cadence", "weekdays" as HabitCadence),
              )}
            />
            <CadenceChip
              active={input.cadence === "custom"}
              label={t("form.cadenceCustom")}
              onPress={() => update("cadence", "custom" as HabitCadence)}
              rovingProps={cadenceRoving.getItemProps(2, () =>
                update("cadence", "custom" as HabitCadence),
              )}
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
                  aria-checked={input.customDays.includes(day)}
                  hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                  onPress={() => toggleCustomDay(day)}
                  className={cn(
                    "h-10 flex-1 items-center justify-center rounded-md border",
                    input.customDays.includes(day)
                      ? "border-primary bg-primary/15"
                      : "border-border bg-background",
                  )}
                  role="checkbox"
                  {...spaceKeyActivationProps(() => toggleCustomDay(day))}
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
          <View
            accessibilityLabel={t("form.colorLabel")}
            accessibilityRole="radiogroup"
            className="flex-row flex-wrap gap-2"
            role="radiogroup"
          >
            {colorChoices.map((color, index) => (
              <ColorChip
                key={color}
                active={activeColor === color}
                color={color}
                label={t(`form.colors.${color}` as const)}
                onPress={() => setPickedColor(color)}
                rovingProps={colorRoving.getItemProps(index, () => setPickedColor(color))}
              />
            ))}
          </View>
        </View>

        {/*
          Four prompts become three (#760). The Response prompt is gone: it IS
          the two-minute version, which sits above the fold, so the form asked
          the same question twice in two different vocabularies.

          `kind` leads the section because everything under it relabels on
          `kind` - putting the switch after the fields it renames reads as the
          form changing its mind.
        */}
        <Disclosure
          testID="habit-details-disclosure"
          expanded={detailsOpen}
          onToggle={() => setDetailsToggled(!detailsOpen)}
          label={input.kind === "break" ? t("form.moreBreak") : t("form.moreBuild")}
        >
          <View className="gap-2">
            <Label>{t("form.kindLabel")}</Label>
            <View
              accessibilityLabel={t("form.kindLabel")}
              accessibilityRole="radiogroup"
              className="flex-row gap-2"
              role="radiogroup"
            >
              <KindChip
                active={input.kind === "build"}
                label={t("form.kindBuild")}
                onPress={() => update("kind", "build" as HabitKind)}
                rovingProps={kindRoving.getItemProps(0, () => update("kind", "build" as HabitKind))}
              />
              <KindChip
                active={input.kind === "break"}
                label={t("form.kindBreak")}
                onPress={() => update("kind", "break" as HabitKind)}
                rovingProps={kindRoving.getItemProps(1, () => update("kind", "break" as HabitKind))}
              />
            </View>
            <Text variant="muted" className="text-xs">
              {input.kind === "break" ? t("form.kindBreakHelp") : t("form.kindBuildHelp")}
            </Text>
          </View>

          <View className="gap-2">
            <Label>{t("form.identityLabel")}</Label>
            <Input
              accessibilityLabel={t("form.identityLabel")}
              maxLength={HABIT_IDENTITY_MAX}
              onChangeText={(v) => update("identity", v)}
              placeholder={t("form.identityPlaceholder")}
              value={input.identity}
            />
            <Text variant="muted" className="text-xs">
              {t("form.identityHelp")}
            </Text>
          </View>

          <View className="gap-2">
            <Label>{input.kind === "break" ? t("form.invisibleLabel") : t("form.cueLabel")}</Label>
            <Textarea
              accessibilityLabel={
                input.kind === "break" ? t("form.invisibleLabel") : t("form.cueLabel")
              }
              maxLength={HABIT_CUE_MAX}
              onChangeText={(v) => update("cuePlan", v)}
              placeholder={
                input.kind === "break" ? t("form.invisiblePlaceholder") : t("form.cuePlaceholder")
              }
              value={input.cuePlan}
            />
          </View>

          <View className="gap-2">
            <Label>
              {input.kind === "break" ? t("form.unattractiveLabel") : t("form.pairingLabel")}
            </Label>
            <Textarea
              accessibilityLabel={
                input.kind === "break" ? t("form.unattractiveLabel") : t("form.pairingLabel")
              }
              maxLength={HABIT_PAIRING_MAX}
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
              maxLength={HABIT_REWARD_MAX}
              onChangeText={(v) => update("rewardNote", v)}
              placeholder={
                input.kind === "break"
                  ? t("form.unsatisfyingPlaceholder")
                  : t("form.rewardPlaceholder")
              }
              value={input.rewardNote}
            />
          </View>

          {/*
            Retired from create, kept in edit wherever a habit already holds one
            (#760). Habit stacking is a real technique, but it is the one prompt
            that asks a brand-new user to name a habit they have not entered
            yet, so it earns nothing on a first habit and costs a field.

            Keyed on the STORED value, not the live input - the same trap the
            grandfathered colour avoids above. Keying it on `input.stackAfter`
            would make the field vanish the moment the user cleared it, leaving
            no way to put the text back without abandoning every other edit.
          */}
          {storedStackAfter ? (
            <View className="gap-2">
              <Label>{t("form.stackLabel")}</Label>
              <Input
                accessibilityLabel={t("form.stackLabel")}
                maxLength={HABIT_STACK_MAX}
                onChangeText={(v) => update("stackAfter", v)}
                placeholder={t("form.stackPlaceholder")}
                value={input.stackAfter}
              />
            </View>
          ) : null}
        </Disclosure>
      </MobileFormScreen>
    </View>
  );
}

// getItemProps result from useRovingFocus: web-only ref/tabIndex/onKeyDown ({} on native).
type RovingItemProps = ReturnType<ReturnType<typeof useRovingFocus>["getItemProps"]>;

interface ChipProps {
  active: boolean;
  label: string;
  onPress: () => void;
  rovingProps: RovingItemProps;
}

function KindChip({ active, label, onPress, rovingProps }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      aria-checked={active}
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onPress}
      className={cn(
        "rounded-full border px-4 py-2",
        active ? "border-primary bg-primary/15" : "border-border bg-background",
      )}
      role="radio"
      {...rovingProps}
    >
      <Text className={cn("text-sm font-semibold", active && "text-primary")}>{label}</Text>
    </Pressable>
  );
}

function CadenceChip({ active, label, onPress, rovingProps }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      aria-checked={active}
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onPress}
      className={cn(
        "rounded-full border px-4 py-2",
        active ? "border-primary bg-primary/15" : "border-border bg-background",
      )}
      role="radio"
      {...rovingProps}
    >
      <Text className={cn("text-sm", active && "font-semibold text-primary")}>{label}</Text>
    </Pressable>
  );
}

interface ColorChipProps extends ChipProps {
  color: HabitColor;
}

function ColorChip({ active, color, label, onPress, rovingProps }: ColorChipProps) {
  const chip = useHabitChipPalette()[color];
  return (
    <Pressable
      accessibilityRole="radio"
      aria-checked={active}
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onPress}
      className="flex-row items-center gap-2 rounded-full border px-3 py-2"
      // Selection rides on the chip ink, the one stop certified against the
      // room surface - the soft border it replaces is too faint to read as a
      // state on a pale hue (WCAG 1.4.11).
      style={{ backgroundColor: chip.fill, borderColor: active ? chip.ink : chip.border }}
      role="radio"
      {...rovingProps}
    >
      {/* The swatch samples the hue's published accent; its ink ring keeps the
          edge perceivable for the light hues the accent alone can't carry. */}
      <View
        className="size-4 rounded-full border"
        style={{ backgroundColor: chip.accent, borderColor: chip.ink }}
      />
      <Text className="text-xs font-semibold" style={{ color: chip.ink }}>
        {label}
      </Text>
    </Pressable>
  );
}
