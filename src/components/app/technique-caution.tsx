import { View } from "react-native";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";

interface TechniqueCautionProps {
  /**
   * The caution's lines in reading order — the stop rule first, the
   * who-should-check line second, two at most (#1985's ruling). An empty list
   * renders nothing, so a technique without a caution can pass its (absent)
   * copy straight through.
   */
  lines: string[];
  className?: string;
}

/**
 * A technique-level medical caution (#1996, shape ruled on #1985): inline and
 * always visible wherever the technique is introduced — never a modal, never
 * an acknowledgement, no "seen" flag, no medical question, nothing stored.
 * Cold water is the first technique to carry one; the DBT physical skills
 * reuse the same block. It is plain body text, not a warning banner: the
 * person is about to run a self-help exercise, and the tone stays with that.
 */
export function TechniqueCaution({ lines, className }: TechniqueCautionProps) {
  if (lines.length === 0) return null;
  return (
    <View
      testID="technique-caution"
      className={cn(
        "flex-row items-start gap-2.5 rounded-xl border border-border bg-muted/40 px-3.5 py-3",
        className,
      )}
    >
      <Icon name="info-outline" size={18} className="mt-0.5 shrink-0 text-muted-foreground" />
      <View className="min-w-0 flex-1 gap-1.5">
        {lines.map((line) => (
          <Text key={line} className="text-[13px] leading-relaxed">
            {line}
          </Text>
        ))}
      </View>
    </View>
  );
}
