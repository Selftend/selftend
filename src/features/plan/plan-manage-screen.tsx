import { router } from "expo-router";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Switch } from "@/src/components/react-native-reusables/switch";
import { Text } from "@/src/components/react-native-reusables/text";
import { useAllPlanItems, useDeletePlanItem, useSavePlanItem } from "@/src/features/plan/queries";
import type { CarePlanItem } from "@/src/features/plan/types";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

const TOOL_ICONS: Record<string, MaterialIconName> = {
  mood: "mood",
  cbt: "article",
  breathing: "air",
  meditation: "self-improvement",
  gratitude: "favorite",
  journal: "edit-note",
  habits: "directions-run",
  "self-care": "spa",
};

export function PlanManageScreen() {
  const { t } = useTranslation("navigation");
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);
  const { data: items, isLoading } = useAllPlanItems(user?.id ?? null);
  const saveMutation = useSavePlanItem(user?.id ?? null);
  const deleteMutation = useDeletePlanItem(user?.id ?? null);

  async function handleToggleActive(item: CarePlanItem) {
    try {
      await saveMutation.mutateAsync({
        input: {
          title: item.title,
          description: item.description,
          toolId: item.toolId,
          moduleId: item.moduleId,
          route: item.route,
          frequency: item.frequency,
          reminderEnabled: item.reminderEnabled,
          order: item.order,
          active: !item.active,
        },
        id: item.id,
      });
    } catch {
      showToast({ title: t("plan.manage.errorToggle"), tone: "error" });
    }
  }

  async function handleDelete(item: CarePlanItem) {
    try {
      await deleteMutation.mutateAsync(item.id);
      showToast({ title: t("plan.manage.deleted"), tone: "success" });
    } catch {
      showToast({ title: t("plan.manage.errorDelete"), tone: "error" });
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="flex-row items-center justify-between">
            <View className="gap-1">
              <Text variant="h2">{t("plan.manage.title")}</Text>
              <Text variant="muted" className="text-sm">
                {t("plan.manage.subtitle")}
              </Text>
            </View>
            <Button size="sm" onPress={() => router.push("/(app)/plan/new")}>
              <Icon name="add" className="size-4" />
              <Text>{t("plan.manage.addItem")}</Text>
            </Button>
          </View>

          {!items || items.length === 0 ? (
            <View className="gap-4 rounded-2xl border border-dashed border-border p-8 items-center">
              <Icon name="checklist" className="size-10 text-muted-foreground" />
              <View className="gap-1 items-center">
                <Text className="text-base font-semibold">{t("plan.empty")}</Text>
                <Text variant="muted" className="text-sm text-center">
                  {t("plan.emptyHint")}
                </Text>
              </View>
              <View className="flex-row gap-3">
                <Button variant="outline" onPress={() => router.push("/(app)/plan/create")}>
                  <Text>{t("plan.emptyWizard")}</Text>
                </Button>
                <Button variant="outline" onPress={() => router.push("/(app)/plan/new")}>
                  <Text>{t("plan.emptyManual")}</Text>
                </Button>
              </View>
            </View>
          ) : (
            <View className="gap-3">
              {items.map((item) => {
                const icon = TOOL_ICONS[item.toolId] ?? "check-circle";
                const freqKey = `plan.frequency.${item.frequency}`;
                return (
                  <Card key={item.id} className={item.active ? "" : "opacity-50"}>
                    <CardContent className="flex-row items-center gap-3 pb-4 pt-4">
                      <View className="size-9 items-center justify-center rounded-lg bg-primary/10">
                        <Icon name={icon} className="size-5 text-primary" />
                      </View>
                      <View className="flex-1 gap-0.5">
                        <Text className="text-sm font-semibold">{item.title}</Text>
                        <Text variant="muted" className="text-xs">
                          {t(freqKey)}
                        </Text>
                      </View>
                      <Switch
                        checked={item.active}
                        onCheckedChange={() => handleToggleActive(item)}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onPress={() => router.push(`/(app)/plan/${item.id}/edit`)}
                      >
                        <Icon name="edit" className="size-4 text-muted-foreground" />
                      </Button>
                      <Button size="sm" variant="ghost" onPress={() => handleDelete(item)}>
                        <Icon name="delete" className="size-4 text-destructive" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </View>
          )}

          {items && items.length > 0 && (
            <Button variant="outline" onPress={() => router.push("/(app)/plan/create")}>
              <Icon name="auto-awesome" className="size-4" />
              <Text>{t("plan.manage.runWizard")}</Text>
            </Button>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
