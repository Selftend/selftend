import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

interface HairlineRowProps {
  /** The row's headline. Clamped at two lines - these are user sentences. */
  title: string;
  /** The quiet line beneath it: a timestamp, a domain, a read value. */
  meta: ReactNode;
  onPress: () => void;
}

/**
 * A navigable row separated from its neighbours by a rule rather than boxed in
 * a card (#1386).
 *
 * A card per row reads as one panel per item, and a list of them reads as a
 * stack of competing panels rather than one list - the same reasoning that made
 * `Section` a hairline. The rule is drawn on the TOP of every row, so a list
 * needs no "last child" special case and its container contributes no gap.
 *
 * ☠️ It carries **no explicit `accessibilityLabel`**: the title and the meta
 * line together are its accessible name. An explicit label makes the title the
 * whole name and hides everything else from assistive tech on the web, and the
 * only other home for that content - `accessibilityHint` - is a prop
 * react-native-web never implements. That pair of facts is what disqualified
 * `AccessibleCardLink`, whose `description` was doing exactly this.
 *
 * ⚠️ `act-values-screen.tsx` draws this shape by hand as well, with a value
 * bar in its meta slot and an `add` glyph in place of the chevron when a domain
 * is unset. It is not converted here - that screen is not in this change - but
 * it is the next caller if the row ever grows those two props.
 */
export function HairlineRow({ title, meta, onPress }: HairlineRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onPress}
      className="flex-row items-center gap-4 border-t border-border py-4 active:bg-accent/40"
      role="button"
    >
      <View className="flex-1 gap-1">
        <Text className="font-semibold leading-snug" numberOfLines={2}>
          {title}
        </Text>
        <View className="flex-row flex-wrap items-center gap-x-2">{meta}</View>
      </View>
      <Icon name="chevron-right" className="size-4 shrink-0 text-muted-foreground" />
    </Pressable>
  );
}
