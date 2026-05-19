import { ActivityIndicator, Modal, Pressable, ScrollView, View } from "react-native";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";
import { TOOL_DEFS } from "@/src/features/plan/generate-plan";
import { useSavePlanItem } from "@/src/features/plan/queries";
import type { CarePlanItemInput } from "@/src/features/plan/types";
import { WIDGET_META, WIDGET_TOOL_ORDER } from "@/src/features/home/widget-registry";

type WidgetToolDef = Pick<CarePlanItemInput, "toolId" | "title" | "route" | "frequency">;

const EXTRA_DEFS: Record<string, WidgetToolDef> = {
  "self-care": {
    toolId: "self-care",
    title: "Self-care log",
    route: "/modules/cbt/self-care",
    frequency: "daily",
  },
  "module-cbt": {
    toolId: "module-cbt",
    title: "CBT",
    route: "/modules/cbt",
    frequency: "daily",
  },
  "module-act": {
    toolId: "module-act",
    title: "ACT",
    route: "/modules/act",
    frequency: "daily",
  },
};

interface AddWidgetModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string | null;
  existingToolIds: string[];
}

export function AddWidgetModal({ visible, onClose, userId, existingToolIds }: AddWidgetModalProps) {
  const { t } = useTranslation("navigation");
  const reduceMotionEnabled = useReduceMotionEnabled();
  const saveMutation = useSavePlanItem(userId);

  const available = WIDGET_TOOL_ORDER.filter((id) => !existingToolIds.includes(id));

  async function handleAdd(toolId: string) {
    if (!userId) return;
    const def = EXTRA_DEFS[toolId] ?? TOOL_DEFS[toolId as keyof typeof TOOL_DEFS];
    if (!def) return;
    await saveMutation.mutateAsync({
      input: {
        title: def.title,
        toolId: def.toolId,
        route: def.route,
        frequency: def.frequency,
        reminderEnabled: false,
        order: 99,
        active: true,
      },
    });
    onClose();
  }

  function handleWizard() {
    onClose();
    router.push("/(app)/plan/create");
  }

  return (
    <Modal
      animationType={reduceMotionEnabled ? "none" : "slide"}
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <Pressable className="flex-1 bg-black/50" onPress={onClose}>
        <View className="flex-1" />
        <Pressable className="rounded-t-2xl bg-background">
          <View className="gap-4 px-6 pt-6 pb-4">
            <View className="flex-row items-center justify-between">
              <View className="gap-0.5">
                <Text className="text-base font-semibold">
                  {t("today.dashboard.addWidgetTitle")}
                </Text>
                <Text variant="muted" className="text-sm">
                  {t("today.dashboard.addWidgetSubtitle")}
                </Text>
              </View>
              <Button variant="ghost" size="sm" onPress={onClose}>
                <Icon name="close" className="size-5 text-muted-foreground" />
              </Button>
            </View>
          </View>

          <ScrollView
            contentContainerClassName="px-6 pb-6 gap-2"
            style={{ maxHeight: 400 }}
            scrollEnabled={available.length > 5}
          >
            {available.length === 0 ? (
              <View className="items-center py-6">
                <Text variant="muted" className="text-sm text-center">
                  {t("today.dashboard.allAdded")}
                </Text>
              </View>
            ) : (
              available.map((toolId) => {
                const meta = WIDGET_META[toolId];
                if (!meta) return null;
                const isPending =
                  saveMutation.isPending && saveMutation.variables?.input?.toolId === toolId;
                return (
                  <View
                    key={toolId}
                    className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3"
                  >
                    <View className="size-9 items-center justify-center rounded-lg bg-primary/10">
                      <Icon name={meta.icon} className="size-5 text-primary" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold">{t(meta.titleKey)}</Text>
                      <Text variant="muted" className="text-xs">
                        {t(meta.descriptionKey)}
                      </Text>
                    </View>
                    <Button
                      size="sm"
                      onPress={() => handleAdd(toolId)}
                      disabled={!userId || saveMutation.isPending}
                    >
                      {isPending ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text>{t("today.dashboard.addToolButton")}</Text>
                      )}
                    </Button>
                  </View>
                );
              })
            )}
          </ScrollView>

          <View className="border-t border-border px-6 py-4">
            <Button variant="ghost" onPress={handleWizard}>
              <Icon name="auto-awesome" className="size-4 text-muted-foreground" />
              <Text className="text-muted-foreground">{t("today.dashboard.buildWithWizard")}</Text>
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
