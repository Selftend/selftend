import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { CHROME_MARK } from "@/src/lib/theme/chrome";
import { metaForWidget } from "@/src/features/widgets/widget-meta";
import { cn } from "@/lib/utils";

/**
 * Two lines, unconditionally - this row has no breakpoint to key off, and needs none.
 *
 * The two sibling surfaces that render these same strings both wrote `wide ? 1 : 2`
 * (`tool-row.tsx`, `notification-target-row.tsx:56`), because on both of them the wide
 * branch lays the name in a row BESIDE something else - a stat, a time - where a wrapped
 * name would push its neighbour around. Arrange has no such neighbour: the name owns its
 * whole box at every width, so one line is never the right answer and a breakpoint here
 * would be a distinction the layout does not make. `numberOfLines` is a ceiling, not a
 * height, so wide viewports still render one line - they just stop truncating.
 *
 * At 15px `NotoSans_600SemiBold` the longest Bulgarian tool name, "Дневник на
 * благодарността", measures 213.1px. The tool box is the screen less 168px of chrome -
 * 48 (`AnimatedScrollView` PADDING 24x2), 36 (`DragHandle`, size-9), 8+8 (`gap-2` x2),
 * 36 (`RemoveButton`, size-9), 20+12 for the leading mark and its `gap-3` - so **192px**
 * at the 360dp floor #1231 set.
 *
 * ☠️ Unlike #1590 next door, that truncates AT the floor: 213.1 against 192 ellipsizes
 * today, at fontScale 1.0, on a supported device. #1590's 236px box fitted unscaled and
 * only clipped from fontScale 1.11, so it argued from font scaling; this one does not have
 * to. Two of the 25 bg names overrun 192px - this one and "Поведенческо активиране" at
 * 202.2 - while the widest English name, "Behavioural activation", is 164.5 and clears it,
 * so this is bg-only, as both predecessors were.
 *
 * The programme tier renders the same row without a handle, so its box is 236px: nothing
 * truncates there unscaled, but 236/213.1 puts it at fontScale 1.11, which is #1590's case
 * exactly. One row, one line count, both tiers.
 *
 * Two lines are enough and nothing breaks mid-word: the widest unbreakable word across all
 * bg tool names is "Наблюдаващото" at 126.2px and this string's longest is
 * "благодарността" at 120.2px, both clear even of the 152px box at 320dp (#1592).
 */
const NAME_LINE_COUNT = 2;

/**
 * One arranged row: glyph and name, and nothing else.
 *
 * There is no `Pressable` here - not a disabled one, not one wrapped in
 * `pointerEvents="none"`. Rows are inert on this screen, so the honest structure is a row
 * that was never interactive: no tab stop, no hover response, nothing announced as a
 * button that does not act. The two interactive children (handle, remove) are siblings.
 *
 * It also does not mount `ToolTierRow`: that would pull the whole stat-query fleet onto a
 * preferences screen to render numbers nobody is arranging. Arrange is about names and
 * order, so it renders names and order.
 *
 * Its own module rather than a private function in `arrange-screen.tsx` so the name's line
 * count can be tested against the REAL registry and the REAL bg bundles: the screen suite
 * stubs `widget-registry` with the id as the title key, so no shipped string reaches it and
 * a truncation assertion there could only interrogate its own fixture (#1592).
 *
 * It reads its own `t` rather than taking one, which is what `tool-row.tsx:74` and
 * `notification-target-row.tsx` do. The screen still hands `t` down to `DragHandle` and
 * `RemoveButton`, and that stays a screen-local convention: those two are private to it,
 * this is not.
 */
export function ArrangeRow({ id }: { id: string }) {
  const { t } = useTranslation("navigation");
  const meta = metaForWidget(id);
  return (
    <View className="min-w-0 flex-1 flex-row items-center gap-3 py-1">
      <Icon name={meta?.icon ?? "widgets"} className={cn("size-5 shrink-0", CHROME_MARK)} />
      <Text numberOfLines={NAME_LINE_COUNT} className="min-w-0 flex-1 text-[15px] font-semibold">
        {meta ? t(meta.titleKey) : id}
      </Text>
    </View>
  );
}
