import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { BackButton } from "@/src/components/app/back-button";
import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { colorChipClass } from "@/src/features/habits/habits-home-screen";
import {
  findLearnCard,
  HABITS_LEARN_CARDS,
  type HabitsLearnCard,
} from "@/src/features/habits/learn";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { cn } from "@/lib/utils";

interface HabitsLearnDetailProps {
  slug: string;
}

export function HabitsLearnDetailScreen({ slug }: HabitsLearnDetailProps) {
  const { t } = useTranslation("habits");
  const card = findLearnCard(slug);
  if (!card) {
    return <HabitsLearnIndexScreen />;
  }

  const chip = colorChipClass(card.tone);
  const cardKey = `learn.cards.${card.slug}` as const;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow gap-6 p-6">
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <BackButton showLabel={false} className="-ml-2" />
            <Text variant="h1" className="flex-1">
              {t(`${cardKey}.title` as Parameters<typeof t>[0])}
            </Text>
          </View>
          <Text variant="muted">{t(`${cardKey}.short` as Parameters<typeof t>[0])}</Text>
        </View>

        <View className="items-center">
          <View className={cn("size-20 items-center justify-center rounded-3xl", chip.bg)}>
            <Icon name={card.icon} className={cn("size-10", chip.text)} />
          </View>
        </View>

        <Card>
          <CardContent className="pt-6">
            <Text>{t(`${cardKey}.body` as Parameters<typeof t>[0])}</Text>
          </CardContent>
        </Card>

        <RelatedCards activeSlug={card.slug} />

        <Button onPress={() => router.push("/tools/habits")} variant="ghost">
          <Icon name="arrow-back" className="size-4" />
          <Text>{t("learn.backToHabits")}</Text>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

function RelatedCards({ activeSlug }: { activeSlug: HabitsLearnCard["slug"] }) {
  const { t } = useTranslation("habits");
  const others = HABITS_LEARN_CARDS.filter((card) => card.slug !== activeSlug);

  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {t("learn.indexTitle")}
      </Text>
      <View className="gap-2">
        {others.map((card) => {
          const chip = colorChipClass(card.tone);
          const cardKey = `learn.cards.${card.slug}` as const;
          return (
            <Pressable
              key={card.slug}
              accessibilityLabel={t(`${cardKey}.title` as Parameters<typeof t>[0])}
              accessibilityRole="button"
              hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
              onPress={() =>
                router.push({
                  pathname: "/tools/habits/learn/[slug]",
                  params: { slug: card.slug },
                })
              }
              className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3 active:bg-accent/40"
              role="button"
            >
              <View className={cn("size-10 items-center justify-center rounded-xl", chip.bg)}>
                <Icon name={card.icon} className={cn("size-5", chip.text)} />
              </View>
              <View className="flex-1 gap-0.5">
                <Text className="text-sm font-semibold">
                  {t(`${cardKey}.title` as Parameters<typeof t>[0])}
                </Text>
                <Text variant="muted" className="text-xs" numberOfLines={2}>
                  {t(`${cardKey}.short` as Parameters<typeof t>[0])}
                </Text>
              </View>
              <Icon name="chevron-right" className="size-5 text-muted-foreground" />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function HabitsLearnIndexScreen() {
  const { t } = useTranslation("habits");

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow gap-6 p-6">
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <BackButton showLabel={false} className="-ml-2" />
            <Text variant="h1">{t("learn.indexTitle")}</Text>
          </View>
          <Text variant="muted">{t("learn.indexSubtitle")}</Text>
        </View>

        <View className="gap-2">
          {HABITS_LEARN_CARDS.map((card) => {
            const chip = colorChipClass(card.tone);
            const cardKey = `learn.cards.${card.slug}` as const;
            return (
              <Pressable
                key={card.slug}
                accessibilityLabel={t(`${cardKey}.title` as Parameters<typeof t>[0])}
                accessibilityRole="button"
                hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                onPress={() =>
                  router.push({
                    pathname: "/tools/habits/learn/[slug]",
                    params: { slug: card.slug },
                  })
                }
                className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3 active:bg-accent/40"
                role="button"
              >
                <View className={cn("size-10 items-center justify-center rounded-xl", chip.bg)}>
                  <Icon name={card.icon} className={cn("size-5", chip.text)} />
                </View>
                <View className="flex-1 gap-0.5">
                  <Text className="text-sm font-semibold">
                    {t(`${cardKey}.title` as Parameters<typeof t>[0])}
                  </Text>
                  <Text variant="muted" className="text-xs" numberOfLines={2}>
                    {t(`${cardKey}.short` as Parameters<typeof t>[0])}
                  </Text>
                </View>
                <Icon name="chevron-right" className="size-5 text-muted-foreground" />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
