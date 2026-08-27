import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { Section } from "@/src/components/app/section";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { REVIEW_LINKS } from "./cbt-home-config";

interface CbtReviewLinksProps {
  ruled: boolean;
}

export function CbtReviewLinks({ ruled }: CbtReviewLinksProps) {
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation("cbt");

  return (
    <Section ruled={ruled} title={t("pillars.review.title")} className="gap-3">
      <View className="flex-row flex-wrap gap-3">
        {REVIEW_LINKS.map((link) => (
          <View key={link.key} className="min-w-[260px] flex-1 basis-[260px]">
            <Pressable
              accessibilityHint={t(link.descKey)}
              accessibilityLabel={t(link.labelKey)}
              accessibilityRole="button"
              hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
              onPress={() => pushWithOrigin(link.route)}
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
    </Section>
  );
}
