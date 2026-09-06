import { Platform, Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { DEFAULT_INTERACTIVE_HIT_SLOP, toggleButtonStateProps } from "@/src/lib/accessibility";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { CHROME_ACCENT_MARK, CHROME_MARK, CHROME_TEXT } from "@/src/lib/theme/chrome";
import { isFavorite, type CatalogueItem, type Favorite } from "@/src/features/favorites/items";
import { useToggleFavorite } from "@/src/features/favorites/queries";
import { ToolStat } from "@/src/features/home/tool-row-stats";

interface ItemCardProps {
  item: CatalogueItem;
  userId: string | null;
  /**
   * The person's rows, or `undefined` while they have not loaded. Passed in rather than
   * read here so a screen of eleven cards mounts ONE query, and so the loading state is
   * the screen's fact rather than each card's guess.
   */
  favorites: readonly Favorite[] | undefined;
}

/**
 * The mark column, and BOTH branches take it (#2059).
 *
 * ☠️ It used to be 24px, which is the width of a glyph and not the width of a mark.
 * `size-6` is right for an icon and about six pixels too narrow for three bold, tracked
 * characters, so every module card wrapped its abbreviation onto a second line — `CB/T`,
 * `AC/T`, `DB/T` — in Favourites, on Home and on the modules screen alike. `shrink-0`
 * pins the width, so this happened at EVERY viewport rather than only narrow ones, and
 * no amount of free row space reached it.
 *
 * ☠️ The two branches must share ONE width, which is why this is a constant rather than
 * a number typed twice. The marks alternate down a single list, so a column that sized
 * itself to its content would shift the name and the stat line left and right between
 * neighbouring rows. The icon keeps its 24px glyph and is centred in the wider column,
 * so the change is invisible on a tool card and only the wrap disappears on a module's.
 *
 * ☠️ **The guard is an e2e, and it has to be** — `test/e2e/module-mark-column.e2e.test.ts`.
 * A wrap is a layout fact the accessibility tree cannot see (the text content is `CBT`
 * either way), and NativeWind resolves no width into `props.style` under jest, so the
 * `props.style` assertion that catches a wrong font face in this repo would be
 * **vacuously green** on this defect. Only a real engine can measure it.
 */
const MARK_COLUMN = "w-8 shrink-0";

/**
 * THE ONE CARD (#1887, #1955): `mark → name / what-it-is / what-you-have → star`,
 * rendered identically in Favourites and in the catalogue beneath it. A favourited item
 * simply appears twice, unmarked.
 *
 * Structure, and both halves are load-bearing (#1386, #1887):
 *
 * 1. The card is an inert `View` holding TWO interactive siblings — the navigating region
 *    and the star. A star nested inside the navigating pressable is `role="button"` inside
 *    `role="button"` on react-native-web, with the outer press firing on every star tap.
 *    (`arrange-row.tsx`'s shape; that file went with the dashboard in #1959, so the shape
 *    was copied, not imported.) The press wash covers the navigating region only.
 * 2. The navigating region carries NO `accessibilityLabel` and NO `accessibilityHint`.
 *    The hint is a prop react-native-web never implements, and an explicit label hides
 *    the rendered children from assistive tech on the web — which would make the stat
 *    line silent there. The children are the accessible name, as `HairlineRow` does it.
 *
 * The marks' inks differ on purpose: a decorative glyph takes `CHROME_MARK`; a module's
 * abbreviation takes `CHROME_TEXT`, because it IS content. Neither carries a hue — module
 * identity is the mark and the label, never colour (#585). The mark has no box and no
 * border: the card is already bordered, and a ruled mark inside it is a box in a box.
 *
 * A module card has no stat line and no blank slot where one would be — an absent child.
 * A tool card draws its stat only once loaded (`ToolStat` renders nothing before that),
 * and the star only once the favourites have loaded: a hollow star and a zero are both
 * claims, and a loading surface makes none.
 */

export function ItemCard({ item, userId, favorites }: ItemCardProps) {
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation("navigation");
  const name = t(item.nameKey);

  return (
    <View className="min-w-[260px] flex-1 basis-[260px] flex-row items-start gap-1 rounded-2xl border border-border bg-card p-4">
      <Pressable
        accessibilityRole="button"
        role="button"
        hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
        testID={`card-${item.kind}-${item.key}`}
        onPress={() => pushWithOrigin(item.href)}
        className={cn(
          "min-w-0 flex-1 flex-row items-start gap-3 rounded-xl active:bg-accent/40",
          Platform.select({ web: "hover:bg-accent/40" }),
        )}
      >
        {item.kind === "tool" ? (
          <View
            testID={`card-mark-${item.kind}-${item.key}`}
            className={cn("mt-px items-center", MARK_COLUMN)}
          >
            <Icon name={item.icon} className={cn("size-6", CHROME_MARK)} />
          </View>
        ) : (
          <Text
            testID={`card-mark-${item.kind}-${item.key}`}
            className={cn(
              "mt-0.5 text-center text-sm font-bold tracking-wider",
              MARK_COLUMN,
              CHROME_TEXT,
            )}
          >
            {item.abbreviation}
          </Text>
        )}
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="text-[15px] font-semibold leading-snug">{name}</Text>
          <Text variant="muted" className="text-[13px] leading-snug">
            {t(item.subKey)}
          </Text>
          {item.kind === "tool" ? <ToolStat toolKey={item.key} userId={userId} /> : null}
        </View>
      </Pressable>

      {favorites !== undefined ? (
        <FavoriteStar
          userId={userId}
          item={item}
          name={name}
          favorite={isFavorite(favorites, item.kind, item.key)}
        />
      ) : null}
    </View>
  );
}

/**
 * The star (#1888): `star` / `star-outline`, never the heart — `favorite` is the
 * gratitude TOOL's own glyph. Off takes `CHROME_MARK`, on takes `CHROME_ACCENT_MARK`; in
 * light mode the two are close in weight, so the fill carries the state, not the ink.
 *
 * It owns the trailing 44px column alone (the chevron is gone). Optimistic, no pending
 * state — see `useToggleFavorite` for why the rollback lives in the hook and not here.
 *
 * The `testID` is on the PRESSABLE: `Icon` drops `testID` before the host node.
 */
function FavoriteStar({
  userId,
  item,
  name,
  favorite,
}: {
  userId: string | null;
  item: CatalogueItem;
  name: string;
  favorite: boolean;
}) {
  const { t } = useTranslation("navigation");
  const toggle = useToggleFavorite(userId, item.kind, item.key);

  return (
    <Pressable
      accessibilityRole="button"
      role="button"
      accessibilityLabel={
        favorite ? t("today.favorites.remove", { name }) : t("today.favorites.add", { name })
      }
      {...toggleButtonStateProps(favorite)}
      testID={`card-star-${item.kind}-${item.key}`}
      onPress={() => toggle.mutate(!favorite)}
      className={cn(
        "-mr-2 -mt-2 size-11 shrink-0 items-center justify-center rounded-full active:bg-accent/60",
        Platform.select({ web: "hover:bg-accent/60" }),
      )}
    >
      <Icon
        name={favorite ? "star" : "star-outline"}
        className={cn("size-[22px]", favorite ? CHROME_ACCENT_MARK : CHROME_MARK)}
      />
    </Pressable>
  );
}

/**
 * One section body: the wrapping row `/tools` already shipped. Cards are
 * `min-w-[260px] flex-1 basis-[260px]`, so they go one per row under ~560px and fill
 * the 720px column two-up above it; a mixed row stretches to its tallest card, which the
 * spec accepts.
 */
export function ItemCardRow({
  items,
  userId,
  favorites,
}: {
  items: readonly CatalogueItem[];
  userId: string | null;
  favorites: readonly Favorite[] | undefined;
}) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {items.map((item) => (
        <ItemCard
          key={`${item.kind}-${item.key}`}
          item={item}
          userId={userId}
          favorites={favorites}
        />
      ))}
    </View>
  );
}
