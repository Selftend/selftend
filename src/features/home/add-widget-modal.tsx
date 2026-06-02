import { Modal, Pressable, ScrollView, TextInput, View, useWindowDimensions } from "react-native";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { WIDGET_META, isImplemented, type WidgetMeta } from "@/src/features/home/widget-registry";
import { tintClasses } from "@/src/features/home/widget-tint";

interface AddWidgetModalProps {
  visible: boolean;
  onClose: () => void;
  existingWidgetIds: string[];
  onAdd: (widgetId: string) => void;
  onRemove: (widgetId: string) => void;
}

const MODULE_CATS = ["cbt", "act"];
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
    (grouped[meta.toolKey] ??= []).push(meta);
  }
  return grouped;
}

// Small stylized preview block (tinted card + icon chip + a couple of bars),
// matching the design's `.aw-prev`.
function PreviewBlock({ meta }: { meta: WidgetMeta }) {
  const tint = tintClasses(meta.tint);
  return (
    <View
      className={cn(
        "h-16 w-24 shrink-0 gap-1.5 overflow-hidden rounded-lg border border-border p-2",
        tint.chip,
      )}
    >
      <View className={cn("size-4 items-center justify-center rounded", tint.chip)}>
        <Icon name={meta.icon} className={cn("size-3", tint.icon)} />
      </View>
      <View className="h-1 w-[85%] rounded-full bg-muted-foreground/30" />
      <View className="h-1 w-1/2 rounded-full bg-muted-foreground/30" />
      <View className="h-1 w-[70%] rounded-full bg-muted-foreground/30" />
    </View>
  );
}

