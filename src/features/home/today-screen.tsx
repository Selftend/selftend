import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { memo, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import Animated, { useAnimatedRef } from "react-native-reanimated";
import { AnimatedScrollView } from "@/src/components/app/animated-scroll-view";
import Sortable from "react-native-sortables";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  AppOnboardingWizard,
  type AppOnboardingResult,
} from "@/src/components/app/app-onboarding-wizard";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { resolveDisplayName } from "@/src/features/profile/display-name";
import { useUserProfile } from "@/src/features/profile/queries";
import { useSession } from "@/src/providers/session-provider";
import { useSelectedDate } from "@/src/stores/selected-date-store";
import { parseLocalNoon } from "@/src/utils/date";
import { AddWidgetModal } from "@/src/features/home/add-widget-modal";
import { isImplemented, metaForWidget, resolveWidget } from "@/src/features/home/widget-registry";
import { ToolTierRow } from "@/src/features/home/tool-row-stats";
import { RightNowTier } from "@/src/features/home/right-now-tier";
import {
  useAddWidget,
  useRemoveWidget,
  useReorderWidgets,
  useRestoreWidget,
  useWidgetPreferences,
} from "@/src/features/home/queries";
import { useApplyWidgetSuggestions } from "@/src/features/onboarding/queries";
import { useUserPreferences } from "@/src/features/settings/queries";
import { HomeTour } from "@/src/features/tours/home-tour";
import { useTourTargetRef } from "@/src/features/tours/tour-targets";
import { cn } from "@/lib/utils";

const PADDING = 24;
/** The `Guided programmes` tier's fixed order. */
const PROGRAMME_ORDER = ["cbt-programme", "act-programme"];
/**
 * Phone below, desktop at or above - the same 640 breakpoint and the same
 * `useWindowDimensions` source `ToolRow` uses, so the header actions and the rows they
 * sit above never disagree about which face the screen is wearing.
 */
const WIDE_HEADER_WIDTH = 640;
type WidgetEditAction =
  | { type: "add"; widgetId: string }
  | { type: "remove"; widgetId: string; position: number }
  | { type: "reorder"; widgetIds: string[] };

// Memoized widget body. id and userId are stable, so the (data-fetching, computation-heavy)
// widget subtree is not re-run on the frequent grid re-renders (edit-mode toggle, add-modal
// open, container-width onLayout). Each widget's own query hooks still drive its data updates.
const WidgetContent = memo(function WidgetContent({ id, userId }: { id: string; userId: string }) {
  return resolveWidget(id, userId);
});

/** The edit-mode remove control, shared by both tiers. */
function RemoveWidgetButton({
  id,
  disabled,
  onRemove,
  t,
}: {
  id: string;
  disabled: boolean;
  onRemove: (id: string) => void;
  t: TFunction;
}) {
  const meta = metaForWidget(id);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("today.dashboard.removeWidget", {
        title: meta ? t(meta.titleKey) : id,
      })}
      disabled={disabled}
      onPress={() => onRemove(id)}
      className={cn(
        "size-7 items-center justify-center rounded-full border border-destructive/35 bg-card active:bg-destructive/10 disabled:opacity-40",
        Platform.select({ web: "hover:bg-destructive/10" }),
      )}
    >
      <Icon name="close" className="size-4 text-destructive" />
    </Pressable>
  );
}

/**
 * One tier's sortable list. Rows are inert while dragging is available, so the row's own
 * whole-row press cannot fire from a drag release - the press-through defect #915 fixed
 * structurally by never nesting a pressable inside a pressable.
 *
 * The keyboard path is not optional. Home is the app's only reorderable surface, and
 * drag-alone fails WCAG 2.2 SC 2.5.7 (Dragging Movements, AA), so the move buttons are
 * the accessible equivalent rather than a convenience.
 */
