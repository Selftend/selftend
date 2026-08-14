import { Platform, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { router } from "expo-router";
import Animated, { useAnimatedRef } from "react-native-reanimated";
import Sortable from "react-native-sortables";

import { AnimatedScrollView } from "@/src/components/app/animated-scroll-view";
import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { CHROME_MARK } from "@/src/lib/theme/chrome";
import { useSession } from "@/src/providers/session-provider";
import { WIDGET_META, isImplemented, metaForWidget } from "@/src/features/home/widget-registry";
import {
  useAddWidget,
  useRemoveWidget,
  useReorderWidgets,
  useRestoreWidget,
  useWidgetPreferences,
} from "@/src/features/home/queries";
import { cn } from "@/lib/utils";

const PADDING = 24;

/**
 * The `Guided programmes` tier's fixed order, mirroring `today-screen.tsx`.
 *
 * ⚠️ This tier is deliberately NOT sortable here, and that is the one place this screen
 * departs from #980 as written. #977 shipped the tier in a fixed CBT-then-ACT order
 * because `position` order does not give it: onboarding writes these ids in the order the
 * user tapped the module chips, so anyone who picked ACT first would get ACT first. A
 * drag that writes a `position` the home renderer then ignores is exactly the snap-back
 * lie #975 removed from the tool tier - the row returns to where it was and reads as
 * "drag is broken" rather than as a wrong write. Owner decision, 2026-08-14: keep the
 * fixed order; programme rows get remove and re-add, not reorder.
 */
const PROGRAMME_ORDER = ["cbt-programme", "act-programme"];

/**
 * An arrange edit, for the visit-scoped undo stack.
 *
 * `position` is an index into the FULL `widget_preferences` order, never into a rendered
 * array - see `removeWidget`. One face of #964.
 */
type WidgetEditAction =
  | { type: "add"; widgetId: string }
  | { type: "remove"; widgetId: string; position: number }
  | { type: "reorder"; widgetIds: string[] };

interface WebArrowKeyEvent {
  key: string;
  preventDefault: () => void;
}

/**
 * Web-only Up/Down activation for the drag handle. Native gets the same two moves through
 * `accessibilityActions`; this is the keyboard half, and `preventDefault` stops the arrows
 * from scrolling the page out from under the row being moved. No-op on native.
 */
function arrowKeyMoveProps(onMove: (offset: -1 | 1) => void) {
  if (Platform.OS !== "web") return {};
  return {
    onKeyDown: (event: WebArrowKeyEvent) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        onMove(-1);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        onMove(1);
      }
    },
  };
}

/**
 * One arranged row: glyph and name, and nothing else.
 *
 * There is no `Pressable` here - not a disabled one, not one wrapped in
 * `pointerEvents="none"`. Rows are inert on this screen, so the honest structure is a row
 * that was never interactive: no tab stop, no hover response, nothing announced as a
 * button that does not act. The two interactive children (handle, remove) are siblings.
 *
 * It also does not mount `ToolTierRow`: that would pull the whole stat-query fleet onto a
 * preferences screen to render numbers nobody is arranging. Arrange is about names and
 * order, so it renders names and order.
 */
function ArrangeRow({ id, t }: { id: string; t: TFunction }) {
  const meta = metaForWidget(id);
  return (
    <View className="min-w-0 flex-1 flex-row items-center gap-3 py-1">
      <Icon name={meta?.icon ?? "widgets"} className={cn("size-5 shrink-0", CHROME_MARK)} />
      <Text numberOfLines={1} className="min-w-0 flex-1 text-[15px] font-semibold">
        {meta ? t(meta.titleKey) : id}
      </Text>
    </View>
  );
}

/**
 * The drag handle, and the non-drag path with it.
 *
 * Home is the app's only reorderable surface, and drag-alone fails WCAG 2.2 SC 2.5.7
 * (Dragging Movements, AA). The chevron pair this replaced answered that with two more
 * controls per row; the handle answers it with none, by carrying the same two moves as
 * `accessibilityActions` (screen readers) and Up/Down keys (keyboard).
 *
 * Stated honestly: this closes the screen-reader and keyboard cases. A pointer-only user
 * still has only drag, so it remains a PARTIAL answer to SC 2.5.7.
 *
 * A `View` rather than a `Pressable`, with `accessible` and `focusable` set: a button
 * whose press does nothing would be a lie, and pressing a drag handle does nothing - the
 * gesture is the pointer path. `accessible` is safe on a leaf like this; it is only on a
 * group wrapper that it would collapse children into one node.
 */
