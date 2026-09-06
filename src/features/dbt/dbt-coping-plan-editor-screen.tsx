import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import Sortable from "react-native-sortables";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Input } from "@/src/components/react-native-reusables/input";
import { Text } from "@/src/components/react-native-reusables/text";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { CrisisSupportBar } from "@/src/components/app/crisis-support-bar";
import { ScreenTopBar } from "@/src/components/app/screen-top-bar";
import {
  DEFAULT_INTERACTIVE_HIT_SLOP,
  enterKeyActivationProps,
  politeLiveRegionProps,
} from "@/src/lib/accessibility";
import { FORM_COLUMN } from "@/src/lib/layout";
import { CHROME_MARK } from "@/src/lib/theme/chrome";
import { useSingleFlight } from "@/src/lib/use-single-flight";
import { cn } from "@/lib/utils";
import {
  COPING_PLAN_SECTIONS,
  FALLBACK_MAX,
  FALLBACK_MIN,
  OWN_TEXT_MAX,
  PLAN_ITEM_MAX,
  familiesOf,
  pickLabelKey,
} from "@/src/features/dbt/coping-plan-registry";
import { useItemLabel } from "@/src/features/dbt/coping-plan-card";
import { useCopingPlan, useDeleteCopingPlan, useSaveCopingPlan } from "@/src/features/dbt/queries";
import type {
  CopingPlanDocument,
  CopingPlanItem,
  CopingPlanSection,
} from "@/src/features/dbt/types";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

/**
 * `/modules/dbt/coping-plan/edit` - the builder (spec §3.1.1, design `1b`).
 *
 * Three menus of app-written picks with the person's own lines beside them,
 * and one ordered fallback list drawn from whatever is on the plan. Editing is
 * in place: one document, one Save, no versions and no history. A plan is not
 * a record, so nothing here touches `record_days` and no day is ever marked.
 *
 * ☠️ **An item must be ON the plan to be on the list.** Taking a pick out of a
 * section takes it off the fallback list too, and the list renumbers - which is
 * why `fallback` holds item ids and the normaliser drops any id whose item has
 * gone. Storing labels or positions instead would let the list outlive the
 * thing it points at.
 *
 * The list is reorderable by drag AND by a pair of arrows, the routine
 * editor's shape: a drag handle is a pointer affordance, and the order here is
 * the whole content of the list, so it has to be reachable from a keyboard and
 * a screen reader too.
 */
