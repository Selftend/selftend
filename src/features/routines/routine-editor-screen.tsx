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
import { Text } from "@/src/components/react-native-reusables/text";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { LoadingState } from "@/src/components/app/screen-state";
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
import type { RoutineWithSteps } from "@/src/features/routines/types";
import {
  announceMessage,
  DEFAULT_INTERACTIVE_HIT_SLOP,
  politeLiveRegionProps,
} from "@/src/lib/accessibility";
import { useSingleFlight } from "@/src/lib/use-single-flight";
import { useSession } from "@/src/providers/session-provider";
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
    setError("");
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
    try {
      const savedId = editMode ? await saveEdit(trimmedName) : await saveCreate(trimmedName);
      router.replace({
        pathname: "/routines/[id]",
        params: { id: savedId },
      } as Parameters<typeof router.replace>[0]);
    } catch (e) {
      showError(e instanceof Error ? e.message : t("form.saveError"));
    }
  });

  async function saveCreate(trimmedName: string): Promise<string> {
    const routine = await createMutation.mutateAsync({ name: trimmedName });
    for (const [index, step] of steps.entries()) {
      await addStepMutation.mutateAsync({
        routineId: routine.id,
        toolId: step.toolId,
        position: index,
      });
    }
    return routine.id;
  }

  // Persist the edit as a diff against the loaded routine: rename, remove
  // dropped steps, insert new ones at their final index, then normalize every
  // position with one reorder when the set or order changed.
  async function saveEdit(trimmedName: string): Promise<string> {
    if (!existing || !routineId) throw new Error(t("detail.notFound"));

    if (trimmedName !== existing.name) {
      await updateMutation.mutateAsync({ id: routineId, patch: { name: trimmedName } });
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
