import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DraxProvider,
  DraxHandle,
  SortableContainer,
  SortableItem,
  useSortableList,
  packGrid,
} from "react-native-drax";
import { FadeInDown } from "react-native-reanimated";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useUserProfile } from "@/src/features/profile/queries";
import { useSession } from "@/src/providers/session-provider";
import { useSelectedDate } from "@/src/stores/selected-date-store";
import { AddWidgetModal } from "@/src/features/home/add-widget-modal";
import {
  PINNED_WIDGET_ID,
  clampSpan,
  metaForWidget,
  resolveWidget,
  spanForWidget,
} from "@/src/features/home/widget-registry";
import {
  useAddWidget,
  useRemoveWidget,
  useReorderWidgets,
  useWidgetPreferences,
} from "@/src/features/home/queries";

const GAP = 12;
const PADDING = 24;
const MIN_WIDGET_WIDTH = 280;
const BASE_ROW_HEIGHT = 200;
const MAX_COLUMNS = 3;

function pickGreetingKey(hour: number) {
  if (hour < 12) return "today.greetingMorning";
  if (hour < 18) return "today.greetingAfternoon";
  return "today.greetingEvening";
}

function getMetaName(user: { user_metadata?: Record<string, unknown> } | null) {
  if (!user) return null;
  const metadata = user.user_metadata ?? {};
  const fullName = typeof metadata.full_name === "string" ? metadata.full_name : null;
  if (fullName?.trim()) return fullName.trim().split(/\s+/)[0];
  const name = typeof metadata.name === "string" ? metadata.name : null;
  if (name?.trim()) return name.trim().split(/\s+/)[0];
  return null;
}

function computeColumns(gridWidth: number) {
  if (gridWidth <= 0) return 1;
  return Math.max(
    1,
    Math.min(MAX_COLUMNS, Math.floor((gridWidth + GAP) / (MIN_WIDGET_WIDTH + GAP))),
  );
}

function spanFor(id: string, numColumns: number): { colSpan: number; rowSpan: number } {
  // The pinned check-in spans the full width as the top row.
  if (id === PINNED_WIDGET_ID) return { colSpan: Math.max(1, numColumns), rowSpan: 1 };
  return clampSpan(spanForWidget(id), numColumns);
}

function computeGridLayout(widgetIds: string[], numColumns: number, cellWidth: number) {
  const packing = packGrid(widgetIds.length, numColumns, (i) => spanFor(widgetIds[i], numColumns));
  const positions = packing.positions.map((pos, i) => {
    const span = spanFor(widgetIds[i], numColumns);
    return {
      left: pos.col * (cellWidth + GAP),
      top: pos.row * (BASE_ROW_HEIGHT + GAP),
      width: span.colSpan * cellWidth + (span.colSpan - 1) * GAP,
      height: span.rowSpan * BASE_ROW_HEIGHT + (span.rowSpan - 1) * GAP,
    };
  });
  const totalHeight = Math.max(0, packing.totalRows * (BASE_ROW_HEIGHT + GAP) - GAP);
  return { positions, totalHeight };
}

