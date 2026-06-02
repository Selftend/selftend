import { ActivityIndicator, Pressable, RefreshControl, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { memo, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Animated, { useAnimatedRef } from "react-native-reanimated";
import Sortable from "react-native-sortables";
import { Circle, Svg } from "react-native-svg";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useUserProfile } from "@/src/features/profile/queries";
import { useSession } from "@/src/providers/session-provider";
import { useSelectedDate } from "@/src/stores/selected-date-store";
import { parseLocalNoon } from "@/src/utils/date";
import { AddWidgetModal } from "@/src/features/home/add-widget-modal";
import { isImplemented, metaForWidget, resolveWidget } from "@/src/features/home/widget-registry";
import {
  useAddWidget,
  useRemoveWidget,
  useReorderWidgets,
  useWidgetPreferences,
} from "@/src/features/home/queries";

const GAP = 12;
const PADDING = 24;
const MIN_WIDGET_WIDTH = 280;
const WIDGET_HEIGHT = 200;
const MAX_COLUMNS = 3;

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

function getMetaName(user: { user_metadata?: Record<string, unknown> } | null) {
  if (!user) return null;
  const metadata = user.user_metadata ?? {};
  const fullName = typeof metadata.full_name === "string" ? metadata.full_name : null;
  if (fullName?.trim()) return firstWord(fullName);
  const name = typeof metadata.name === "string" ? metadata.name : null;
  if (name?.trim()) return firstWord(name);
  return null;
}

function BreathingDotEmpty() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      className="h-[72px] w-[72px] items-center justify-center"
    >
      <Svg width="72" height="72" viewBox="0 0 72 72">
        <Circle
          cx="36"
          cy="36"
          r="35"
          stroke="hsla(262, 62%, 56%, 0.20)"
          strokeWidth="1"
          fill="none"
        />
        <Circle
          cx="36"
          cy="36"
          r="25"
          stroke="hsla(262, 62%, 56%, 0.30)"
          strokeWidth="1"
          fill="none"
        />
        <Circle cx="36" cy="36" r="20" fill="hsla(262, 62%, 56%, 0.10)" />
      </Svg>
      <View className="absolute items-center justify-center">
        <Icon name="add" size={22} className="text-primary" />
      </View>
    </View>
  );
}

function computeColumns(gridWidth: number) {
  if (gridWidth <= 0) return 1;
  return Math.max(
    1,
    Math.min(MAX_COLUMNS, Math.floor((gridWidth + GAP) / (MIN_WIDGET_WIDTH + GAP))),
  );
}

export default function HomeScreen() {
  const { t, i18n } = useTranslation("navigation");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const { data: profile } = useUserProfile(user);
  const [editMode, setEditMode] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
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
  const displayName = profile?.displayName?.trim().split(/\s+/)[0] ?? getMetaName(user);
  const greetingLine = displayName
    ? t("today.greetingWithName", { greeting, name: displayName })
    : t("today.greetingPlain", { greeting });

  const { data: preferences, isLoading, refetch, isRefetching } = useWidgetPreferences(userId);
  const addMutation = useAddWidget(userId);
  const removeMutation = useRemoveWidget(userId);
  const reorderMutation = useReorderWidgets(userId);

  const widgetIds = useMemo(
    () => (preferences ?? []).map((p) => p.widgetId).filter(isImplemented),
    [preferences],
  );

  const gridWidth = Math.max(0, containerWidth - PADDING * 2);
  const numColumns = computeColumns(gridWidth);
  const cellWidth = (gridWidth - (numColumns - 1) * GAP) / numColumns;

  const header = (
    <View className="gap-6 pb-3">
      {/* Hero - card-style with subtle purple tint */}
      <View className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
        <Text variant="eyebrow">
          {t(isToday ? "today.eyebrow" : "today.eyebrowPast", { date: dateLabel })}
        </Text>
        <Text
          variant="h1"
          className="mt-2.5 text-[44px] font-extrabold leading-[1.05] tracking-tight"
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
        <View className="flex-row gap-1">
          <Button
            variant="ghost"
            size="sm"
            onPress={() => setEditMode((v) => !v)}
            accessibilityLabel={editMode ? t("home.doneLabel") : t("home.editLabel")}
          >
            <Icon name={editMode ? "check" : "edit"} className="size-5 text-primary" />
          </Button>
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
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <View className="flex-1" onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
        <Animated.ScrollView
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("today.emptyTitle")}
              accessibilityHint={t("today.emptyDescription")}
              onPress={() => setAddVisible(true)}
              className="mt-2 items-center gap-3.5 rounded-2xl border border-dashed border-border px-6 py-10 active:bg-accent/40"
            >
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
            </Pressable>
          ) : cellWidth > 0 ? (
            <Sortable.Flex
              width={gridWidth}
              flexDirection="row"
              flexWrap="wrap"
              gap={GAP}
              scrollableRef={scrollableRef}
              dragActivationDelay={0}
              sortEnabled={editMode}
              customHandle
              onDragEnd={({ order }) => reorderMutation.mutate(order(widgetIds))}
            >
              {widgetIds.map((id) => {
                const meta = metaForWidget(id);
                return (
                  <View
                    key={id}
                    style={{ width: cellWidth, height: WIDGET_HEIGHT, overflow: "hidden" }}
                  >
                    <View style={{ flex: 1, pointerEvents: editMode ? "none" : "auto" }}>
                      <WidgetContent id={id} userId={userId ?? ""} />
                    </View>
                    {editMode ? (
                      <>
                        <Sortable.Handle style={{ position: "absolute", left: 4, top: 4 }}>
                          <View
                            accessibilityElementsHidden
                            importantForAccessibility="no"
                            className="size-7 items-center justify-center rounded-full border border-primary/35 bg-card"
                          >
                            <Icon name="drag-indicator" className="size-4 text-primary" />
                          </View>
                        </Sortable.Handle>
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
                  </View>
                );
              })}
            </Sortable.Flex>
          ) : null}
        </Animated.ScrollView>
      </View>

      <AddWidgetModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        existingWidgetIds={widgetIds}
        onAdd={(widgetId) => addMutation.mutate(widgetId)}
        onRemove={(widgetId) => removeMutation.mutate(widgetId)}
      />
    </SafeAreaView>
  );
}
