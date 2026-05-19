import { router } from "expo-router";
import { Pressable } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

interface BackButtonProps {
  className?: string;
  label?: string;
  /** When true (default), shows the "Back" label next to the icon. */
  showLabel?: boolean;
}

export function BackButton({ className, label, showLabel = true }: BackButtonProps) {
  const { t } = useTranslation("navigation");

  if (!router.canGoBack()) {
    return null;
  }

  const resolvedLabel = label ?? t("sidebar.back");

  return (
    <Pressable
      accessibilityLabel={resolvedLabel}
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={() => router.back()}
      className={cn(
        "flex-row items-center gap-1 rounded-md px-2 py-1 active:bg-muted/60",
        className,
      )}
      role="button"
    >
      <Icon name="arrow-back" className="size-4 text-muted-foreground" />
      {showLabel ? (
        <Text className="text-sm font-medium text-muted-foreground">{resolvedLabel}</Text>
      ) : null}
    </Pressable>
  );
}
