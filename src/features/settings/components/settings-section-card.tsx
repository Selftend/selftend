import { View } from "react-native";
import type { ReactNode } from "react";

import { Card } from "@/src/components/react-native-reusables/card";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";

interface SettingsSectionCardProps {
  icon: MaterialIconName;
  /** Icon color class, e.g. `text-be`. Applied verbatim to the `Icon`. */
  iconClassName: string;
  /** Badge tint class, e.g. `bg-[hsl(var(--be)/0.10)]`. Appended to the badge box. */
  badgeClassName: string;
  title: string;
  description?: string;
  children?: ReactNode;
}

/**
 * The shared icon-badge + title + optional description shell that every settings
 * section card uses. The badge box and icon class strings are composed with
 * template literals (not a class-merge helper) so the resulting `className` is
 * byte-identical to the pre-split inline blocks — no spacing/color drift.
 */
export function SettingsSectionCard({
  icon,
  iconClassName,
  badgeClassName,
  title,
  description,
  children,
}: SettingsSectionCardProps) {
  return (
    <Card className="gap-4 p-5">
      <View className="flex-row items-start gap-3">
        <View
          accessibilityElementsHidden
          importantForAccessibility="no"
          className={`h-9 w-9 items-center justify-center rounded-[10px] ${badgeClassName}`}
        >
          <Icon name={icon} size={20} className={iconClassName} />
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-base font-semibold">{title}</Text>
          {description ? (
            <Text className="mt-1 text-xs leading-snug text-muted-foreground">{description}</Text>
          ) : null}
        </View>
      </View>
      {children}
    </Card>
  );
}
