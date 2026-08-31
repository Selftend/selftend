import { type Href } from "expo-router";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { Platform, Pressable, useWindowDimensions, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { CHROME_MARK } from "@/src/lib/theme/chrome";
import { metaForWidget } from "@/src/features/home/widget-registry";
import { cn } from "@/lib/utils";

export interface ToolRowProps {
  /** Widget id; its name, glyph and destination all come from `WIDGET_META`. */
  id: string;
  /**
   * The resolved stat line, or `null` for an empty slot.
   *
   * `null` covers three different situations on purpose, because they render
   * identically: still loading (a loading surface never claims emptiness), the
   * documented `cbt-distortion-guide` exception, and — until S5b (#976) — the
   * module and shortcut rows whose stats are not built yet.
   */
  stat: string | null;
}

/**
 * Desktop lays the name in its own column beside the stat; phone stacks the stat under
 * the name. Same 640 breakpoint and same `useWindowDimensions` source the mood tracker
 * uses for the two rows the design packs tighter than 360dp allows.
 */
const WIDE_ROW_WIDTH = 640;

/**
 * One row of the `Your tools` tier: icon · name · stat · chevron, pressed whole.
 *
 * The leading glyph is the neutral `CHROME_MARK`, not a per-tool hue. #951 measured the
 * coloured alternative at 1.68–4.06 contrast in light mode against 4.65–5.81 for the
 * neutral mark, so the wayfinding argument fails on its own terms.
 *
 * There is no per-row action pill. The design script carries one (`"Log"`/`"Write"`/…)
 * but neither drawn frame renders it, so it is an authoring artifact rather than a
 * decision; the chevron is the affordance.
 */
export function ToolRow({ id, stat }: ToolRowProps) {
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation("navigation");
  /**
   * Read here rather than passed in from the tier, and that is load-bearing.
   *
   * `Sortable.Grid` caches the elements `renderItem` returns in its item store, so a
   * prop whose value changes AFTER mount leaves the stale copy mounted alongside the
   * fresh one - two rows, both visible, one narrow and one wide. The old widget cards
   * never hit this because `WidgetContent` took only `id` and `userId`, both stable
   * from the first render; a container width measured by `onLayout` is not. Keeping the
   * breakpoint inside the row means nothing width-dependent crosses that boundary.
   */
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_ROW_WIDTH;
  const meta = metaForWidget(id);
  if (!meta) return null;

  const name = t(meta.titleKey);

  return (
    <Pressable
      accessibilityRole="button"
      // The stat is part of the row's name, not a separate node: a screen reader
      // should hear "Sleep, 7-day average 7.2h" as one thing, because that is what
      // one press acts on.
      accessibilityLabel={stat ? `${name}, ${stat}` : name}
      testID={`tool-row-${id}`}
      // `route` is `string`, not expo-router's `Href` (#972): `Href` cannot express
      // `/routines` in this repo today, so the registry stores a plain string and the
      // filesystem test in widget-registry.test.tsx is the real guard - it catches a
      // route that typechecks but isn't served, which `Href` would not. Same cast as
      // the shipped `routines-widget.tsx:57`.
      onPress={() => pushWithOrigin(meta.route as Href)}
      className={cn(
        "flex-row items-center gap-[14px] rounded-xl px-1 py-3.5 active:bg-accent/60",
        Platform.select({ web: "hover:bg-accent/40" }),
      )}
    >
      <Icon name={meta.icon} className={cn("size-5 shrink-0", CHROME_MARK)} />

      <View className={cn("min-w-0 flex-1", wide ? "flex-row items-center gap-3" : "gap-0.5")}>
        <Text
          // Two lines on phone, where the name already sits on its own stacked line, so the
          // fix is the line count and not the stacking. "Дневник на благодарността" is 212.8px
          // at 15px NotoSans_600SemiBold against a 236px box at the 360dp floor: it fits
          // unscaled, but nothing here sets `allowFontScaling`, so it ellipsizes from
          // fontScale 1.11 - the first accessibility step - while the 124px of chrome around
          // it does not grow. One line stays right in the `wide` branch, where the name sits
          // beside the stat and nothing truncates (#1590, the same class as #1248).
          numberOfLines={wide ? 1 : 2}
          className={cn("text-[15px] font-semibold", wide && "min-w-[150px] shrink-0")}
          // The drawn desktop name column is `width: 150px`. It has to be a MINIMUM:
          // a fixed width overruns in Bulgarian, where the longest tool name is
          // "Дневник на благодарността".
        >
          {name}
        </Text>
        {stat ? (
          <Text
            variant="muted"
            testID={`tool-row-stat-${id}`}
            numberOfLines={wide ? 1 : 2}
            className="min-w-0 flex-1 text-[13px]"
          >
            {stat}
          </Text>
        ) : null}
      </View>

      <Icon
        name="chevron-right"
        accessibilityElementsHidden
        importantForAccessibility="no"
        className={cn("size-5 shrink-0", CHROME_MARK)}
      />
    </Pressable>
  );
}
