import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { REVIEW_LINKS } from "./cbt-home-config";

export function CbtReviewLinks() {
  const { t } = useTranslation("cbt");

  return (
    <View className="gap-3">
      <Text variant="h3">{t("pillars.review.title")}</Text>
      <View className="flex-row flex-wrap gap-3">
        {REVIEW_LINKS.map((link) => (
          <View key={link.key} className="min-w-[260px] flex-1 basis-[260px]">
            <Pressable
              accessibilityHint={t(link.descKey)}
              accessibilityLabel={t(link.labelKey)}
              accessibilityRole="button"
              hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
              onPress={() => router.push(link.route)}
              className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-4 active:bg-accent/40"
              role="button"
            >
              <View className="size-9 items-center justify-center rounded-lg bg-muted">
                <Icon name={link.icon} className="size-6 text-foreground" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold">{t(link.labelKey)}</Text>
                <Text variant="muted" className="text-xs">
                  {t(link.descKey)}
                </Text>
              </View>
              <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}