function DragHandle({
  id,
  title,
  disabled,
  onMove,
  t,
}: {
  id: string;
  title: string;
  disabled: boolean;
  onMove: (offset: -1 | 1) => void;
  t: TFunction;
}) {
  return (
    <View
      accessible
      focusable={!disabled}
      accessibilityRole="button"
      accessibilityLabel={t("home.arrange.handle", { title })}
      accessibilityHint={t("home.arrange.handleHint")}
      accessibilityActions={[
        { name: "moveEarlier", label: t("today.dashboard.moveEarlier", { title }) },
        { name: "moveLater", label: t("today.dashboard.moveLater", { title }) },
      ]}
      onAccessibilityAction={(event) => {
        if (disabled) return;
        if (event.nativeEvent.actionName === "moveEarlier") onMove(-1);
        if (event.nativeEvent.actionName === "moveLater") onMove(1);
      }}
      {...(disabled ? {} : arrowKeyMoveProps(onMove))}
      testID={`arrange-handle-${id}`}
      className={cn(
        "size-9 items-center justify-center rounded-full border border-primary/35 bg-card",
        disabled && "opacity-40",
        Platform.select({ web: "hover:bg-accent" }),
      )}
    >
      <Icon name="drag-indicator" className="size-4 text-primary" />
    </View>
  );
}

/** The remove control, shared by both tiers. */
function RemoveButton({
  id,
  title,
  disabled,
  onRemove,
  t,
}: {
  id: string;
  title: string;
  disabled: boolean;
  onRemove: (id: string) => void;
  t: TFunction;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("today.dashboard.removeWidget", { title })}
      disabled={disabled}
      onPress={() => onRemove(id)}
      className={cn(
        "size-9 items-center justify-center rounded-full border border-destructive/35 bg-card active:bg-destructive/10 disabled:opacity-40",
        Platform.select({ web: "hover:bg-destructive/10" }),
      )}
    >
      <Icon name="close" className="size-4 text-destructive" />
    </Pressable>
  );
}

/** A section heading, rendered only with the rows it names. */
function SectionHeading({ children }: { children: string }) {
  return (
    <Text variant="h2" className="text-xl font-bold tracking-tight">
      {children}
    </Text>
  );
}

