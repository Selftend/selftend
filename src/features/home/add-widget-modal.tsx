import { Modal, Pressable, ScrollView, View } from "react-native";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";
import { WIDGET_META, isImplemented, type WidgetMeta } from "@/src/features/home/widget-registry";
import { tintClasses } from "@/src/features/home/widget-tint";

interface AddWidgetModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string | null;
  existingWidgetIds: string[];
  onAdd: (widgetId: string) => void;
}

const CATEGORY_ORDER = [
  "mood",
  "cbt",
  "act",
  "journal",
  "breathing",
  "mindfulness",
  "grounding",
  "gratitude",
  "meditation",
  "sleep",
  "habits",
];

const CATEGORY_ICON: Record<string, WidgetMeta["icon"]> = {
  mood: "mood",
  cbt: "psychology",
  act: "explore",
  journal: "edit-note",
  breathing: "air",
  mindfulness: "self-improvement",
  grounding: "anchor",
  gratitude: "favorite",
  meditation: "self-improvement",
  sleep: "bedtime",
  habits: "task-alt",
};

function widgetsByCategory(): Record<string, WidgetMeta[]> {
  const grouped: Record<string, WidgetMeta[]> = {};
  for (const meta of Object.values(WIDGET_META)) {
    if (meta.id === "mood-checkin") continue; // pinned, not addable
    (grouped[meta.toolKey] ??= []).push(meta);
  }
  return grouped;
}

export function AddWidgetModal({
  visible,
  onClose,
  existingWidgetIds,
  onAdd,
}: AddWidgetModalProps) {
  const { t } = useTranslation("navigation");
  const reduceMotionEnabled = useReduceMotionEnabled();
  const [category, setCategory] = useState<string | null>(null);
  const grouped = useMemo(widgetsByCategory, []);

  function handleClose() {
    setCategory(null);
    onClose();
  }

  const categories = CATEGORY_ORDER.filter((c) => grouped[c]?.length);

  return (
    <Modal
      animationType={reduceMotionEnabled ? "none" : "slide"}
      onRequestClose={handleClose}
      transparent
      visible={visible}
    >
      <Pressable className="flex-1 bg-black/50" onPress={handleClose}>
        <View className="flex-1" />
        <Pressable className="rounded-t-2xl bg-background">
          <View className="gap-4 px-6 pt-6 pb-2">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                {category ? (
                  <Button variant="ghost" size="sm" onPress={() => setCategory(null)}>
                    <Icon name="arrow-back" className="size-5 text-muted-foreground" />
                  </Button>
                ) : null}
                <View className="gap-0.5">
                  <Text className="text-base font-semibold">
                    {category
                      ? t(`home.categories.${category}`)
                      : t("today.dashboard.addWidgetTitle")}
                  </Text>
                  <Text variant="muted" className="text-sm">
                    {t("today.dashboard.addWidgetSubtitle")}
                  </Text>
                </View>
              </View>
              <Button variant="ghost" size="sm" onPress={handleClose}>
                <Icon name="close" className="size-5 text-muted-foreground" />
              </Button>
            </View>
          </View>

          <ScrollView contentContainerClassName="px-6 pb-8 gap-2" style={{ maxHeight: 440 }}>
            {category === null
              ? categories.map((cat) => {
                  const items = grouped[cat] ?? [];
                  const addedCount = items.filter((m) => existingWidgetIds.includes(m.id)).length;
                  const accent = tintClasses(items[0]?.tint ?? "primary");
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => setCategory(cat)}
                      className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3 active:bg-accent/40"
                    >
                      <View
                        className={cn("size-9 items-center justify-center rounded-lg", accent.chip)}
                      >
                        <Icon
                          name={CATEGORY_ICON[cat] ?? "widgets"}
                          className={cn("size-5", accent.icon)}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-semibold">{t(`home.categories.${cat}`)}</Text>
                        <Text variant="muted" className="text-xs">
                          {t("home.widgetCount", { count: items.length })}
                          {addedCount > 0
                            ? ` · ${t("home.addedCount", { count: addedCount })}`
                            : ""}
                        </Text>
                      </View>
                      <Icon name="chevron-right" className="size-5 text-muted-foreground" />
                    </Pressable>
                  );
                })
              : (grouped[category] ?? []).map((meta) => {
                  const accent = tintClasses(meta.tint);
                  const added = existingWidgetIds.includes(meta.id);
                  const available = isImplemented(meta.id);
                  return (
                    <View
                      key={meta.id}
                      className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3"
                    >
                      <View
                        className={cn("size-9 items-center justify-center rounded-lg", accent.chip)}
                      >
                        <Icon name={meta.icon} className={cn("size-5", accent.icon)} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-semibold">{t(meta.titleKey)}</Text>
                        <Text variant="muted" className="text-xs">
                          {t(meta.descriptionKey)}
                        </Text>
                      </View>
                      {!available ? (
                        <View className="rounded-full bg-muted px-2 py-0.5">
                          <Text className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {t("sidebar.badgeSoon")}
                          </Text>
                        </View>
                      ) : (
                        <Button
                          size="sm"
                          disabled={added}
                          onPress={() => {
                            onAdd(meta.id);
                            handleClose();
                          }}
                        >
                          <Text>
                            {added ? t("home.added") : t("today.dashboard.addToolButton")}
                          </Text>
                        </Button>
                      )}
                    </View>
                  );
                })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
