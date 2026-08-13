import { router } from "expo-router";
import { Platform, Pressable, View } from "react-native";
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
  /**
   * Desktop lays the name in its own column beside the stat; phone stacks the
   * stat under the name. Measured once by the tier rather than per row.
   */
  wide: boolean;
}

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
export function ToolRow({ id, stat, wide }: ToolRowProps) {
  const { t } = useTranslation("navigation");
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
      onPress={() => router.push(meta.route as Parameters<typeof router.push>[0])}
      className={cn(
        "flex-row items-center gap-[14px] rounded-xl px-1 py-3.5 active:bg-accent/60",
        Platform.select({ web: "hover:bg-accent/40" }),
      )}
    >
      <Icon name={meta.icon} className={cn("size-5 shrink-0", CHROME_MARK)} />

      <View className={cn("min-w-0 flex-1", wide ? "flex-row items-center gap-3" : "gap-0.5")}>
        <Text
          numberOfLines={1}
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
