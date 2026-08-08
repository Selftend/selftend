import type { ReactNode } from "react";
import { View } from "react-native";

import { cn } from "@/lib/utils";
import { Text } from "@/src/components/react-native-reusables/text";

interface DetailRowProps {
  /** The row's name, rendered as the design's uppercase eyebrow. */
  label: string;
  children: ReactNode;
  className?: string;
}

/**
 * One labelled hairline row on a detail screen (#741, decided on #703).
 *
 * Replaces the card-per-field stack: three big empty cards become one column of
 * rows, so a short entry reads short. Shared rather than local because the
 * design uses this same 110px-label row on three of the eight tools.
 *
 * **The label column does not survive a phone.** At 110px, `Bodily sensations`
 * wraps to two lines and `bg`'s `Телесни усещания` to three, making the label
 * taller than the paragraph it labels. So below the `sm` breakpoint the label
 * stacks above its content and the row reads as a normal titled block; the
 * column only appears once there is width for it.
 *
 * `items-start` rather than a `padding-top` nudge: the label is 11px against
 * 14px content, so aligning the boxes and letting each sit on its own baseline
 * keeps them level without a magic offset that only holds for one font size.
 */
export function DetailRow({ label, children, className }: DetailRowProps) {
  return (
    <View
      testID="detail-row"
      className={cn(
        "gap-1.5 border-t border-border py-[18px]",
        "sm:flex-row sm:items-start sm:gap-6",
        className,
      )}
    >
      <Text className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground sm:w-[110px] sm:shrink-0 sm:pt-[3px]">
        {label}
      </Text>
      <View className="flex-1">{children}</View>
    </View>
  );
}
