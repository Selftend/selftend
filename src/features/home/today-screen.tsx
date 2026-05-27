import { ActivityIndicator, Pressable, RefreshControl, View } from "react-native";
import type { ListRenderItemInfo } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DraxProvider, DraxList, DraxHandle } from "react-native-drax";
import { FadeInDown } from "react-native-reanimated";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { useUserProfile } from "@/src/features/profile/queries";
import { useSession } from "@/src/providers/session-provider";
import { useSelectedDate } from "@/src/stores/selected-date-store";
import { AddWidgetModal } from "@/src/features/home/add-widget-modal";
import {
  PINNED_WIDGET_ID,
  metaForWidget,
  resolveWidget,
} from "@/src/features/home/widget-registry";
import {
  useAddWidget,
  useRemoveWidget,
  useReorderWidgets,
  useWidgetPreferences,
} from "@/src/features/home/queries";

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

export default function HomeScreen() {
  const { t, i18n } = useTranslation("navigation");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const { data: profile } = useUserProfile(user);
  const [editMode, setEditMode] = useState(false);
  const [addVisible, setAddVisible] = useState(false);

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

  const widgetIds = (preferences ?? []).map((p) => p.widgetId);
  const existingIds = [PINNED_WIDGET_ID, ...widgetIds];

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

      {userId ? resolveWidget(PINNED_WIDGET_ID, userId) : null}

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

  function renderItem({ item }: ListRenderItemInfo<string>) {
    const meta = metaForWidget(item);
    return (
      <View className={cn("mb-3", editMode && "pl-9 pr-9")}>
        {resolveWidget(item, userId ?? "")}
        {editMode ? (
          <>
            <DraxHandle style={{ position: "absolute", left: 0, top: 8 }}>
              <View className="size-7 items-center justify-center rounded-md border border-border bg-background/90">
                <Icon name="drag-indicator" className="size-4 text-muted-foreground" />
              </View>
            </DraxHandle>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("today.dashboard.removeWidget", {
                title: meta ? t(meta.titleKey) : item,
              })}
              onPress={() => removeMutation.mutate(item)}
              className="absolute right-0 top-2 size-7 items-center justify-center rounded-full border border-destructive/35 bg-card"
            >
              <Icon name="close" className="size-4 text-destructive" />
            </Pressable>
          </>
        ) : null}
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <DraxProvider style={{ flex: 1 }}>
        <DraxList<string>
          data={widgetIds}
          keyExtractor={(id) => id}
          onReorder={({ data }) => reorderMutation.mutate(data)}
          renderItem={renderItem}
          itemEntering={FadeInDown}
          style={{ flex: 1 }}
          containerStyle={{ flex: 1 }}
          ListHeaderComponent={header}
          ListEmptyComponent={
            isLoading ? (
              <View className="items-center py-8">
                <ActivityIndicator />
              </View>
            ) : (
              <Pressable
                onPress={() => setAddVisible(true)}
                className="items-center gap-4 rounded-2xl border border-dashed border-border py-12 active:bg-muted/30"
              >
                <View className="size-14 items-center justify-center rounded-full bg-muted">
                  <Icon name="add" className="size-7 text-muted-foreground" />
                </View>
                <Text variant="muted" className="text-sm text-center max-w-[36ch]">
                  {t("today.dashboard.emptySubtitle")}
                </Text>
              </Pressable>
            )
          }
          contentContainerStyle={{ padding: 24 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          itemDraxViewProps={{ draggable: editMode, dragHandle: editMode }}
        />
      </DraxProvider>

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
