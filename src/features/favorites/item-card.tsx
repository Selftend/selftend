import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import type { CatalogueItem } from "@/src/features/favorites/items";
import { isFavorite, useFavorites, useSetFavorite } from "@/src/features/favorites/queries";
import { ToolStat } from "@/src/features/home/tool-row-stats";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { DEFAULT_INTERACTIVE_HIT_SLOP, toggleButtonStateProps } from "@/src/lib/accessibility";
import { CHROME_ACCENT_MARK, CHROME_MARK, CHROME_TEXT, CHROME_WASH } from "@/src/lib/theme/chrome";
import { cn } from "@/lib/utils";

/**
 * THE ONE CARD (#1955, spec #1885 §2; decided on #1887 and #1888): a tool or a module,
 * rendered identically on `/tools`, `/modules`, and - next slice - Home's Favourites and
 * catalogue sections. The TOOL shape won: `mark → name / what-it-is / what-you-have →
 * star`. The module footer, the mark's border and the `arrow-forward` chevron are gone;
 * the star owns the trailing 44px column alone.
 *
 * ☠️ Two structural rulings, both load-bearing:
 *
 * 1. **No `accessibilityLabel` and no `accessibilityHint` on the card** (#1386). The hint
 *    is a prop react-native-web never implements, and an explicit label hides the rendered
 *    children - keeping either makes the stat line silent on web. The children ARE the
 *    accessible name, as `HairlineRow` does it.
 * 2. **The star is a SIBLING of the navigating region, never a child.** A nested pressable
 *    is `role="button"` inside `role="button"` on react-native-web, with the outer press
 *    firing on every star tap. So the card is an inert `View` holding two interactive
 *    siblings - the shape `arrange-row.tsx` used - and the press wash covers the navigating
 *    region only. (Gratitude nests its star with `stopPropagation()`; that is a working
 *    pattern and this is a deliberate departure, safe only because ruling 1 removed the
 *    label that makes nesting worst.)
 *
 * Three things decline to make a claim until they can: the stat line is ABSENT while its
 * queries load (never a zero), a module has NO stat child at all (not a blank slot), and no
 * star is drawn until the favourites list is in - a hollow star would say "not favourited".
 */
export function ItemCard({ item, userId }: { item: CatalogueItem; userId: string | null }) {
  const { t } = useTranslation("navigation");
  const pushWithOrigin = usePushWithOrigin();
  const { data: favorites } = useFavorites(userId);
  const starred = isFavorite(favorites, item.kind, item.key);
  const setFavorite = useSetFavorite(userId, item.kind, item.key);

  const name = t(item.nameKey);
  const id = `${item.kind}-${item.key}`;

  return (
    <View className="min-w-[260px] flex-1 basis-[260px] flex-row items-center rounded-2xl border border-border bg-card">
      <Pressable
        accessibilityRole="button"
        hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
        onPress={() => pushWithOrigin(item.href)}
        testID={`card-${id}`}
        className="min-w-0 flex-1 flex-row items-center gap-4 rounded-2xl p-4 active:bg-accent/40"
        role="button"
      >
        {/*
          One wash, one mark (#587): eight tools and three modules in one neutral pair,
          because the glyph and the name already tell them apart. The two marks' inks
          differ on purpose - a decorative glyph is CHROME_MARK; an abbreviation is
          CHROME_TEXT because "CBT" is content, and at 14px bold it owes the 4.5:1
          small-text floor that `text-foreground` on `bg-muted` clears.
        */}
        <View className={cn("size-12 items-center justify-center rounded-xl", CHROME_WASH)}>
          {item.kind === "tool" ? (
            <Icon name={item.icon} className={cn("size-6", CHROME_MARK)} />
          ) : (
            <Text className={cn("text-sm font-bold tracking-wider", CHROME_TEXT)}>
              {item.abbreviation}
            </Text>
          )}
        </View>
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="text-base font-semibold">{name}</Text>
          <Text variant="muted" className="text-xs">
            {t(item.subKey)}
          </Text>
          {item.kind === "tool" ? (
            <ToolStat toolKey={item.key} userId={userId}>
              {(stat) =>
                stat ? (
                  <Text variant="muted" className="mt-1 text-xs" testID={`card-stat-${id}`}>
                    {stat}
                  </Text>
                ) : null
              }
            </ToolStat>
          ) : null}
        </View>
      </Pressable>

      {starred === undefined ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            starred ? t("today.favorites.remove", { name }) : t("today.favorites.add", { name })
          }
          hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
          // Optimistic with rollback, so never `disabled`: a disabled star would block the
          // undo press. The rollback and the toast live in the mutation, not here - this
          // component unmounts the moment the card beside it navigates.
          onPress={() => setFavorite.mutate(!starred)}
          testID={`card-star-${id}`}
          className="mr-1 size-11 items-center justify-center rounded-full active:bg-accent/40"
          role="button"
          {...toggleButtonStateProps(starred)}
        >
          {/* `star` / `star-outline` - never the heart, which is the gratitude tool's glyph. */}
          <Icon
            name={starred ? "star" : "star-outline"}
            className={cn("size-6", starred ? CHROME_ACCENT_MARK : CHROME_MARK)}
          />
        </Pressable>
      )}
    </View>
  );
}
