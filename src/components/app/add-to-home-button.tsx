import * as React from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/components/react-native-reusables/popover";
import { WIDGET_META, isImplemented } from "@/src/features/home/widget-registry";
import { tintClasses } from "@/src/features/home/widget-tint";
import { useWidgetToggle } from "@/src/features/home/use-widget-toggle";
import { useSession } from "@/src/providers/session-provider";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { cn } from "@/lib/utils";

type AddToHomeButtonProps = { size?: number; className?: string } & (
  | { widgetId: string; category?: never }
  | { category: string; widgetId?: never }
);

export function AddToHomeButton({
  widgetId,
  category,
  size = 20,
  className,
}: AddToHomeButtonProps) {
  const { t } = useTranslation("navigation");
  const { user } = useSession();
  const toggle = useWidgetToggle(user?.id ?? null);

  const widgets = React.useMemo(() => {
    if (widgetId) {
      return isImplemented(widgetId) && WIDGET_META[widgetId] ? [WIDGET_META[widgetId]] : [];
    }
    return Object.values(WIDGET_META).filter((m) => m.toolKey === category && isImplemented(m.id));
  }, [widgetId, category]);

  if (widgets.length === 0) return null;

  // Always present the add menu - even with a single available widget - so the
  // "+" behaves consistently across every tool landing (a lone item still opens
  // the popover rather than toggling silently).
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("home.addToHome.button")}
          hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
          className={className}
        >
          <Icon name="add" size={size} className="text-muted-foreground" />
        </Pressable>
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" className="w-72 p-2">
        <Text className="px-2 pb-1 pt-1 text-xs font-medium text-muted-foreground">
          {t("home.addToHome.title")}
        </Text>
        {widgets.map((w) => {
          const added = toggle.isAdded(w.id);
          const tint = tintClasses(w.tint);
          return (
            <Pressable
              key={w.id}
              accessibilityRole="button"
              accessibilityState={{ selected: added }}
              hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
              onPress={() => toggle.toggle(w.id)}
              className="flex-row items-center gap-3 rounded-md px-2 py-2 active:bg-accent"
            >
              <View className={cn("size-7 items-center justify-center rounded-lg", tint.chip)}>
                <Icon name={w.icon} className={cn("size-4", tint.icon)} />
              </View>
              <Text className="flex-1 text-sm" numberOfLines={1}>
                {t(w.titleKey)}
              </Text>
              <Icon
                name={added ? "check" : "add"}
                className={cn("size-[18px]", added ? "text-primary" : "text-muted-foreground")}
              />
            </Pressable>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
