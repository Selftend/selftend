import { router, type Href } from "expo-router";
import { ActivityIndicator, Pressable, View, type TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Sortable from "react-native-sortables";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Switch } from "@/src/components/react-native-reusables/switch";
import { Text } from "@/src/components/react-native-reusables/text";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { LoadingState } from "@/src/components/app/screen-state";
import { TimeField } from "@/src/components/app/time-field";
import {
  NOTIFICATION_TARGETS,
  readEnabled,
  type NotificationTarget,
} from "@/src/features/notifications/registry";
import { STEPPABLE_TOOL_IDS, type SteppableToolId } from "@/src/features/routines/derive";
import {
  useAddStep,
  useCreateRoutine,
  useRemoveStep,
  useReorderSteps,
  useRoutine,
  useRoutines,
  useUpdateRoutine,
} from "@/src/features/routines/queries";
import { ROUTINE_NAME_MAX, routineInputSchema } from "@/src/features/routines/schemas";
import type { RoutineInput, RoutineUpdate, RoutineWithSteps } from "@/src/features/routines/types";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import {
  announceMessage,
  DEFAULT_INTERACTIVE_HIT_SLOP,
  politeLiveRegionProps,
} from "@/src/lib/accessibility";
import { cancelReminder, getReminderTimeZone, scheduleReminder } from "@/src/lib/notifications";
import { useSingleFlight } from "@/src/lib/use-single-flight";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { clampTime, type TimeOfDay } from "@/src/utils/time";
import { cn } from "@/lib/utils";

interface RoutineEditorScreenProps {
  fallbackHref: Href;
  mode: "create" | "edit";
  routineId?: string | null;
}

// A step row in the editor. `id` is the persisted step id (null until Save
// creates it); `key` stays stable across reorders so rows don't remount.
interface EditorStep {
  key: string;
  id: string | null;
  toolId: SteppableToolId;
}

// Default reminder time when none is stored yet - mirrors the per-tool cards'
// readHour/readMinute fallbacks (19:00).
const DEFAULT_REMINDER_TIME: TimeOfDay = { hour: 19, minute: 0 };