function TierSection({
  ids,
  editMode,
  mutationPending,
  scrollableRef,
  onDragEnd,
  onMove,
  onRemove,
  renderRow,
}: {
  ids: string[];
  editMode: boolean;
  mutationPending: boolean;
  scrollableRef: ReturnType<typeof useAnimatedRef<Animated.ScrollView>>;
  onDragEnd: (next: string[]) => void;
  onMove: (id: string, offset: -1 | 1) => void;
  onRemove: (id: string) => void;
  renderRow: (id: string) => React.ReactNode;
}) {
  const { t } = useTranslation("navigation");
  if (ids.length === 0) return null;

  return (
    <Sortable.Grid
      data={ids}
      columns={1}
      rowGap={4}
      scrollableRef={scrollableRef}
      dragActivationDelay={0}
      sortEnabled={editMode && !mutationPending}
      customHandle
      onDragEnd={({ data }) => onDragEnd(data)}
      renderItem={({ item: id, index }) => {
        const meta = metaForWidget(id);
        const title = meta ? t(meta.titleKey) : id;
        if (!editMode) return <View>{renderRow(id)}</View>;
        return (
          <View className="flex-row items-center gap-1">
            <Sortable.Handle>
              <View
                accessibilityElementsHidden
                importantForAccessibility="no"
                className={cn(
                  "size-7 items-center justify-center rounded-full border border-primary/35 bg-card active:bg-accent",
                  Platform.select({ web: "hover:bg-accent" }),
                )}
              >
                <Icon name="drag-indicator" className="size-4 text-primary" />
              </View>
            </Sortable.Handle>
            <View className="min-w-0 flex-1" pointerEvents="none">
              {renderRow(id)}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("today.dashboard.moveEarlier", { title })}
              disabled={index === 0 || mutationPending}
              onPress={() => onMove(id, -1)}
              className={cn(
                "size-7 items-center justify-center rounded-full border border-border bg-card active:bg-accent disabled:opacity-40",
                Platform.select({ web: "hover:bg-accent" }),
              )}
            >
              <Icon name="keyboard-arrow-up" className="size-4 text-primary" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("today.dashboard.moveLater", { title })}
              disabled={index === ids.length - 1 || mutationPending}
              onPress={() => onMove(id, 1)}
              className={cn(
                "size-7 items-center justify-center rounded-full border border-border bg-card active:bg-accent disabled:opacity-40",
                Platform.select({ web: "hover:bg-accent" }),
              )}
            >
              <Icon name="keyboard-arrow-down" className="size-4 text-primary" />
            </Pressable>
            <RemoveWidgetButton id={id} disabled={mutationPending} onRemove={onRemove} t={t} />
          </View>
        );
      }}
    />
  );
}

function pickGreetingKey(hour: number) {
  if (hour < 12) return "today.greetingMorning";
  if (hour < 18) return "today.greetingAfternoon";
  return "today.greetingEvening";
}

function firstWord(value: string) {
  return value.trim().split(/\s+/)[0];
}

/**
 * The empty box's mark: one drawn ring, 44px desktop / 42px phone.
 *
 * This replaced `BreathingDotEmpty`, three concentric SVG circles whose colours were
 * `stroke`/`fill` PROPS. An SVG prop cannot read a CSS variable, so those rings were
 * hand-copied `hsla(262, 62%, 56%, …)` literals - the DEFAULT palette's accent - and they
 * stayed violet on every other palette while the `+` in the middle followed the style.
 * `useAccentHsl` fixed the value but not the mechanism, and the mechanism was the problem:
 * a prop is invisible to the token gates, so only a bespoke 8-palette render test could
 * see it. Plain classes are what the gates already read, which is why deleting that test
 * with the component is safe rather than a loss of coverage.
 */
function EmptyStateMark({ wide }: { wide: boolean }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      testID="home-empty-mark"
      className={cn(
        "items-center justify-center rounded-full border border-primary/30 bg-primary/10",
        wide ? "size-11" : "size-[42px]",
      )}
    >
      <Icon name="add" size={22} className="text-primary" />
    </View>
  );
}