export default function HomeScreen() {
  const { t, i18n } = useTranslation("navigation");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const { data: profile } = useUserProfile(user);
  const [editMode, setEditMode] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const { selectedDate, isToday } = useSelectedDate();
  const hour = new Date().getHours();
  const dateLabel = new Intl.DateTimeFormat(i18n.language, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(selectedDate + "T12:00:00"));

  const greeting = t(pickGreetingKey(hour));
  const displayName = profile?.displayName?.trim().split(/\s+/)[0] ?? getMetaName(user);
  const greetingLine = displayName
    ? t("today.greetingWithName", { greeting, name: displayName })
    : t("today.greetingPlain", { greeting });

  const { data: preferences, isLoading, refetch, isRefetching } = useWidgetPreferences(userId);
  const addMutation = useAddWidget(userId);
  const removeMutation = useRemoveWidget(userId);
  const reorderMutation = useReorderWidgets(userId);

  const widgetIds = useMemo(() => (preferences ?? []).map((p) => p.widgetId), [preferences]);
  const existingIds = [PINNED_WIDGET_ID, ...widgetIds];
  // The pinned check-in renders as the first (full-width, non-draggable) grid item.
  const gridIds = useMemo(() => [PINNED_WIDGET_ID, ...widgetIds], [widgetIds]);

  const gridWidth = Math.max(0, containerWidth - PADDING * 2);
  const numColumns = computeColumns(gridWidth);
  const cellWidth = numColumns > 0 ? (gridWidth - (numColumns - 1) * GAP) / numColumns : 0;

  const sortable = useSortableList({
    data: gridIds,
    numColumns,
    keyExtractor: (id) => id,
    getItemSpan: (id) => spanFor(id, numColumns),
    longPressDelay: 0,
    animationConfig: "spring",
    itemEntering: FadeInDown,
    onReorder: ({ data }) => reorderMutation.mutate(data.filter((id) => id !== PINNED_WIDGET_ID)),
  });

  const layout = useMemo(
    () => computeGridLayout(sortable.data, numColumns, cellWidth),
    [sortable.data, numColumns, cellWidth],
  );

  const header = (
    <View className="gap-6 pb-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t(isToday ? "today.eyebrow" : "today.eyebrowPast", { date: dateLabel })}
          </Text>
          <Text variant="h1">{greetingLine}</Text>
        </View>
        <Button
          variant="ghost"
          size="sm"
          onPress={() => setEditMode((v) => !v)}
          accessibilityLabel={editMode ? t("home.doneLabel") : t("home.editLabel")}
        >
          <Icon name={editMode ? "check" : "edit"} className="size-5 text-muted-foreground" />
        </Button>
      </View>

      {editMode ? (
        <View className="flex-row items-center justify-between rounded-xl border border-primary/25 bg-primary/[0.08] px-3 py-2">
          <View className="flex-row items-center gap-2">
            <Icon name="drag-indicator" className="size-4 text-primary" />
            <Text className="text-xs font-semibold text-primary">{t("home.editingHint")}</Text>
          </View>
          <Button size="sm" variant="ghost" onPress={() => setEditMode(false)}>
            <Text className="text-primary">{t("home.doneLabel")}</Text>
          </Button>
        </View>
      ) : null}

      <View className="flex-row items-center justify-between">
        <Text variant="h3">{t("home.sectionTitle")}</Text>
        <Button
          size="sm"
          variant="ghost"
          onPress={() => setAddVisible(true)}
          accessibilityLabel={t("today.dashboard.addWidgetTitle")}
        >
          <Icon name="add" className="size-5 text-muted-foreground" />
        </Button>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <View className="flex-1" onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
        <DraxProvider style={{ flex: 1 }}>
          <SortableContainer sortable={sortable} scrollRef={scrollRef} style={{ flex: 1 }}>
            <ScrollView
              ref={scrollRef}
              onScroll={sortable.onScroll}
              onContentSizeChange={sortable.onContentSizeChange}
              scrollEventThrottle={16}
              contentContainerStyle={{ padding: PADDING }}
              refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            >
              {header}

              {isLoading ? (
                <View className="items-center py-8">
                  <ActivityIndicator />
                </View>
              ) : (
                <View style={{ height: layout.totalHeight }}>
                  {sortable.data.map((id, index) => {
                    const pos = layout.positions[index];
                    if (!pos) return null;
                    const meta = metaForWidget(id);
                    const isPinned = id === PINNED_WIDGET_ID;
                    const showChrome = editMode && !isPinned;
                    return (
                      <SortableItem
                        key={sortable.stableKeyExtractor(id, index)}
                        sortable={sortable}
                        index={index}
                        draggable={editMode && !isPinned}
                        dragHandle={editMode && !isPinned}
                        style={{
                          position: "absolute",
                          left: pos.left,
                          top: pos.top,
                          width: pos.width,
                          height: pos.height,
                        }}
                      >
                        {resolveWidget(id, userId ?? "")}
                        {showChrome ? (
                          <>
                            <DraxHandle style={{ position: "absolute", left: 4, top: 4 }}>
                              <View className="size-7 items-center justify-center rounded-md border border-border bg-background/90">
                                <Icon
                                  name="drag-indicator"
                                  className="size-4 text-muted-foreground"
                                />
                              </View>
                            </DraxHandle>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={t("today.dashboard.removeWidget", {
                                title: meta ? t(meta.titleKey) : id,
                              })}
                              onPress={() => removeMutation.mutate(id)}
                              className="absolute right-1 top-1 size-7 items-center justify-center rounded-full border border-destructive/35 bg-card"
                            >
                              <Icon name="close" className="size-4 text-destructive" />
                            </Pressable>
                          </>
                        ) : null}
                      </SortableItem>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </SortableContainer>
        </DraxProvider>
      </View>

      <AddWidgetModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        userId={userId}
        existingWidgetIds={existingIds}
        onAdd={(widgetId) => addMutation.mutate(widgetId)}
      />
    </SafeAreaView>
  );
}