export default function DbtCopingPlanEditorScreen() {
  const { t } = useTranslation("dbt");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const showToast = useToastStore((state) => state.showToast);

  const { data: existing } = useCopingPlan(userId);
  const saveMutation = useSaveCopingPlan(userId);
  const deleteMutation = useDeleteCopingPlan(userId);
  const label = useItemLabel();

  // The plan is seeded ONCE from whatever the query had when this screen
  // mounted. The route is declared plain rather than singular for exactly this
  // reason: it holds the person's unsaved work, so a reused instance would hand
  // them back a half-edited plan instead of the one they just saved.
  const [items, setItems] = useState<CopingPlanItem[]>(() => existing?.plan.items ?? []);
  const [fallback, setFallback] = useState<string[]>(() => existing?.plan.fallback ?? []);
  const [ownDrafts, setOwnDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const chosenPickKeys = useMemo(
    () => new Set(items.filter((item) => item.kind === "pick").map((item) => item.pickKey)),
    [items],
  );
  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  // A local id for an item the person has just added. A counter in a ref
  // rather than a clock or a random: render has to stay pure, and `new-` can
  // never collide with an id that came back from the database (the guard's own
  // ids are generated there). The id only has to be unique within this edit -
  // the document is saved whole.
  const localIdRef = useRef(0);
  const nextId = () => {
    localIdRef.current += 1;
    return `new-${localIdRef.current}`;
  };

  function togglePick(section: CopingPlanSection, pickKey: string) {
    setError(null);
    setItems((prev) => {
      const found = prev.find((item) => item.kind === "pick" && item.pickKey === pickKey);
      if (found) {
        setFallback((list) => list.filter((id) => id !== found.id));
        return prev.filter((item) => item.id !== found.id);
      }
      if (prev.length >= PLAN_ITEM_MAX) {
        setError(t("copingPlan.full"));
        return prev;
      }
      return [
        ...prev,
        {
          id: nextId(),
          section,
          kind: "pick",
          pickKey,
          homeOnly: false,
          position: prev.length,
        },
      ];
    });
  }

  function addOwn(section: CopingPlanSection) {
    const text = (ownDrafts[section] ?? "").trim();
    if (!text) return;
    setError(null);
    setItems((prev) => {
      if (prev.length >= PLAN_ITEM_MAX) {
        setError(t("copingPlan.full"));
        return prev;
      }
      return [
        ...prev,
        {
          id: nextId(),
          section,
          kind: "own",
          text: text.slice(0, OWN_TEXT_MAX),
          homeOnly: false,
          position: prev.length,
        },
      ];
    });
    setOwnDrafts((prev) => ({ ...prev, [section]: "" }));
  }

  function removeItem(id: string) {
    setError(null);
    setItems((prev) => prev.filter((item) => item.id !== id));
    setFallback((prev) => prev.filter((entry) => entry !== id));
  }

  function toggleFallback(id: string) {
    setError(null);
    setFallback((prev) => {
      if (prev.includes(id)) return prev.filter((entry) => entry !== id);
      if (prev.length >= FALLBACK_MAX) return prev;
      return [...prev, id];
    });
  }

  function toggleHomeOnly(id: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, homeOnly: !item.homeOnly } : item)),
    );
  }

  function moveFallback(index: number, delta: number) {
    setFallback((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  const save = useSingleFlight(async () => {
    if (fallback.length > 0 && (fallback.length < FALLBACK_MIN || fallback.length > FALLBACK_MAX)) {
      setError(t("copingPlan.fallback.error"));
      return;
    }
    const document: CopingPlanDocument = {
      items: items.map((item, index) => ({ ...item, position: index })),
      fallback,
    };
    try {
      await saveMutation.mutateAsync({ plan: document, existingId: existing?.id ?? null });
      showToast({ title: t("copingPlan.saved"), tone: "success" });
      router.replace("/modules/dbt/coping-plan");
    } catch {
      // ⚠️ The mutation suppresses the global toast, so the failure has to be
      // said here or it is said nowhere.
      showToast({ title: t("copingPlan.saveError"), tone: "error" });
    }
  });

  const removePlan = useSingleFlight(async () => {
    if (!existing) return;
    try {
      await deleteMutation.mutateAsync(existing.id);
      router.replace("/modules/dbt/coping-plan");
    } catch {
      showToast({ title: t("copingPlan.saveError"), tone: "error" });
    }
  });

  const saving = saveMutation.isPending || deleteMutation.isPending;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ConfirmDialog
        visible={confirmDelete}
        isPending={deleteMutation.isPending}
        title={t("copingPlan.deleteTitle")}
        message={t("copingPlan.deleteBody")}
        confirmLabel={t("copingPlan.deleteConfirm")}
        cancelLabel={t("copingPlan.deleteCancel")}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          void removePlan();
        }}
      />
      <ScreenTopBar leading="close" />
      <ScrollView contentContainerClassName="grow p-6">
        <View className={cn(FORM_COLUMN, "gap-7")}>
          <View className="gap-2">
            <Text variant="h1" className="text-[26px] font-bold leading-tight tracking-tight">
              {t("copingPlan.editTitle")}
            </Text>
            <Text variant="muted" className="text-[14px] leading-snug">
              {t("copingPlan.editHelp")}
            </Text>
          </View>

          <CrisisSupportBar />

          {COPING_PLAN_SECTIONS.map((section) => (
            <SectionEditor
              key={section}
              section={section}
              items={items.filter((item) => item.section === section)}
              chosenPickKeys={chosenPickKeys}
              draft={ownDrafts[section] ?? ""}
              onDraftChange={(value) =>
                setOwnDrafts((prev) => ({ ...prev, [section]: value.slice(0, OWN_TEXT_MAX) }))
              }
              onAddOwn={() => addOwn(section)}
              onTogglePick={(pickKey) => togglePick(section, pickKey)}
              onRemove={removeItem}
              label={label}
            />
          ))}

          <View className="gap-3">
            <View className="gap-1">
              <Text variant="h2" className="text-[17px] font-bold tracking-tight">
                {t("copingPlan.fallback.title")}
              </Text>
              <Text variant="muted" className="text-[13px] leading-snug">
                {t("copingPlan.fallback.help")}
              </Text>
            </View>

            {fallback.length === 0 ? (
              <Text variant="muted">{t("copingPlan.fallback.empty")}</Text>
            ) : (
              <Sortable.Flex
                flexDirection="column"
                gap={8}
                dragActivationDelay={0}
                sortEnabled={!saving}
                customHandle
                onDragEnd={({ order }) => setFallback((prev) => order(prev))}
              >
                {fallback.map((id, index) => {
                  const item = itemsById.get(id);
                  if (!item) return null;
                  const text = label(item) ?? "";
                  return (
                    <FallbackRow
                      key={id}
                      index={index}
                      isFirst={index === 0}
                      isLast={index === fallback.length - 1}
                      text={text}
                      homeOnly={item.homeOnly}
                      saving={saving}
                      onMoveUp={() => moveFallback(index, -1)}
                      onMoveDown={() => moveFallback(index, 1)}
                      onToggleHomeOnly={() => toggleHomeOnly(id)}
                      onRemove={() => toggleFallback(id)}
                    />
                  );
                })}
              </Sortable.Flex>
            )}

            {/* Everything on the plan, as candidates for the list. An item has
                to be on the plan to be on the list, so this run IS the plan. */}
            {items.length > 0 ? (
              <View className="flex-row flex-wrap gap-2">
                {items.map((item) => {
                  const text = label(item);
                  if (!text) return null;
                  const on = fallback.includes(item.id);
                  const full = !on && fallback.length >= FALLBACK_MAX;
                  const toggle = () => toggleFallback(item.id);
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="checkbox"
                      aria-checked={on}
                      aria-disabled={full}
                      accessibilityLabel={
                        on
                          ? t("copingPlan.fallback.remove", { item: text })
                          : t("copingPlan.fallback.add")
                      }
                      disabled={full}
                      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                      onPress={toggle}
                      {...enterKeyActivationProps(toggle)}
                      className={cn(
                        "flex-row items-center gap-1.5 rounded-full border px-2.5 py-1",
                        on ? "border-primary bg-primary/10" : "border-border bg-card",
                        full && "opacity-40",
                      )}
                    >
                      {on ? <Icon name="check" size={13} className={CHROME_MARK} /> : null}
                      <Text className="text-xs font-medium">{text}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>

          {error ? (
            <Text className="text-sm text-destructive" {...politeLiveRegionProps()}>
              {error}
            </Text>
          ) : null}

          <View className="gap-3">
            <Button disabled={saving} onPress={() => void save()}>
              <Text>{saving ? t("copingPlan.saving") : t("copingPlan.save")}</Text>
            </Button>
            {existing ? (
              <Button variant="ghost" disabled={saving} onPress={() => setConfirmDelete(true)}>
                <Text className="text-destructive">{t("copingPlan.deletePlan")}</Text>
              </Button>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface SectionEditorProps {
  section: CopingPlanSection;
  items: CopingPlanItem[];
  chosenPickKeys: Set<string | undefined>;
  draft: string;
  onDraftChange: (value: string) => void;
  onAddOwn: () => void;
  onTogglePick: (pickKey: string) => void;
  onRemove: (id: string) => void;
  label: (item: CopingPlanItem) => string | null;
}

/** One menu: its families as uppercase labels over runs of chips, then own lines. */
function SectionEditor({
  section,
  items,
  chosenPickKeys,
  draft,
  onDraftChange,
  onAddOwn,
  onTogglePick,
  onRemove,
  label,
}: SectionEditorProps) {
  const { t } = useTranslation("dbt");
  const families = familiesOf(section);
  const ownItems = items.filter((item) => item.kind === "own");

  return (
    <View className="gap-3">
      <View className="gap-1">
        <Text variant="h2" className="text-[17px] font-bold tracking-tight">
          {t(`copingPlan.sections.${section}.name`)}
        </Text>
        <Text variant="muted" className="text-[13px] leading-snug">
          {t(`copingPlan.sections.${section}.help`)}
        </Text>
      </View>

      {families.map(({ family, picks }) => (
        <View key={family ?? "flat"} className="gap-1.5">
          {family ? (
            <Text variant="muted" className="text-[11px] font-semibold uppercase tracking-[0.1em]">
              {t(`families.${family}`)}
            </Text>
          ) : null}
          <View className="flex-row flex-wrap gap-2">
            {picks.map((pick) => {
              const on = chosenPickKeys.has(pick.key);
              const text = t(pickLabelKey(pick.key));
              const toggle = () => onTogglePick(pick.key);
              return (
                <Pressable
                  key={pick.key}
                  accessibilityRole="checkbox"
                  aria-checked={on}
                  hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                  onPress={toggle}
                  {...enterKeyActivationProps(toggle)}
                  className={cn(
                    "flex-row items-center gap-1.5 rounded-full border px-2.5 py-1.5",
                    on ? "border-primary bg-primary/10" : "border-border bg-card",
                  )}
                >
                  {on ? <Icon name="check" size={13} className={CHROME_MARK} /> : null}
                  <Text className="text-[13px]">{text}</Text>
                  {/* A pick that carries a route says so here as well as on the
                      card, so the choice is made knowing what it opens. */}
                  {pick.route ? <Icon name="north-east" size={12} className={CHROME_MARK} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      <View className="gap-2">
        {ownItems.length > 0 ? (
          <View className="gap-1.5">
            {ownItems.map((item) => {
              const text = label(item) ?? "";
              return (
                <View
                  key={item.id}
                  className="flex-row items-center gap-2 rounded-xl border border-border bg-card px-3 py-2"
                >
                  <Text className="flex-1 text-[13.5px]">{text}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("copingPlan.own.remove", { item: text })}
                    hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                    onPress={() => onRemove(item.id)}
                  >
                    <Icon name="close" size={16} className="text-muted-foreground" />
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : null}

        <View className="flex-row items-center gap-2">
          <Input
            className="flex-1"
            value={draft}
            onChangeText={onDraftChange}
            placeholder={t("copingPlan.own.placeholder")}
            maxLength={OWN_TEXT_MAX}
            accessibilityLabel={t("copingPlan.own.add")}
            onSubmitEditing={onAddOwn}
            returnKeyType="done"
          />
          <Button size="sm" variant="outline" disabled={!draft.trim()} onPress={onAddOwn}>
            <Text>{t("copingPlan.own.save")}</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}

interface FallbackRowProps {
  index: number;
  isFirst: boolean;
  isLast: boolean;
  text: string;
  homeOnly: boolean;
  saving: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleHomeOnly: () => void;
  onRemove: () => void;
}

/** One rung of the fallback list: handle, number, words, the home mark, arrows. */
function FallbackRow({
  index,
  isFirst,
  isLast,
  text,
  homeOnly,
  saving,
  onMoveUp,
  onMoveDown,
  onToggleHomeOnly,
  onRemove,
}: FallbackRowProps) {
  const { t } = useTranslation("dbt");

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
      <Text className="flex-1 text-sm font-semibold">{text}</Text>
      <Pressable
        accessibilityRole="checkbox"
        aria-checked={homeOnly}
        accessibilityLabel={t("copingPlan.fallback.homeOnlyToggle")}
        hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
        onPress={onToggleHomeOnly}
        className={cn(
          "size-7 items-center justify-center rounded-full border",
          homeOnly ? "border-primary bg-primary/10" : "border-border bg-background",
        )}
      >
        <Icon name="home" size={14} className={homeOnly ? CHROME_MARK : "text-muted-foreground"} />
      </Pressable>
      <Pressable
        accessibilityLabel={t("copingPlan.fallback.moveUp", { item: text })}
        accessibilityRole="button"
        disabled={isFirst || saving}
        hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
        onPress={onMoveUp}
        className="size-7 items-center justify-center rounded-full border border-border bg-background disabled:opacity-40"
      >
        <Icon name="keyboard-arrow-up" size={16} className="text-muted-foreground" />
      </Pressable>
      <Pressable
        accessibilityLabel={t("copingPlan.fallback.moveDown", { item: text })}
        accessibilityRole="button"
        disabled={isLast || saving}
        hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
        onPress={onMoveDown}
        className="size-7 items-center justify-center rounded-full border border-border bg-background disabled:opacity-40"
      >
        <Icon name="keyboard-arrow-down" size={16} className="text-muted-foreground" />
      </Pressable>
      <Pressable
        accessibilityLabel={t("copingPlan.fallback.remove", { item: text })}
        accessibilityRole="button"
        hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
        onPress={onRemove}
      >
        <Icon name="close" size={16} className="text-muted-foreground" />
      </Pressable>
    </View>
  );
}
