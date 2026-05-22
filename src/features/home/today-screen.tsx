import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useDeletePlanItem, usePlanItems, useSavePlanItem } from "@/src/features/plan/queries";
import type { CarePlanItem } from "@/src/features/plan/types";
import { useUserProfile } from "@/src/features/profile/queries";
import { useSession } from "@/src/providers/session-provider";
import { AddWidgetModal } from "@/src/features/home/add-widget-modal";
import { WidgetCard } from "@/src/features/home/widget-card";
import {
  existingWidgetToolIds,
  resolveWidget,
  visibleDashboardItems,
} from "@/src/features/home/widget-registry";

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
  const { data: profile } = useUserProfile(user);
  const [editMode, setEditMode] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [displayedItems, setDisplayedItems] = useState<CarePlanItem[] | null>(null);

  const today = new Date();
  const hour = today.getHours();
  const dateLabel = new Intl.DateTimeFormat(i18n.language, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(today);

  const greeting = t(pickGreetingKey(hour));
  const displayName = profile?.displayName?.trim().split(/\s+/)[0] ?? getMetaName(user);
  const greetingLine = displayName
    ? t("today.greetingWithName", { greeting, name: displayName })
    : t("today.greetingPlain", { greeting });

  const { data: planItems, isLoading, refetch, isRefetching } = usePlanItems(user?.id ?? null);
  const deleteMutation = useDeletePlanItem(user?.id ?? null);
  const saveMutation = useSavePlanItem(user?.id ?? null);

  useEffect(() => {
    if (planItems) {
      setDisplayedItems(planItems);
    }
  }, [planItems]);

  const existingToolIds = existingWidgetToolIds(planItems ?? []);
  const dashboardItems = visibleDashboardItems(displayedItems ?? planItems ?? []);
  const nextWidgetOrder =
    planItems && planItems.length > 0 ? Math.max(...planItems.map((item) => item.order)) + 1 : 0;

  function toPlanItemInput(item: CarePlanItem, order: number) {
    return {
      title: item.title,
      description: item.description,
      toolId: item.toolId,
      moduleId: item.moduleId,
      route: item.route,
      frequency: item.frequency,
      reminderEnabled: item.reminderEnabled,
      order,
      active: item.active,
    };
  }

  async function persistOrder(items: CarePlanItem[]) {
    await Promise.all(
      items.map((planItem, order) =>
        saveMutation.mutateAsync({
          id: planItem.id,
          input: toPlanItemInput(planItem, order),
        }),
      ),
    );
  }

  async function handleMove(index: number, direction: -1 | 1) {
    if (saveMutation.isPending) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= dashboardItems.length) return;

    const reordered = [...dashboardItems];
    const [item] = reordered.splice(index, 1);
    reordered.splice(nextIndex, 0, item);
    setDisplayedItems(reordered);
    try {
      await persistOrder(reordered);
    } catch {
      setDisplayedItems(planItems ?? []);
    }
  }

  function handleRemove(item: CarePlanItem) {
    setDisplayedItems((items) =>
      (items ?? planItems ?? []).filter((candidate) => candidate.id !== item.id),
    );
    deleteMutation.mutate(item.id);
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView
        contentContainerClassName="grow p-6"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View className="gap-6">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 gap-2">
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("today.eyebrow", { date: dateLabel })}
              </Text>
              <Text variant="h1">{greetingLine}</Text>
            </View>
            {dashboardItems.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onPress={() => setEditMode((v) => !v)}
                accessibilityLabel={
                  editMode ? t("today.dashboard.doneLabel") : t("today.dashboard.editLabel")
                }
              >
                <Icon name={editMode ? "check" : "edit"} className="size-5 text-muted-foreground" />
              </Button>
            ) : null}
          </View>

          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text variant="h3">{t("today.dashboard.sectionTitle")}</Text>
              <Button
                size="sm"
                variant="ghost"
                onPress={() => setAddVisible(true)}
                accessibilityLabel={t("today.dashboard.addWidgetTitle")}
              >
                <Icon name="add" className="size-5 text-muted-foreground" />
              </Button>
            </View>

            {isLoading ? (
              <View className="items-center py-8">
                <ActivityIndicator />
              </View>
            ) : dashboardItems.length > 0 ? (
              <View className="gap-3">
                {dashboardItems.map((item, index) => (
                  <WidgetCard
                    key={item.id}
                    canMoveDown={index < dashboardItems.length - 1 && !saveMutation.isPending}
                    canMoveUp={index > 0 && !saveMutation.isPending}
                    editMode={editMode}
                    onMoveDown={() => handleMove(index, 1)}
                    onMoveUp={() => handleMove(index, -1)}
                    onRemove={() => handleRemove(item)}
                    title={item.title}
                  >
                    {resolveWidget(item, user?.id ?? "")}
                  </WidgetCard>
                ))}
              </View>
            ) : (
              <Pressable
                onPress={() => setAddVisible(true)}
                className="items-center gap-3 rounded-2xl border border-dashed border-border py-10 active:bg-muted/30"
              >
                <Icon name="add-circle-outline" className="size-8 text-muted-foreground" />
                <Text variant="muted" className="text-sm text-center max-w-[36ch]">
                  {t("today.dashboard.emptySubtitle")}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>

      <AddWidgetModal
        nextOrder={nextWidgetOrder}
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        userId={user?.id ?? null}
        existingToolIds={existingToolIds}
      />
    </SafeAreaView>
  );
}