export default function ArrangeScreen() {
  const { t } = useTranslation("navigation");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const scrollableRef = useAnimatedRef<Animated.ScrollView>();
  /**
   * Visit-scoped by construction, and that is the whole of its lifecycle design. Arrange
   * is a route, so leaving it unmounts this state - there is no stack to grow stale across
   * a session, and nothing sturdier is proportionate to a preference row.
   */
  const [undoStack, setUndoStack] = useState<WidgetEditAction[]>([]);

  const { data: preferences } = useWidgetPreferences(userId);
  const addMutation = useAddWidget(userId);
  const removeMutation = useRemoveWidget(userId);
  const restoreMutation = useRestoreWidget(userId);
  const reorderMutation = useReorderWidgets(userId);

  const widgetIds = useMemo(
    () => (preferences ?? []).map((preference) => preference.widgetId).filter(isImplemented),
    [preferences],
  );

  const toolIds = useMemo(
    () => widgetIds.filter((id) => metaForWidget(id)?.tier === "tool"),
    [widgetIds],
  );

  const programmeIds = useMemo(
    () =>
      PROGRAMME_ORDER.filter(
        (id) => widgetIds.includes(id) && metaForWidget(id)?.tier === "programme",
      ),
    [widgetIds],
  );

  /**
   * Every id not already on the dashboard, in registry order, complete.
   *
   * Complete rather than a curated sample: the design's chip run showed nine of the 25 and
   * omitted six real ids, which would make them unreachable now that the three-level modal
   * is gone. Registry-ordered and unsearched: a ranking would be product-authored
   * curriculum, and searching a list you can see in full is chrome. The failure mode is
   * height (16 lines at 390dp with nothing added), not truncation, and it shrinks
   * monotonically as you add.
   */
  const addableIds = useMemo(
    () => Object.keys(WIDGET_META).filter((id) => !widgetIds.includes(id)),
    [widgetIds],
  );

  const mutationPending =
    addMutation.isPending ||
    removeMutation.isPending ||
    restoreMutation.isPending ||
    reorderMutation.isPending;

  const addWidget = (widgetId: string) => {
    if (mutationPending) return;
    addMutation.mutate(widgetId, {
      onSuccess: () => setUndoStack((current) => [...current, { type: "add", widgetId }]),
    });
  };

  const removeWidget = (widgetId: string) => {
    if (mutationPending) return;
    /**
     * The index in the FULL `widget_preferences` order, read off the preference rows -
     * NOT off `widgetIds`, and never off a rendered array. `restoreWidgetPreference`
     * splices into the unfiltered list, so a filtered index puts the row back in the
     * wrong place the moment the table holds an id this build cannot render. (One face
     * of #964.)
     */
    const position = (preferences ?? []).findIndex(
      (preference) => preference.widgetId === widgetId,
    );
    removeMutation.mutate(widgetId, {
      onSuccess: () =>
        setUndoStack((current) => [
          ...current,
          { type: "remove", widgetId, position: Math.max(position, 0) },
        ]),
    });
  };

  /**
   * Reorder within ONE tier. `set_widget_order` reassigns only the positions its named ids
   * already hold, so passing just the tool tier's ids leaves every other row where it is.
   * Within-tier reorder is the only expressible operation here, which is exactly what a
   * partitioned renderer can honour.
   */
  const reorderWidgets = (next: string[]) => {
    if (mutationPending || next.every((widgetId, index) => widgetId === toolIds[index])) return;
    const previous = [...toolIds];
    reorderMutation.mutate(next, {
      onSuccess: () =>
        setUndoStack((current) => [...current, { type: "reorder", widgetIds: previous }]),
    });
  };

  const moveWidget = (widgetId: string, offset: -1 | 1) => {
    const currentIndex = toolIds.indexOf(widgetId);
    const nextIndex = currentIndex + offset;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= toolIds.length) return;
    const next = [...toolIds];
    [next[currentIndex], next[nextIndex]] = [next[nextIndex], next[currentIndex]];
    reorderWidgets(next);
  };

  const undoLastEdit = () => {
    const action = undoStack[undoStack.length - 1];
    if (!action || mutationPending) return;
    const onSuccess = () =>
      setUndoStack((current) =>
        current[current.length - 1] === action ? current.slice(0, -1) : current,
      );

    if (action.type === "add") {
      removeMutation.mutate(action.widgetId, { onSuccess });
    } else if (action.type === "remove") {
      restoreMutation.mutate(
        { widgetId: action.widgetId, position: action.position },
        { onSuccess },
      );
    } else {
      reorderMutation.mutate(action.widgetIds, { onSuccess });
    }
  };

  /**
   * `Done` is `router.back()`, which is what makes hardware back and browser back Done by
   * construction rather than by a second handler that has to be kept in step. The
   * `canGoBack` fallback covers the one case back cannot serve: arrange opened as the
   * first entry in the stack (a deep link, or a web reload on `/arrange`).
   */
  const finish = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/");
  };

  const hasRows = toolIds.length > 0 || programmeIds.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <View testID="arrange-layout" className="flex-1">
        <AnimatedScrollView ref={scrollableRef} contentContainerStyle={{ padding: PADDING }}>
          <View className="mx-auto w-full max-w-2xl gap-6">
            <View className="flex-row items-center justify-between gap-3">
              <Text
                variant="h1"
                className="min-w-0 flex-1 text-[28px] font-extrabold tracking-tight"
              >
                {t("home.arrangeLabel")}
              </Text>
              <View className="flex-row items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  accessibilityLabel={t("today.dashboard.undo")}
                  disabled={undoStack.length === 0 || mutationPending}
                  onPress={undoLastEdit}
                >
                  <Icon
                    name="undo"
                    className={cn(
                      "size-5",
                      undoStack.length === 0 ? "text-primary/40" : "text-primary",
                    )}
                  />
                  <Text className="text-primary">{t("today.dashboard.undo")}</Text>
                </Button>
                <Button size="sm" accessibilityLabel={t("home.doneLabel")} onPress={finish}>
                  <Text>{t("home.doneLabel")}</Text>
                </Button>
              </View>
            </View>

            {/*
              One sentence, and it is the whole banner.

              ☠️ The design's second sentence - "Nothing is deleted - it stays in Tools" -
              is false: the Tools hub is exactly 8 tiles, and most of the ids removable here
              live under `/modules` or `/routines`. It held for 8 of 23 tool ids, so the
              reassurance is cut; the chip run below demonstrates reversibility instead, in
              view and in one tap.
            */}
            {hasRows ? (
              <View className="flex-row items-center gap-2 rounded-xl border border-primary/25 bg-primary/[0.08] px-3 py-2">
                <Icon name="drag-indicator" className="size-4 shrink-0 text-primary" />
                <Text className="min-w-0 flex-1 text-xs font-semibold text-primary">
                  {t("home.arrange.hint")}
                </Text>
              </View>
            ) : null}

            {/*
              `Your tools`, named with home's own tier name. No heading when empty - a
              heading over nothing is a claim about a list that is not there.

              `Sortable.Grid columns={1}`, never `Sortable.Flex`: Flex drops re-measures of
              1px or less, which is exactly the delta between two rows of the same height.
            */}
            {toolIds.length > 0 ? (
              <View className="gap-2">
                <SectionHeading>{t("home.tiers.tools")}</SectionHeading>
                <Sortable.Grid
                  data={toolIds}
                  columns={1}
                  rowGap={4}
                  scrollableRef={scrollableRef}
                  dragActivationDelay={0}
                  sortEnabled={!mutationPending}
                  customHandle
                  onDragEnd={({ data }) => reorderWidgets(data)}
                  renderItem={({ item: id }) => {
                    const meta = metaForWidget(id);
                    const title = meta ? t(meta.titleKey) : id;
                    return (
                      <View className="flex-row items-center gap-2">
                        <Sortable.Handle>
                          <DragHandle
                            id={id}
                            title={title}
                            disabled={mutationPending || toolIds.length < 2}
                            onMove={(offset) => moveWidget(id, offset)}
                            t={t}
                          />
                        </Sortable.Handle>
                        <ArrangeRow id={id} t={t} />
                        <RemoveButton
                          id={id}
                          title={title}
                          disabled={mutationPending}
                          onRemove={removeWidget}
                          t={t}
                        />
                      </View>
                    );
                  }}
                />
              </View>
            ) : null}

            {/*
              `Guided programmes`. Remove and re-add, no reorder and no handle - the order
              is not the user's to set (see PROGRAMME_ORDER). Both `-programme` ids live in
              the same ordered list as the tools, so without this section a programme card
              could be neither removed nor re-added once the modal was gone.
            */}
            {programmeIds.length > 0 ? (
              <View className="gap-2">
                <SectionHeading>{t("home.tiers.programmes")}</SectionHeading>
                {programmeIds.map((id) => {
                  const meta = metaForWidget(id);
                  const title = meta ? t(meta.titleKey) : id;
                  return (
                    <View key={id} className="flex-row items-center gap-2">
                      <ArrangeRow id={id} t={t} />
                      <RemoveButton
                        id={id}
                        title={title}
                        disabled={mutationPending}
                        onRemove={removeWidget}
                        t={t}
                      />
                    </View>
                  );
                })}
              </View>
            ) : null}

            {/*
              The chip run, which is what replaced `AddWidgetModal` - 394 lines and a
              three-level IA over a catalogue of 25 ids, carrying two corpses: a `Soon`
              branch that never rendered (nothing is `status: "soon"`) and a preview of the
              200px card this redesign retired.

              Add-only, and no descriptions. Ten of the 25 names are module jargon and
              losing their explanations is a real cost - paid because a chip tap has exactly
              one meaning and is reversible in one tap, in view.
            */}
            <View className="gap-2.5">
              <SectionHeading>{t("home.arrange.addHeading")}</SectionHeading>
              {addableIds.length === 0 ? (
                <Text variant="muted" className="text-[13px]">
                  {t("home.arrange.allAdded")}
                </Text>
              ) : (
                <View testID="arrange-chip-run" className="flex-row flex-wrap gap-2">
                  {addableIds.map((id) => {
                    const meta = metaForWidget(id);
                    const title = meta ? t(meta.titleKey) : id;
                    return (
                      <Pressable
                        key={id}
                        accessibilityRole="button"
                        accessibilityLabel={t("home.arrange.addChip", { title })}
                        testID={`arrange-chip-${id}`}
                        disabled={mutationPending}
                        onPress={() => addWidget(id)}
                        className={cn(
                          "flex-row items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 active:bg-accent disabled:opacity-40",
                          Platform.select({ web: "hover:bg-accent" }),
                        )}
                      >
                        <Icon name="add" className="size-4 shrink-0 text-primary" />
                        <Text className="text-[13px] font-medium">{title}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        </AnimatedScrollView>
      </View>
    </SafeAreaView>
  );
}
