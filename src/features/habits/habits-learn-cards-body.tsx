import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Card, CardContent, CardTitle } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useHabitChipPalette } from "@/src/features/habits/habit-color";
import { HABITS_LEARN_CARDS, type HabitsLearnCard } from "@/src/features/habits/learn";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { usePushWithOrigin } from "@/src/lib/escape-origin";

/**
 * The ten habit-framework cards - `habits:learn.cards` - with no chrome of any
 * kind (#2470, docs/brand-result.md § 4).
 *
 * **One body, two renderers.** `habits-learn-screen.tsx` renders it inside the
 * gated index screen's safe area, scroll column and header; `app/habits.tsx`
 * renders it inside `PolicyPageLayout` for a reader with no account.
 *
 * ☠️ **`presentation` is REQUIRED and has no default**, which is § 4's rule for
 * the one case its "the audiences differ in chrome, so the body needs no prop"
 * does not cover - and this page is that case, unlike `/meditation`:
 *
 * - The gated surface is an **index into ten article routes**. Its rows are
 *   links, and their destination `/tools/habits/learn/[slug]` is behind the
 *   gate and off the index list, so a public page rendering them would hand a
 *   stranger ten rows that each dead-end at a sign-in wall, and a crawler ten
 *   links to a 404.
 * - The public page has nowhere to link, so it carries **the articles
 *   themselves** - title, short line and body, which is exactly what
 *   docs/brand-result.md § 3.2 says `/habits` carries.
 *
 * So the difference is a required prop rather than a default, and neither
 * renderer can be reached by accident. What is genuinely shared is the source
 * list, the chip palette, the icon and the key shape - the things that would
 * otherwise drift.
 *
 * ☠️ **`aria-level={2}` on the article titles is load-bearing.** `CardTitle`
 * defaults to level 3, so cards under a layout's h1 would render h1 → h3 with
 * no h2 - the WCAG 1.3.1 / 2.4.6 defect `/security` shipped once before
 * (#2133). `policy-heading-outline.test.tsx` renders the public page beside
 * `/security` and `/privacy` to hold the level here. The link rows carry no
 * heading at all and never did: a table of contents is a list, and each of its
 * entries is announced as a button carrying the article's name.
 */
export function HabitsLearnCardsBody({ presentation }: { presentation: "links" | "articles" }) {
  if (presentation === "articles") {
    return (
      <View className="gap-4">
        {HABITS_LEARN_CARDS.map((card) => (
          <HabitsLearnArticleCard key={card.slug} card={card} />
        ))}
      </View>
    );
  }

  return (
    <View className="gap-2">
      {HABITS_LEARN_CARDS.map((card) => (
        <HabitsLearnCardRow key={card.slug} card={card} />
      ))}
    </View>
  );
}

/**
 * One row of a table of contents: the card's chip, its title, its short line,
 * and a push to the article behind the gate.
 *
 * Exported because the detail screen's "related" list renders the same row for
 * every card but the one being read, and did so through a second verbatim copy
 * of this markup until #2470 moved the first copy here. Two copies in one file
 * were already a drift risk; two copies in two files would have been worse.
 */
export function HabitsLearnCardRow({ card }: { card: HabitsLearnCard }) {
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation("habits");
  const palette = useHabitChipPalette();
  const chip = palette[card.tone];
  const cardKey = `learn.cards.${card.slug}` as const;

  return (
    <Pressable
      accessibilityLabel={t(`${cardKey}.title` as Parameters<typeof t>[0])}
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={() =>
        pushWithOrigin({
          pathname: "/tools/habits/learn/[slug]",
          params: { slug: card.slug },
        })
      }
      className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3 active:bg-accent/40"
      role="button"
    >
      <View
        className="size-10 items-center justify-center rounded-xl"
        style={{ backgroundColor: chip.fill }}
      >
        <Icon name={card.icon} className="size-5" style={{ color: chip.ink }} />
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
}

/**
 * One article, read in place: the same chip and title the row carries, its
 * short line, and the body a gated reader opens a second screen to reach.
 * Nothing here is pressable - this page is the destination.
 */
function HabitsLearnArticleCard({ card }: { card: HabitsLearnCard }) {
  const { t } = useTranslation("habits");
  const palette = useHabitChipPalette();
  const chip = palette[card.tone];
  const cardKey = `learn.cards.${card.slug}` as const;

  return (
    <Card>
      <CardContent className="gap-2 pt-6">
        <View className="flex-row items-center gap-3">
          <View
            className="size-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: chip.fill }}
          >
            <Icon name={card.icon} className="size-5" style={{ color: chip.ink }} />
          </View>
          <CardTitle aria-level={2} className="flex-1">
            {t(`${cardKey}.title` as Parameters<typeof t>[0])}
          </CardTitle>
        </View>
        <Text variant="muted" className="text-sm">
          {t(`${cardKey}.short` as Parameters<typeof t>[0])}
        </Text>
        <Text>{t(`${cardKey}.body` as Parameters<typeof t>[0])}</Text>
      </CardContent>
    </Card>
  );
}
