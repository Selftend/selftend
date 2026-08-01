import { ActivityIndicator, Platform, Pressable, RefreshControl, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { memo, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Animated, { useAnimatedRef } from "react-native-reanimated";
import { AnimatedScrollView } from "@/src/components/app/animated-scroll-view";
import Sortable from "react-native-sortables";
import { Circle, Svg } from "react-native-svg";

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
import { GAP, computeColumns } from "@/src/features/home/grid-layout";
import { isImplemented, metaForWidget, resolveWidget } from "@/src/features/home/widget-registry";
import {
  useAddWidget,
  useRemoveWidget,
  useReorderWidgets,
  useRestoreWidget,
  useWidgetPreferences,
} from "@/src/features/home/queries";
import { useVisibleWidgetIds } from "@/src/features/home/use-visible-widget-ids";
import { useApplyWidgetSuggestions } from "@/src/features/onboarding/queries";
import { useUserPreferences } from "@/src/features/settings/queries";
import { HomeTour } from "@/src/features/tours/home-tour";
import { useTourTargetRef } from "@/src/features/tours/tour-targets";
import { cn } from "@/lib/utils";
import { useAccentHsl } from "@/src/lib/theme-palette";

const PADDING = 24;
const WIDGET_HEIGHT = 200;
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

function pickGreetingKey(hour: number) {
  if (hour < 12) return "today.greetingMorning";
  if (hour < 18) return "today.greetingAfternoon";
  return "today.greetingEvening";
}

function firstWord(value: string) {
  return value.trim().split(/\s+/)[0];
}

function BreathingDotEmpty() {
  // The three rings are the app accent at three strengths. They were written as
  // `hsla(262, 62%, 56%, …)` literals - the DEFAULT palette's accent, copied by
  // hand - so they stayed violet on every other palette while the `+` glyph in
  // the middle (`text-primary`) followed the style. An SVG prop cannot read a
  // CSS variable, which is exactly what `useAccentHsl` is for.
  const accent = useAccentHsl();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      className="h-[72px] w-[72px] items-center justify-center"
    >
      <Svg width="72" height="72" viewBox="0 0 72 72">
        <Circle cx="36" cy="36" r="35" stroke={accent(0.2)} strokeWidth="1" fill="none" />
        <Circle cx="36" cy="36" r="25" stroke={accent(0.3)} strokeWidth="1" fill="none" />
        <Circle cx="36" cy="36" r="20" fill={accent(0.1)} />
      </Svg>
      <View className="absolute items-center justify-center">
        <Icon name="add" size={22} className="text-primary" />
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { t, i18n } = useTranslation("navigation");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const { data: profile } = useUserProfile(user);
  const [editMode, setEditMode] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [suggestionsVisible, setSuggestionsVisible] = useState(false);
  const [undoStack, setUndoStack] = useState<WidgetEditAction[]>([]);
  const [containerWidth, setContainerWidth] = useState(0);
  const scrollableRef = useAnimatedRef<Animated.ScrollView>();

  const { selectedDate, isToday } = useSelectedDate();
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

  // Day-level slot suppression (#104): some widgets (routines-today on a day
  // with nothing scheduled) must not render AT ALL - not even their
  // fixed-height slot. Edit mode still shows every owned widget so it can be
  // reordered/removed regardless of today's schedule, and all preference
  // mutations keep operating on the full owned list.
  const visibleWidgetIds = useVisibleWidgetIds(userId, widgetIds);
  const gridWidgetIds = editMode ? widgetIds : visibleWidgetIds;

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

  const reorderWidgets = (next: string[]) => {
    if (mutationPending || next.every((widgetId, index) => widgetId === widgetIds[index])) return;
    const previous = [...widgetIds];
    reorderMutation.mutate(next, {
      onSuccess: () =>
        setUndoStack((current) => [...current, { type: "reorder", widgetIds: previous }]),
    });
  };

  const moveWidget = (widgetId: string, offset: -1 | 1) => {
    const currentIndex = widgetIds.indexOf(widgetId);
    const nextIndex = currentIndex + offset;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= widgetIds.length) return;
    const next = [...widgetIds];
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

  const gridWidth = Math.max(0, containerWidth - PADDING * 2);
  const numColumns = computeColumns(gridWidth);

  const header = (
    <View className="gap-6 pb-3">
      {/* Hero - card-style with subtle purple tint */}
      <View className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
        <Text variant="eyebrow">
          {t(isToday ? "today.eyebrow" : "today.eyebrowPast", { date: dateLabel })}
        </Text>
        <Text
          variant="h1"
          className="mt-2.5 text-[32px] font-extrabold leading-[1.1] tracking-tight"
        >
          {greetingLine}
        </Text>
      </View>

      {/* Section heading row */}
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 min-w-0">
          <Text variant="h2" className="text-xl font-bold tracking-tight">
            {t("today.dashboardLabel")}
          </Text>
          <Text variant="muted" className="mt-0.5 text-[12.5px]">
            {t("today.dashboardSub")}
          </Text>
        </View>
        <View className="flex-row gap-1" ref={editButtonsRef}>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => setEditMode((v) => !v)}
            accessibilityLabel={editMode ? t("home.doneLabel") : t("home.editLabel")}
          >
            <Icon name={editMode ? "check" : "edit"} className="size-5 text-primary" />
          </Button>
          {editMode ? (
            <Button
              variant="ghost"
              size="sm"
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
            variant="ghost"
            size="sm"
            onPress={() => setAddVisible(true)}
            accessibilityLabel={t("today.dashboard.addWidgetTitle")}
          >
            <Icon name="add" className="size-5 text-primary" />
          </Button>
        </View>
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
        testID="home-layout"
        className="flex-1"
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        <AnimatedScrollView
          ref={scrollableRef}
          contentContainerStyle={{ padding: PADDING }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
          {header}

          {isLoading ? (
            <View className="items-center py-8">
              <ActivityIndicator />
            </View>
          ) : widgetIds.length === 0 ? (
            <View className="mt-2 items-center gap-3.5 rounded-2xl border border-dashed border-border px-6 py-10">
              <BreathingDotEmpty />
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
              <View className="mt-2 w-full max-w-sm gap-2 sm:flex-row">
                <Button variant="outline" className="flex-1" onPress={() => setAddVisible(true)}>
                  <Text>{t("today.addManually")}</Text>
                </Button>
                <Button className="flex-1" onPress={() => setSuggestionsVisible(true)}>
                  <Text>{t("today.getSuggestions")}</Text>
                </Button>
              </View>
            </View>
          ) : gridWidth > 0 ? (
            <Sortable.Grid
              data={gridWidgetIds}
              columns={numColumns}
              rowGap={GAP}
              columnGap={GAP}
              scrollableRef={scrollableRef}
              dragActivationDelay={0}
              sortEnabled={editMode && !mutationPending}
              customHandle
              onDragEnd={({ data }) => reorderWidgets(data)}
              renderItem={({ item: id, index }) => {
                const meta = metaForWidget(id);
                return (
                  <View style={{ height: WIDGET_HEIGHT, overflow: "hidden" }}>
                    <View style={{ flex: 1, pointerEvents: editMode ? "none" : "auto" }}>
                      <WidgetContent id={id} userId={userId ?? ""} />
                    </View>
                    {editMode ? (
                      <>
                        <Sortable.Handle style={{ position: "absolute", left: 4, top: 4 }}>
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
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={t("today.dashboard.removeWidget", {
                            title: meta ? t(meta.titleKey) : id,
                          })}
                          disabled={mutationPending}
                          onPress={() => removeWidget(id)}
                          className={cn(
                            "absolute right-1 top-1 size-7 items-center justify-center rounded-full border border-destructive/35 bg-card active:bg-destructive/10 disabled:opacity-40",
                            Platform.select({ web: "hover:bg-destructive/10" }),
                          )}
                        >
                          <Icon name="close" className="size-4 text-destructive" />
                        </Pressable>
                        <View
                          pointerEvents="box-none"
                          className="absolute left-0 right-0 top-1 flex-row justify-center gap-1"
                        >
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t("today.dashboard.moveEarlier", {
                              title: meta ? t(meta.titleKey) : id,
                            })}
                            disabled={index === 0 || mutationPending}
                            onPress={() => moveWidget(id, -1)}
                            className={cn(
                              "size-7 items-center justify-center rounded-full border border-border bg-card active:bg-accent disabled:opacity-40",
                              Platform.select({ web: "hover:bg-accent" }),
                            )}
                          >
                            <Icon name="chevron-left" className="size-4 text-primary" />
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t("today.dashboard.moveLater", {
                              title: meta ? t(meta.titleKey) : id,
                            })}
                            disabled={index === widgetIds.length - 1 || mutationPending}
                            onPress={() => moveWidget(id, 1)}
                            className={cn(
                              "size-7 items-center justify-center rounded-full border border-border bg-card active:bg-accent disabled:opacity-40",
                              Platform.select({ web: "hover:bg-accent" }),
                            )}
                          >
                            <Icon name="chevron-right" className="size-4 text-primary" />
                          </Pressable>
                        </View>
                      </>
                    ) : null}
                  </View>
                );
              }}
            />
          ) : null}
        </AnimatedScrollView>
      </View>

      <AddWidgetModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        existingWidgetIds={widgetIds}
        onAdd={addWidget}
        onRemove={removeWidget}
      />
      {suggestionsVisible && widgetIds.length === 0 ? (
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
