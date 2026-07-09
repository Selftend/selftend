import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable } from "react-native";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";

// Calm, persistent one-line affordance for exercise forms (not the destructive-red
// full callout used on module home screens and the crisis page - see safety-callout.tsx).
export function CrisisSupportBar() {
  const { t } = useTranslation("common");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("safety.barLabel")}
      onPress={() => router.push("/crisis")}
      className="flex-row items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 active:bg-muted/60"
    >
      <Icon name="info-outline" className="size-4 text-muted-foreground" />
      <Text variant="muted" className="flex-1 text-xs">
        {t("safety.barLabel")}
      </Text>
      <Icon name="chevron-right" className="size-4 text-muted-foreground" />
    </Pressable>
  );
}