export default function HomeScreen() {
  const { t, i18n } = useTranslation("navigation");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const { data: profile } = useUserProfile(user);
  const [editRequested, setEditRequested] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [suggestionsVisible, setSuggestionsVisible] = useState(false);
  const [undoStack, setUndoStack] = useState<WidgetEditAction[]>([]);
  const scrollableRef = useAnimatedRef<Animated.ScrollView>();

  const { selectedDate } = useSelectedDate();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_HEADER_WIDTH;
  const hour = new Date().getHours();
  const dateLabel = new Intl.DateTimeFormat(i18n.language, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(parseLocalNoon(selectedDate));

  const greeting = t(pickGreetingKey(hour));
  const fullName = resolveDisplayName(profile ?? null, user);
  const displayName = fullName ? firstWord(fullName) : null;
  const greetingLine = displayName
    ? t("today.greetingWithName", { greeting, name: displayName })
    : t("today.greetingPlain", { greeting });

  const { data: preferences, isLoading, refetch, isRefetching } = useWidgetPreferences(userId);
  const { data: userPreferences } = useUserPreferences(userId);
  const addMutation = useAddWidget(userId);
  const removeMutation = useRemoveWidget(userId);
  const restoreMutation = useRestoreWidget(userId);
  const reorderMutation = useReorderWidgets(userId);
  const applySuggestions = useApplyWidgetSuggestions(userId);

  const editButtonsRef = useTourTargetRef("home-edit");

  const widgetIds = useMemo(
    () => (preferences ?? []).map((p) => p.widgetId).filter(isImplemented),
    [preferences],
  );

  /**
   * One ordered list, partitioned by tier (#950). `widget_preferences` keeps a single
   * `position` sequence; which tier an id belongs to is declared by the registry, so the
   * renderer partitions rather than the table growing a column.
   *
   * Day-level slot suppression is GONE with the fixed-height grid: `routines-today` used
   * to be withheld entirely on a day with nothing scheduled, because a 200px empty card
   * was worse than no card. A row costs one line and says "Nothing scheduled today",
   * which is a fact the old grid had no room to state.
   */
  const toolIds = useMemo(
    () => widgetIds.filter((id) => metaForWidget(id)?.tier === "tool"),
    [widgetIds],
  );
  /**
   * Fixed order, CBT then ACT (#977) - deliberately NOT `position` order like the tool
   * tier. Onboarding writes these ids in the order the user tapped the module chips, so
   * `position` would seat ACT first for anyone who picked it first, and the tier is two
   * cards with no reason to vary.
   *
   * ⚠️ It follows that the programme tier is not user-orderable, so it is rendered as a
   * plain list rather than a sortable one - a drag that writes a position the renderer
   * then ignores is the row-snaps-back lie #975 removed from the tool tier. #980's
   * arrange screen has to reckon with that; raised on the ticket.
   */
  const programmeIds = useMemo(
    () =>
      PROGRAMME_ORDER.filter(
        (id) => widgetIds.includes(id) && metaForWidget(id)?.tier === "programme",
      ),
    [widgetIds],
  );

  /**
   * Derived, not stored: arranging is only reachable from the header cluster, and the
   * cluster unmounts the moment the tool tier empties. Removing the last tool while in
   * edit mode would otherwise strand the flag `true` with no control left to turn it off,
   * so the next added row would arrive wearing drag handles nobody asked for. (S9/#980
   * deletes the mode outright when arrange becomes a route.)
   */
  const editMode = editRequested && toolIds.length > 0;

  /**
   * `Get suggestions` runs `apply_widget_recommendations`, which opens with
   * `delete from public.widget_preferences where user_id = uid` - a whole-dashboard
   * rewrite. That is correct on first run and destructive anywhere else, so the offer is
   * gated on the UNFILTERED row count, not on `widgetIds`. A row for an id this build
   * does not implement is invisible to the screen but very much present in the table, and
   * it would be deleted just the same. (One face of #964; the general defect stays open.)
   */
  const dashboardIsEmpty = (preferences ?? []).length === 0;

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
    const position = widgetIds.indexOf(widgetId);
    removeMutation.mutate(widgetId, {
      onSuccess: () =>
        setUndoStack((current) => [
          ...current,
          {
            type: "remove",
            widgetId,
            position: Math.max(position, 0),
          },
        ]),
    });
  };

  /**
   * Reorder within ONE tier. `set_widget_order` reassigns only the positions its named
   * ids already hold, so passing just this tier's ids leaves every other row where it
   * is - which is what makes a two-tier screen sortable at all. Passing the flat list
   * across both tiers would be a lie: the renderer re-partitions and the row snaps back.
   */
  const reorderWidgets = (tierIds: string[], next: string[]) => {
    if (mutationPending || next.every((widgetId, index) => widgetId === tierIds[index])) return;
    const previous = [...tierIds];
    reorderMutation.mutate(next, {
      onSuccess: () =>
        setUndoStack((current) => [...current, { type: "reorder", widgetIds: previous }]),
    });
  };

  const moveWidget = (tierIds: string[], widgetId: string, offset: -1 | 1) => {
    const currentIndex = tierIds.indexOf(widgetId);
    const nextIndex = currentIndex + offset;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= tierIds.length) return;
    const next = [...tierIds];
    [next[currentIndex], next[nextIndex]] = [next[nextIndex], next[currentIndex]];
    reorderWidgets(tierIds, next);
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
   * Eyebrow and `h1`, and it stops there (#960).
   *
   * Home carries no derived prose: live state is shown by `Right now` existing, recorded
   * state by the row that owns it, and the absence of both by absence. The tinted hero box
   * went with the third line - a box exists to separate its contents from the page, and
   * two lines of chrome at the top of a scroll have nothing to be separated from.
   *
   * Exactly two children is the assertion (`home-greeting`), not the absence of a testID:
   * a `queryByTestId(...).toBeNull()` for copy that no longer exists passes forever and
   * rots silently.
   */
  const greetingBlock = (
    <View testID="home-greeting" className="pb-5">
      <Text variant="eyebrow">
        {/* Home always describes the device's current local day (#250), so it
            names it rather than testing a constant (#720). */}
        {t("today.eyebrow", { date: dateLabel })}
      </Text>
      <Text variant="h1" className="mt-2.5 text-[32px] font-extrabold leading-[1.1] tracking-tight">
        {greetingLine}
      </Text>
    </View>
  );

  const arrangeLabel = editMode ? t("home.doneLabel") : t("home.arrangeLabel");
  const addToolLabel = t("home.addToolLabel");

  /**
   * The `Your tools` heading and its actions, rendered with the rows they name rather
   * than in the page header. They used to sit in `header`, which put this heading
   * ABOVE the `Right now` tier - so the tier was not first, and the heading was
   * separated from its own list by everything in between.
   */
  const toolsHeader = (
    <View className="gap-6">
      {/* Section heading row. The heading is bare - one tier, one name, in both states. */}
      <View className="flex-row items-center justify-between gap-3">
        <Text variant="h2" className="min-w-0 flex-1 text-xl font-bold tracking-tight">
          {t("home.tiers.tools")}
        </Text>
        {/*
          Two actions, and they render iff the tool tier is non-empty: both of them act on
          rows, and there are no rows to act on. The empty box below carries its own
          `Add manually`, so nothing becomes unreachable.

          The tour target rides this cluster, and that is deliberate rather than tolerated:
          `HomeTour` builds its queue from targets that are already REGISTERED, so an
          unmounted cluster makes the `home:edit` stop skip - silently, and without marking
          it shown, which is what leaves it to fire the first time the user owns a tool.
        */}
        {toolIds.length > 0 ? (
          <View className="flex-row items-center gap-1.5" ref={editButtonsRef}>
            <Button
              variant="ghost"
              size={wide ? "sm" : "icon"}
              className={cn(!wide && "h-9 w-9")}
              // S9/#980 swaps this handler for `router.push` to the arrange route; the
              // label is already the route's name rather than the mode's.
              onPress={() => setEditRequested((v) => !v)}
              accessibilityLabel={arrangeLabel}
            >
              <Icon name={editMode ? "check" : "tune"} className="size-5 text-primary" />
              {wide ? <Text className="text-primary">{arrangeLabel}</Text> : null}
            </Button>
            {editMode ? (
              <Button
                variant="ghost"
                size={wide ? "sm" : "icon"}
                className={cn(!wide && "h-9 w-9")}
                disabled={undoStack.length === 0}
                onPress={undoLastEdit}
                accessibilityLabel={t("today.dashboard.undo")}
              >
                <Icon
                  name="undo"
                  className={
                    undoStack.length === 0 ? "size-5 text-primary/40" : "size-5 text-primary"
                  }
                />
              </Button>
            ) : null}
            <Button
              size={wide ? "sm" : "icon"}
              className={cn(!wide && "h-9 w-9")}
              onPress={() => setAddVisible(true)}
              accessibilityLabel={addToolLabel}
            >
              <Icon name="add" className="size-5 text-primary-foreground" />
              {wide ? <Text>{addToolLabel}</Text> : null}
            </Button>
          </View>
        ) : null}
      </View>

      {editMode ? (
        <View className="flex-row items-center rounded-xl border border-primary/25 bg-primary/[0.08] px-3 py-2">
          <View className="flex-row items-center gap-2">
            <Icon name="drag-indicator" className="size-4 text-primary" />
            <Text className="text-xs font-semibold text-primary">{t("home.editingHint")}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <View
        // `home-layout` is load-bearing beyond this screen: settings-account.e2e scopes
        // to it and .maestro/app-store-screenshots.yaml waits on it for 90s.
        testID="home-layout"
        className="flex-1"
      >
        <AnimatedScrollView
          ref={scrollableRef}
          contentContainerStyle={{ padding: PADDING }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
          {greetingBlock}

          {/*
            `Right now` is home's FIRST tier and is NOT id-driven: zero rows in
            `widget_preferences`, derived entirely from live state, absent from arrange
            mode without a special case, and collapsing to nothing - heading included -
            once the day is satisfied. On a loading or empty dashboard it renders
            nothing, because no owned id means no eligible nudge.
          */}
          <RightNowTier userId={userId} widgetIds={widgetIds} />

          {/*
            Above the branch, not inside it: this block holds the `home-edit` tour
            target, and `HomeTour` builds its queue from targets that are already
            registered. Mounted only after the widget query settles, the dashboard tip
            loses that race and is silently dropped.
          */}
          {toolsHeader}

          {/*
            A loading surface never claims emptiness. The spinner is the first branch and
            the dashed box is unreachable until the query settles, so `Add tools you want
            to check in with each day` is never shown to someone who has some.
          */}
          {isLoading ? (
            <View className="items-center py-8">
              <ActivityIndicator />
            </View>
          ) : (
            <View className="mt-1 gap-7">
              {/*
                The dashed box is the TOOL TIER's empty state, not the page's - it renders
                beside a programme card rather than instead of it. The design never drew
                that state; the split falls out of `apply_widget_recommendations` being a
                whole-dashboard rewrite, so only the offer inside the box is gated on the
                page being empty.

                No starter cards. A starter tap has exactly two possible meanings and both
                break: `open the tool` leaves home permanently empty so the screen never
                resolves itself, and `add and open` silently writes a persisted row from a
                card that reads as a suggestion - with undo living in an arrange bar an
                empty dashboard cannot reach.
              */}
              {toolIds.length === 0 ? (
                <View
                  testID="home-empty-state"
                  className="items-center gap-3.5 rounded-2xl border border-dashed border-border px-6 py-10"
                >
                  <EmptyStateMark wide={wide} />
                  <View className="items-center gap-1.5 px-6">
                    <Text className="text-center text-[15px] font-semibold">
                      {t("today.emptyTitle")}
                    </Text>
                    <Text
                      variant="muted"
                      className="text-center text-[13px] leading-relaxed max-w-[34ch]"
                    >
                      {t("today.emptyDescription")}
                    </Text>
                  </View>
                  {/*
                    Neither button is primary, and `Add manually` is first. Three different
                    arrangements existed across the two frames and the shipped code, so
                    there was no intent to preserve - and the two choices are peers: one
                    builds the dashboard by hand, the other by questionnaire.
                  */}
                  <View className="mt-2 w-full max-w-sm gap-2 sm:flex-row">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onPress={() => setAddVisible(true)}
                    >
                      <Text>{t("today.addManually")}</Text>
                    </Button>
                    {dashboardIsEmpty ? (
                      <Button
                        variant="outline"
                        className="flex-1"
                        onPress={() => setSuggestionsVisible(true)}
                      >
                        <Text>{t("today.getSuggestions")}</Text>
                      </Button>
                    ) : null}
                  </View>
                </View>
              ) : (
                /*
                  Two tiers over ONE ordered list. A drag can only ever reorder within a
                  tier, because the sortable is given that tier's ids alone - see
                  `reorderWidgets`.

                  `Sortable.Grid columns={1}`, never `Sortable.Flex`: Flex drops
                  re-measures of 1px or less, which is exactly the delta between two rows
                  of the same height.

                  Only the TOOL tier is sortable. The programme tier below renders in a
                  fixed order (#977), so it is a plain list - see `programmeIds`.
                */
                <TierSection
                  ids={toolIds}
                  editMode={editMode}
                  mutationPending={mutationPending}
                  scrollableRef={scrollableRef}
                  onDragEnd={(next) => reorderWidgets(toolIds, next)}
                  onMove={(id, offset) => moveWidget(toolIds, id, offset)}
                  onRemove={removeWidget}
                  renderRow={(id) => <ToolTierRow id={id} userId={userId} />}
                />
              )}

              {programmeIds.length > 0 ? (
                <View className="gap-2">
                  <Text variant="h2" className="text-xl font-bold tracking-tight">
                    {t("home.tiers.programmes")}
                  </Text>
                  {programmeIds.map((id) => (
                    <View key={id} className="flex-row items-center gap-1">
                      <View className="min-w-0 flex-1" pointerEvents={editMode ? "none" : "auto"}>
                        <WidgetContent id={id} userId={userId ?? ""} />
                      </View>
                      {/* Remove only: there is no drag handle and no move buttons,
                          because the order is not the user's to set. */}
                      {editMode ? (
                        <RemoveWidgetButton
                          id={id}
                          disabled={mutationPending}
                          onRemove={removeWidget}
                          t={t}
                        />
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          )}
        </AnimatedScrollView>
      </View>

      <AddWidgetModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        existingWidgetIds={widgetIds}
        onAdd={addWidget}
        onRemove={removeWidget}
      />
      {suggestionsVisible && dashboardIsEmpty ? (
        <AppOnboardingWizard
          visible
          includeWelcome={false}
          initialConcerns={userPreferences?.selectedConcerns ?? []}
          isPending={applySuggestions.isPending}
          errorMessage={
            applySuggestions.isError ? t("settings:onboarding.appSaveError") : undefined
          }
          onFinish={(result: AppOnboardingResult) => {
            applySuggestions.mutate(result, {
              onSuccess: () => setSuggestionsVisible(false),
            });
          }}
          onSkip={() => setSuggestionsVisible(false)}
        />
      ) : null}
      <HomeTour />
    </SafeAreaView>
  );
}