export function RoutineEditorScreen({
  fallbackHref,
  mode,
  routineId = null,
}: RoutineEditorScreenProps) {
  const { t } = useTranslation("routines");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: cachedList } = useRoutines(mode === "edit" ? userId : null);
  const fromCache = routineId ? (cachedList?.find((r) => r.id === routineId) ?? null) : null;
  const { data: fetched, isLoading } = useRoutine(
    mode === "edit" && !fromCache ? userId : null,
    mode === "edit" && !fromCache ? routineId : null,
  );
  const existing: RoutineWithSteps | null = mode === "edit" ? (fromCache ?? fetched ?? null) : null;

  const createMutation = useCreateRoutine(userId);
  const updateMutation = useUpdateRoutine(userId);
  const addStepMutation = useAddStep(userId);
  const removeStepMutation = useRemoveStep(userId);
  const reorderStepsMutation = useReorderSteps(userId);
  const { data: preferences } = useUserPreferences(userId);
  const updatePreferences = useUpdateUserPreferences(userId);
  const showToast = useToastStore((state) => state.showToast);

  const editMode = mode === "edit";
  const saving =
    createMutation.isPending ||
    updateMutation.isPending ||
    addStepMutation.isPending ||
    removeStepMutation.isPending ||
    reorderStepsMutation.isPending;

  // Create starts from the i18n default name (spec: "My daily routine").
  const [name, setName] = useState(() => (editMode ? "" : t("form.defaultName")));
  const [steps, setSteps] = useState<EditorStep[]>([]);
  const [error, setError] = useState("");
  // Routine reminder (spec #37/#47): an independent opt-in, OFF by default.
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState<TimeOfDay>(DEFAULT_REMINDER_TIME);
  const [reminderError, setReminderError] = useState("");
  const nameInputRef = useRef<TextInput>(null);
  const localKeyRef = useRef(0);

  // Hydrate ONCE per routine id; keying on the id (not the object) stops a later
  // refetch's new object identity from clobbering the user's in-progress edits.
  const hydratedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!existing) return;
    if (hydratedIdRef.current === existing.id) return;
    hydratedIdRef.current = existing.id;
    setName(existing.name);
    setSteps(existing.steps.map((step) => ({ key: step.id, id: step.id, toolId: step.toolId })));
    setReminderEnabled(existing.reminderEnabled);
    setReminderTime({
      hour: existing.reminderHour ?? DEFAULT_REMINDER_TIME.hour,
      minute: existing.reminderMinute ?? DEFAULT_REMINDER_TIME.minute,
    });
    setError("");
    setReminderError("");
  }, [existing]);

  function addStep(toolId: SteppableToolId) {
    setSteps((prev) => {
      if (prev.some((step) => step.toolId === toolId)) return prev;
      localKeyRef.current += 1;
      return [...prev, { key: `new-${localKeyRef.current}`, id: null, toolId }];
    });
  }

  function removeStep(key: string) {
    setSteps((prev) => prev.filter((step) => step.key !== key));
  }

  function moveStep(index: number, delta: -1 | 1) {
    setSteps((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
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

  const globalEnabled = preferences?.notificationsEnabledGlobal ?? true;

  const handleSave = useSingleFlight(async () => {
    if (!user) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      showError(t("form.nameRequired"));
      // Focusing also scrolls the field into view on web (shared Input behavior).
      nameInputRef.current?.focus();
      return;
    }
    const parsed = routineInputSchema.safeParse({ name: trimmedName });
    if (!parsed.success) {
      showError(t("form.saveError"));
      return;
    }
    setError("");
    setReminderError("");
    try {
      // Enabling the reminder is the explicit opt-in moment (AGENTS.md: every OS
      // nudge traces to exactly one explicit opt-in): ensure the push channel is
      // registered the same way enabling a per-tool target does. If the channel
      // can't be enabled, save everything else with the reminder OFF and say so -
      // a reminder is never persisted as on without a working opt-in path.
      let channelFailed = false;
      let effectiveReminderEnabled = reminderEnabled;
      if (reminderEnabled && globalEnabled) {
        const { hour, minute } = clampTime(reminderTime);
        const result = await scheduleReminder("routine", hour, minute, user.id);
        if (result.enabled) {
          if (preferences && !preferences.reminderConsent) {
            await updatePreferences.mutateAsync({
              reminderConsent: true,
              reminderConsentUpdatedAt: new Date().toISOString(),
            });
          }
        } else {
          channelFailed = true;
          effectiveReminderEnabled = false;
          setReminderEnabled(false);
        }
      }

      const savedId = editMode
        ? await saveEdit(trimmedName, effectiveReminderEnabled)
        : await saveCreate(trimmedName, effectiveReminderEnabled);
      if (channelFailed) {
        // Stay on the editor so the explanation is visible; the routine itself saved.
        const message = t("reminder.channelError");
        setReminderError(message);
        announceMessage(message);
        return;
      }
      router.replace({
        pathname: "/routines/[id]",
        params: { id: savedId },
      } as Parameters<typeof router.replace>[0]);
    } catch (e) {
      showError(e instanceof Error ? e.message : t("form.saveError"));
    }
  });

  async function saveCreate(trimmedName: string, remEnabled: boolean): Promise<string> {
    const input: RoutineInput = { name: trimmedName };
    if (remEnabled) {
      const { hour, minute } = clampTime(reminderTime);
      input.reminderEnabled = true;
      input.reminderHour = hour;
      input.reminderMinute = minute;
      input.reminderTimezone = getReminderTimeZone();
    }
    const routine = await createMutation.mutateAsync(input);
    for (const [index, step] of steps.entries()) {
      await addStepMutation.mutateAsync({
        routineId: routine.id,
        toolId: step.toolId,
        position: index,
      });
    }
    return routine.id;
  }

  // Persist the edit as a diff against the loaded routine: rename and/or change
  // the reminder in one update, remove dropped steps, insert new ones at their
  // final index, then normalize every position with one reorder when the set or
  // order changed.
  async function saveEdit(trimmedName: string, remEnabled: boolean): Promise<string> {
    if (!existing || !routineId) throw new Error(t("detail.notFound"));

    const patch: RoutineUpdate = {};
    if (trimmedName !== existing.name) patch.name = trimmedName;
    const { hour, minute } = clampTime(reminderTime);
    const reminderChanged =
      remEnabled !== existing.reminderEnabled ||
      (remEnabled && (hour !== existing.reminderHour || minute !== existing.reminderMinute));
    if (reminderChanged) {
      patch.reminderEnabled = remEnabled;
      patch.reminderHour = hour;
      patch.reminderMinute = minute;
      patch.reminderTimezone = getReminderTimeZone();
    }
    if (Object.keys(patch).length > 0) {
      await updateMutation.mutateAsync({ id: routineId, patch });
    }

    const keptIds = new Set(steps.map((step) => step.id).filter((id): id is string => id !== null));
    for (const step of existing.steps) {
      if (!keptIds.has(step.id)) await removeStepMutation.mutateAsync(step.id);
    }

    const finalIds: string[] = [];
    for (const [index, step] of steps.entries()) {
      if (step.id) {
        finalIds.push(step.id);
        continue;
      }
      const created = await addStepMutation.mutateAsync({
        routineId,
        toolId: step.toolId,
        position: index,
      });
      finalIds.push(created.id);
    }

    const originalIds = existing.steps.map((step) => step.id);
    const changed =
      finalIds.length !== originalIds.length ||
      finalIds.some((id, index) => originalIds[index] !== id);
    if (changed && finalIds.length > 0) {
      await reorderStepsMutation.mutateAsync({ routineId, orderedStepIds: finalIds });
    }
    return routineId;
  }

  if (editMode && !fromCache && isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("form.editTitle")} />
        </View>
      </SafeAreaView>
    );
  }

  const usedTools = new Set(steps.map((step) => step.toolId));

  // Overlap (spec #37): steps whose tool has its OWN per-tool reminder enabled
  // while the routine reminder is on. Surfaced as a calm, non-blocking note with
  // a one-tap per-tool opt-out - nothing is ever consolidated automatically.
  const overlapTargets =
    reminderEnabled && preferences
      ? steps.flatMap((step) => {
          const target = NOTIFICATION_TARGETS.find((candidate) => candidate.key === step.toolId);
          return target?.enabledField && readEnabled(preferences, target)
            ? [{ toolId: step.toolId, target }]
            : [];
        })
      : [];

  // Mirrors the notification-target-card disable path: cancelReminder (a no-op by
  // design - delivery is server-driven) plus a preferences patch flipping ONLY this
  // target's enabled flag. Runs exclusively on the user's tap.
  async function turnOffToolReminder(target: NotificationTarget, toolLabel: string) {
    if (!userId || !target.enabledField) return;
    try {
      await cancelReminder(target.key, userId);
      await updatePreferences.mutateAsync({ [target.enabledField]: false });
      announceMessage(t("overlap.turnedOff", { tool: toolLabel }));
      showToast({ title: t("overlap.turnedOff", { tool: toolLabel }), tone: "success" });
    } catch {
      showToast({ title: t("overlap.turnOffError", { tool: toolLabel }), tone: "error" });
    }
  }

  return (
    <MobileFormScreen
      contentClassName="mx-auto w-full max-w-2xl gap-6"
      footer={
        <View className="mx-auto w-full max-w-2xl flex-row gap-3">
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
      }
    >
      <View className="gap-2">
        <ScreenHeader title={editMode ? t("form.editTitle") : t("form.newTitle")} />
      </View>

      <View className="gap-2">
        <Label>{t("form.nameLabel")}</Label>
        <Input
          ref={nameInputRef}
          accessibilityLabel={t("form.nameLabel")}
          maxLength={ROUTINE_NAME_MAX}
          onChangeText={setName}
          placeholder={t("form.defaultName")}
          value={name}
        />
        {error ? (
          <Text className="text-sm text-destructive" {...politeLiveRegionProps()}>
            {error}
          </Text>
        ) : null}
      </View>

      <View className="gap-2">
        <Label>{t("form.stepsLabel")}</Label>
        <Text variant="muted" className="text-xs">
          {t("form.stepsHelp")}
        </Text>
        {steps.length === 0 ? (
          <Text variant="muted">{t("form.stepsEmpty")}</Text>
        ) : (
          <Sortable.Flex
            flexDirection="column"
            gap={8}
            dragActivationDelay={0}
            sortEnabled={!saving}
            customHandle
            onDragEnd={({ order }) => setSteps((prev) => order(prev))}
          >
            {steps.map((step, index) => (
              <StepRow
                key={step.key}
                index={index}
                isFirst={index === 0}
                isLast={index === steps.length - 1}
                label={t(`tools.${step.toolId}`)}
                onMoveDown={() => moveStep(index, 1)}
                onMoveUp={() => moveStep(index, -1)}
                onRemove={() => removeStep(step.key)}
                saving={saving}
              />
            ))}
          </Sortable.Flex>
        )}
      </View>

      <View className="gap-2">
        <Label>{t("form.addStepLabel")}</Label>
        <View className="flex-row flex-wrap gap-2">
          {STEPPABLE_TOOL_IDS.map((toolId) => {
            const used = usedTools.has(toolId);
            const label = t(`tools.${toolId}`);
            return (
              <Pressable
                key={toolId}
                accessibilityLabel={
                  used
                    ? t("form.stepAlreadyAdded", { tool: label })
                    : t("form.addStep", { tool: label })
                }
                accessibilityRole="button"
                disabled={used || saving}
                hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                onPress={() => addStep(toolId)}
                className={cn(
                  "flex-row items-center gap-1.5 rounded-full border px-3 py-2",
                  used ? "border-border bg-muted/40 opacity-50" : "border-border bg-background",
                )}
                role="button"
              >
                <Icon name={used ? "check" : "add"} className="size-4 text-muted-foreground" />
                <Text className="text-sm">{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="gap-2">
        <Label>{t("reminder.sectionLabel")}</Label>
        <Text variant="muted" className="text-xs">
          {t("reminder.help")}
        </Text>
        <View className="w-full flex-row items-center justify-between gap-4 rounded-2xl border border-border bg-card p-3">
          <Text className="flex-1 text-sm">{t("reminder.toggleLabel")}</Text>
          <Switch
            accessibilityLabel={t("reminder.toggleLabel")}
            checked={reminderEnabled}
            disabled={saving}
            onCheckedChange={setReminderEnabled}
          />
        </View>
        {reminderEnabled ? (
          <View className="gap-2">
            <Text className={cn("text-sm", saving && "text-muted-foreground")}>
              {t("reminder.timeLabel")}
            </Text>
            <TimeField
              value={reminderTime}
              onChange={setReminderTime}
              disabled={saving}
              accessibilityLabel={t("reminder.timeLabel")}
            />
          </View>
        ) : null}
        {reminderError ? (
          <Text className="text-sm text-destructive" {...politeLiveRegionProps()}>
            {reminderError}
          </Text>
        ) : null}
        {overlapTargets.length > 0 ? (
          <View className="gap-3 rounded-2xl border border-border bg-muted/40 p-3">
            <Text className="text-sm">{t("overlap.note")}</Text>
            {overlapTargets.map(({ toolId, target }) => {
              const label = t(`tools.${toolId}`);
              return (
                <View key={toolId} className="flex-row items-center justify-between gap-2">
                  <Text className="flex-1 text-sm font-semibold">{label}</Text>
                  <Button
                    accessibilityLabel={t("overlap.turnOff", { tool: label })}
                    disabled={saving || updatePreferences.isPending}
                    onPress={() => void turnOffToolReminder(target, label)}
                    size="sm"
                    variant="outline"
                  >
                    <Text>{t("overlap.turnOff", { tool: label })}</Text>
                  </Button>
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
    </MobileFormScreen>
  );
}

interface StepRowProps {
  index: number;
  isFirst: boolean;
  isLast: boolean;
  label: string;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove: () => void;
  saving: boolean;
}

// A numbered step-chain row: drag handle for pointer reorder, up/down arrows
// for keyboard/screen-reader reorder (order stays advisory either way).
function StepRow({
  index,
  isFirst,
  isLast,
  label,
  onMoveDown,
  onMoveUp,
  onRemove,
  saving,
}: StepRowProps) {
  const { t } = useTranslation("routines");

  return (
    <View className="w-full flex-row items-center gap-2 rounded-2xl border border-border bg-card p-3">
      <Sortable.Handle>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no"
          className="size-7 items-center justify-center rounded-full border border-border bg-background"
        >
          <Icon name="drag-indicator" className="size-4 text-muted-foreground" />
        </View>
      </Sortable.Handle>
      <View className="size-7 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
        <Text className="text-xs font-semibold text-primary">{index + 1}</Text>
      </View>
      <Text className="flex-1 text-sm font-semibold">{label}</Text>
      <Pressable
        accessibilityLabel={t("form.moveUp", { tool: label })}
        accessibilityRole="button"
        disabled={isFirst || saving}
        hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
        onPress={onMoveUp}
        className="size-7 items-center justify-center rounded-full border border-border bg-background disabled:opacity-40"
        role="button"
      >
        <Icon name="arrow-upward" className="size-4 text-muted-foreground" />
      </Pressable>
      <Pressable
        accessibilityLabel={t("form.moveDown", { tool: label })}
        accessibilityRole="button"
        disabled={isLast || saving}
        hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
        onPress={onMoveDown}
        className="size-7 items-center justify-center rounded-full border border-border bg-background disabled:opacity-40"
        role="button"
      >
        <Icon name="arrow-downward" className="size-4 text-muted-foreground" />
      </Pressable>
      <Pressable
        accessibilityLabel={t("form.removeStep", { tool: label })}
        accessibilityRole="button"
        disabled={saving}
        hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
        onPress={onRemove}
        className="size-7 items-center justify-center rounded-full border border-destructive/35 bg-background"
        role="button"
      >
        <Icon name="close" className="size-4 text-destructive" />
      </Pressable>
    </View>
  );
}
