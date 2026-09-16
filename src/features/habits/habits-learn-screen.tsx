import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { ScreenHeader } from "@/src/components/app/screen-header";
import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useHabitChipPalette } from "@/src/features/habits/habit-color";
import {
  HabitsLearnCardRow,
  HabitsLearnCardsBody,
} from "@/src/features/habits/habits-learn-cards-body";
import {
  findLearnCard,
  HABITS_LEARN_CARDS,
  type HabitsLearnCard,
} from "@/src/features/habits/learn";

interface HabitsLearnDetailProps {
  slug: string;
}

export function HabitsLearnDetailScreen({ slug }: HabitsLearnDetailProps) {
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation("habits");
  const palette = useHabitChipPalette();
  const card = findLearnCard(slug);
  if (!card) {
    return <HabitsLearnIndexScreen />;
  }

  const chip = palette[card.tone];
  const cardKey = `learn.cards.${card.slug}` as const;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow gap-6 p-6">
        <View className="gap-2">
          <ScreenHeader title={t(`${cardKey}.title` as Parameters<typeof t>[0])} />
          <Text variant="muted">{t(`${cardKey}.short` as Parameters<typeof t>[0])}</Text>
        </View>

        <View className="items-center">
          <View
            className="size-20 items-center justify-center rounded-3xl"
            style={{ backgroundColor: chip.fill }}
          >
            <Icon name={card.icon} className="size-10" style={{ color: chip.ink }} />
          </View>
        </View>

        <Card>
          <CardContent className="pt-6">
            <Text>{t(`${cardKey}.body` as Parameters<typeof t>[0])}</Text>
          </CardContent>
        </Card>

        <RelatedCards activeSlug={card.slug} />

        <Button onPress={() => pushWithOrigin("/tools/habits")} variant="ghost">
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
        {others.map((card) => (
          <HabitsLearnCardRow key={card.slug} card={card} />
        ))}
      </View>
    </View>
  );
}

/**
 * The gated index of the ten core ideas: this tool's chrome around the shared
 * cards body.
 *
 * The ten rows moved to `habits-learn-cards-body.tsx` on #2470 so that
 * `app/habits.tsx` can render the same ten for a reader with no account
 * (docs/brand-result.md § 4). A **pure move** - this screen renders exactly what
 * it rendered before, and its test passes unedited. What stays here is what a
 * signed-in reader gets and a stranger does not: the safe area, the scroll
 * column, the header block, and rows that open the ten gated article routes.
 *
 * ☠️ `presentation="links"` is what keeps that true, and the public page passes
 * `"articles"` instead - the one difference between the two audiences here is
 * not chrome, because a stranger has nowhere to be sent. The body's docblock
 * has the full reasoning.
 */
export function HabitsLearnIndexScreen() {
  const { t } = useTranslation("habits");

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow gap-6 p-6">
        <View className="gap-2">
          <ScreenHeader title={t("learn.indexTitle")} />
          <Text variant="muted">{t("learn.indexSubtitle")}</Text>
        </View>

        <HabitsLearnCardsBody presentation="links" />
      </ScrollView>
    </SafeAreaView>
  );
}
