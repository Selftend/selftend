import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { BackButton } from "@/src/components/app/back-button";
import { Text } from "@/src/components/react-native-reusables/text";
import type { GratitudeBreak } from "@/src/features/gratitude/breaks";
import { cn } from "@/lib/utils";

interface GratitudeBreakScreenProps {
  breakDef: GratitudeBreak;
}

const CATEGORY_CLASSES: Record<GratitudeBreak["category"], string> = {
  "positive-psychology":
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  stoicism: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  "mental-subtraction": "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
};

export function GratitudeBreakScreen({ breakDef }: GratitudeBreakScreenProps) {
  const { t } = useTranslation("gratitude");
  const cardKey = `breaks.cards.${breakDef.slug}` as const;
  const title = t(`${cardKey}.title` as Parameters<typeof t>[0]);
  const body = t(`${cardKey}.body` as Parameters<typeof t>[0]);
  const categoryLabel = t(`breaks.categories.${breakDef.category}` as Parameters<typeof t>[0]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-3">
            <View className="flex-row items-center gap-2">
              <BackButton showLabel={false} className="-ml-2" />
              <Text
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-semibold",
                  CATEGORY_CLASSES[breakDef.category],
                )}
              >
                {categoryLabel}
              </Text>
            </View>
            <Text variant="h1">{title}</Text>
          </View>

          <Text className="text-base leading-7 text-foreground">{body}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
