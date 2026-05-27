import { ActivityIndicator, Pressable, RefreshControl, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Animated, { useAnimatedRef } from "react-native-reanimated";
import Sortable from "react-native-sortables";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useUserProfile } from "@/src/features/profile/queries";
import { useSession } from "@/src/providers/session-provider";
import { useSelectedDate } from "@/src/stores/selected-date-store";
import { AddWidgetModal } from "@/src/features/home/add-widget-modal";
import {
  clampSpan,
  isImplemented,
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
const WIDGET_HEIGHT = 200;
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

  const widgetIds = useMemo(
    () => (preferences ?? []).map((p) => p.widgetId).filter(isImplemented),
    [preferences],
  );

  const gridWidth = Math.max(0, containerWidth - PADDING * 2);
  const numColumns = computeColumns(gridWidth);
  const cellWidth = numColumns > 0 ? (gridWidth - (numColumns - 1) * GAP) / numColumns : 0;

  const header = (
    <View className="gap-6 pb-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t(isToday ? "today.eyebrow" : "today.eyebrowPast", { date: dateLabel })}
          </Text>
          <Text variant="h1">{greetingLine}</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onPress={() => setAddVisible(true)}
            accessibilityLabel={t("today.dashboard.addWidgetTitle")}
          >
            <Icon name="add" className="size-5 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => setEditMode((v) => !v)}
            accessibilityLabel={editMode ? t("home.doneLabel") : t("home.editLabel")}
          >
            <Icon name={editMode ? "check" : "edit"} className="size-5 text-muted-foreground" />
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
          ) : cellWidth > 0 ? (
            <Sortable.Flex
              width={gridWidth}
              flexDirection="row"
              flexWrap="wrap"
              gap={GAP}
              scrollableRef={scrollableRef}
              dragActivationDelay={0}
              sortEnabled={editMode}
              onDragEnd={({ order }) => reorderMutation.mutate(order(widgetIds))}
            >
              {widgetIds.map((id) => {
                const span = clampSpan(spanForWidget(id), numColumns);
                const width = span.colSpan * cellWidth + (span.colSpan - 1) * GAP;
                const meta = metaForWidget(id);
                return (
                  <View key={id} style={{ width, height: WIDGET_HEIGHT }}>
                    <View style={{ flex: 1, pointerEvents: editMode ? "none" : "auto" }}>
                      {resolveWidget(id, userId ?? "")}
                    </View>
                    {editMode ? (
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
        userId={userId}
        existingWidgetIds={widgetIds}
        onAdd={(widgetId) => addMutation.mutate(widgetId)}
        onRemove={(widgetId) => removeMutation.mutate(widgetId)}
      />
    </SafeAreaView>
  );
}
