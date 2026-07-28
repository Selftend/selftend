import { View } from "react-native";

import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { tintClasses, type WidgetTint } from "@/src/features/home/widget-tint";
import { cn } from "@/lib/utils";

export function WidgetCardHeader({
  icon,
  title,
  moduleLabel,
  tint,
}: {
  icon: MaterialIconName;
  title: string;
  moduleLabel: string;
  tint: WidgetTint;
}) {
  const c = tintClasses(tint);
  return (
    <View className="flex-row items-center justify-between gap-2">
      <View className="flex-row items-center gap-2 flex-1">
        <View className={cn("size-8 items-center justify-center rounded-lg", c.chip)}>
          <Icon name={icon} className={cn("size-5", c.icon)} />
        </View>
        <Text className="text-sm font-semibold flex-1" numberOfLines={1}>
          {title}
        </Text>
      </View>
      {/*
        Accent ink, not the accent (#403): the module label is 10px text on
        `c.chip`, a `bg-<tint>/10` tint of its own hue, where every hue falls
        under AA — `ink` 4.28 and `be` 4.22 at best, `think` 1.76 at worst.
        The icon above keeps `c.icon`; it is decorative.
      */}
      <View className={cn("rounded-full px-2 py-0.5", c.chip)}>
        <Text className={cn("text-[10px] font-semibold uppercase tracking-wider", c.ink)}>
          {moduleLabel}
        </Text>
      </View>
    </View>
  );
}