function OptionRow({
  meta,
  added,
  available,
  onPress,
}: {
  meta: WidgetMeta;
  added: boolean;
  available: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation("navigation");
  const tint = tintClasses(meta.tint);
  return (
    <View className="mx-5 mt-2 flex-row items-start gap-3.5 rounded-xl border border-border bg-background p-3.5">
      <PreviewBlock meta={meta} />
      <View className="flex-1">
        <Text className="text-sm font-semibold">{t(meta.titleKey)}</Text>
        <Text variant="muted" className="mt-0.5 text-xs leading-5" numberOfLines={3}>
          {t(meta.descriptionKey)}
        </Text>
        {!available ? (
          <View className="mt-2 self-start rounded-full bg-muted px-2.5 py-1">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("sidebar.badgeSoon")}
            </Text>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={onPress}
            className={cn(
              "mt-2 flex-row items-center gap-1 self-start rounded-full border px-2.5 py-1",
              added ? "border-border bg-muted" : cn("border-transparent", tint.chip),
            )}
          >
            <Icon
              name={added ? "check" : "add"}
              className={cn("size-3.5", added ? "text-muted-foreground" : tint.icon)}
            />
            <Text
              className={cn("text-xs font-semibold", added ? "text-muted-foreground" : tint.icon)}
            >
              {added ? t("home.added") : t("today.dashboard.addToolButton")}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function CategoryRow({
  cat,
  metas,
  addedCount,
  onPress,
}: {
  cat: string;
  metas: WidgetMeta[];
  addedCount: number;
  onPress: () => void;
}) {
  const { t } = useTranslation("navigation");
  const accent = tintClasses(metas[0]?.tint ?? "primary");
  const countText =
    addedCount > 0
      ? `${t("home.widgetCount", { count: metas.length })} · ${t("home.addedCount", { count: addedCount })}`
      : t("home.widgetCount", { count: metas.length });
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 border-t border-border px-5 py-3 active:bg-muted/40"
    >
      <View className={cn("size-8 items-center justify-center rounded-lg", accent.chip)}>
        <Icon name={CATEGORY_ICON[cat] ?? "widgets"} className={cn("size-[18px]", accent.icon)} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold">{t(`home.categories.${cat}`)}</Text>
        <Text variant="muted" className="text-xs">
          {countText}
        </Text>
      </View>
      <Icon name="chevron-right" className="size-[18px] text-muted-foreground" />
    </Pressable>
  );
}

export function AddWidgetModal({
  visible,
  onClose,
  existingWidgetIds,
  onAdd,
  onRemove,
}: AddWidgetModalProps) {
  const { t } = useTranslation("navigation");
  const { width } = useWindowDimensions();
  const isWide = width >= 640;
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const grouped = useMemo(widgetsByCategory, []);

  function handleClose() {
    setCategory(null);
    setQuery("");
    onClose();
  }

  const categories = CATEGORY_ORDER.filter((c) => grouped[c]?.length);
  const sections = [
    { key: "modules", labelKey: "home.sectionModules", cats: MODULE_CATS },
    {
      key: "tools",
      labelKey: "home.sectionTools",
      cats: categories.filter((c) => !MODULE_CATS.includes(c)),
    },
  ];

  const trimmed = query.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!trimmed) return [];
    return Object.values(WIDGET_META).filter((m) => {
      const hay = `${t(m.titleKey)} ${t(m.descriptionKey)}`.toLowerCase();
      return hay.includes(trimmed);
    });
  }, [trimmed, t]);

  const renderOption = (meta: WidgetMeta) => {
    const added = existingWidgetIds.includes(meta.id);
    return (
      <OptionRow
        key={meta.id}
        meta={meta}
        added={added}
        available={isImplemented(meta.id)}
        onPress={() => (added ? onRemove(meta.id) : onAdd(meta.id))}
      />
    );
  };

  const activeMetas = category ? (grouped[category] ?? []) : [];

  return (
    <Modal
      animationType={isWide ? "fade" : "slide"}
      onRequestClose={handleClose}
      transparent
      visible={visible}
    >
      {/* Backdrop and panel are siblings - nesting them caused the panel Pressable to absorb */}
      {/* touches on Android before the ScrollView could claim them. */}
      <View className="flex-1">
        <Pressable className="absolute inset-0 bg-black/40" onPress={handleClose} />
        <View
          className={cn(
            "absolute bg-card",
            isWide
              ? "bottom-0 right-0 top-0 w-[440px] max-w-[88%] border-l border-border"
              : "bottom-0 left-0 right-0 max-h-[86%] rounded-t-2xl",
          )}
        >
          {/* Header */}
          <View className="gap-1 border-b border-border px-5 pb-3 pt-4">
            {category ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setCategory(null)}
                className="-ml-1.5 mb-1 flex-row items-center gap-1.5 self-start rounded-md px-1.5 py-1 active:bg-muted/50"
              >
                <Icon name="arrow-back" className="size-4 text-muted-foreground" />
                <Text variant="muted" className="text-xs font-semibold">
                  {t("home.addPanel.allCategories")}
                </Text>
              </Pressable>
            ) : null}
            <View className="flex-row items-center justify-between">
              {category ? (
                <View className="flex-1 flex-row items-center gap-3">
                  <View
                    className={cn(
                      "size-9 items-center justify-center rounded-[10px]",
                      tintClasses(activeMetas[0]?.tint ?? "primary").chip,
                    )}
                  >
                    <Icon
                      name={CATEGORY_ICON[category] ?? "widgets"}
                      className={cn("size-5", tintClasses(activeMetas[0]?.tint ?? "primary").icon)}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-bold">{t(`home.categories.${category}`)}</Text>
                    <Text variant="muted" className="text-xs">
                      {t("home.widgetCount", { count: activeMetas.length })}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text className="text-lg font-bold">{t("today.dashboard.addWidgetTitle")}</Text>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("home.doneLabel")}
                onPress={handleClose}
                className="size-8 items-center justify-center rounded-full active:bg-muted/50"
              >
                <Icon name="close" className="size-5 text-muted-foreground" />
              </Pressable>
            </View>
            {category ? null : (
              <Text variant="muted" className="text-xs">
                {t("home.addPanel.subtitle")}
              </Text>
            )}
          </View>

          {/* Search */}
          <View className="mx-5 mt-3.5 h-9 flex-row items-center gap-2 rounded-lg bg-muted/60 px-3">
            <Icon name="search" className="size-[18px] text-muted-foreground" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t("home.addPanel.searchPlaceholder")}
              className="h-9 flex-1 text-[13px] text-foreground placeholder:text-muted-foreground"
            />
          </View>

          {/* Body */}
          <ScrollView contentContainerClassName="py-2 pb-8" style={{ flexGrow: 1 }}>
            {trimmed ? (
              searchResults.length > 0 ? (
                searchResults.map(renderOption)
              ) : (
                <Text variant="muted" className="px-5 py-6 text-center text-sm">
                  {t("home.addPanel.noResults")}
                </Text>
              )
            ) : category ? (
              activeMetas.map(renderOption)
            ) : (
              sections.map((section) => {
                const cats = section.cats.filter((c) => grouped[c]?.length);
                if (cats.length === 0) return null;
                return (
                  <View key={section.key}>
                    <Text
                      variant="muted"
                      className="px-5 pb-1.5 pt-4 text-[11px] font-bold uppercase tracking-[0.14em]"
                    >
                      {t(section.labelKey)}
                    </Text>
                    {cats.map((c) => {
                      const metas = grouped[c] ?? [];
                      const addedCount = metas.filter((m) =>
                        existingWidgetIds.includes(m.id),
                      ).length;
                      return (
                        <CategoryRow
                          key={c}
                          cat={c}
                          metas={metas}
                          addedCount={addedCount}
                          onPress={() => setCategory(c)}
                        />
                      );
                    })}
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
