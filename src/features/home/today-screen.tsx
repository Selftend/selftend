import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { usePlanItems, useDeletePlanItem } from "@/src/features/plan/queries";
import { useSession } from "@/src/providers/session-provider";
import { AddWidgetModal } from "@/src/features/home/add-widget-modal";
import { WidgetCard } from "@/src/features/home/widget-card";
import { resolveWidget } from "@/src/features/home/widget-registry";

function pickGreetingKey(hour: number) {
  if (hour < 12) return "today.greetingMorning";
  if (hour < 18) return "today.greetingAfternoon";
  return "today.greetingEvening";
}

function getDisplayName(user: { user_metadata?: Record<string, unknown> } | null) {
  if (!user) return null;
  const metadata = user.user_metadata ?? {};
  const fullName = typeof metadata.full_name === "string" ? metadata.full_name : null;
  if (fullName?.trim()) return fullName.trim().split(/\s+/)[0];
  const name = typeof metadata.name === "string" ? metadata.name : null;
  if (name?.trim()) return name.trim().split(/\s+/)[0];
  return null;
}

export default function TodayScreen() {
  const { t, i18n } = useTranslation("navigation");
  const { user } = useSession();
  const [editMode, setEditMode] = useState(false);
  const [addVisible, setAddVisible] = useState(false);

  const today = new Date();
  const hour = today.getHours();
  const dateLabel = new Intl.DateTimeFormat(i18n.language, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(today);

  const greeting = t(pickGreetingKey(hour));
  const displayName = getDisplayName(user);
  const greetingLine = displayName
    ? t("today.greetingWithName", { greeting, name: displayName })
    : t("today.greetingPlain", { greeting });

  const { data: planItems, isLoading } = usePlanItems(user?.id ?? null);
  const deleteMutation = useDeletePlanItem(user?.id ?? null);

  const existingToolIds = planItems?.map((i) => i.toolId) ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          {/* Header */}
          <View className="flex-row items-start justify-between">
            <View className="flex-1 gap-2">
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("today.eyebrow", { date: dateLabel })}
              </Text>
              <Text variant="h1">{greetingLine}</Text>
            </View>
            {(planItems?.length ?? 0) > 0 ? (
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

          {/* Widget section */}
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
            ) : planItems && planItems.length > 0 ? (
              <View className="gap-3">
                {planItems.map((item) => (
                  <WidgetCard
                    key={item.id}
                    editMode={editMode}
                    onRemove={() => deleteMutation.mutate(item.id)}
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
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        userId={user?.id ?? null}
        existingToolIds={existingToolIds}
      />
    </SafeAreaView>
  );
}
