import { useId, type ReactNode } from "react";
import { Pressable, View } from "react-native";

import { cn } from "@/lib/utils";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { DEFAULT_INTERACTIVE_HIT_SLOP, spaceKeyActivationProps } from "@/src/lib/accessibility";

interface DisclosureProps {
  /** The trigger's text. Callers may vary it with context - see `#760`'s kind-conditional label. */
  label: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
  testID?: string;
}

/**
 * A labelled show/hide section, for forms that hold more than their common case
 * needs (#760).
 *
 * Content is **unmounted** when collapsed rather than hidden with a style. A
 * hidden-but-mounted subtree keeps its fields in the tab order and in the
 * accessibility tree, which is the usual way a disclosure turns into a trap:
 * the form looks short and tabs through twelve invisible inputs.
 *
 * Deliberately unanimated. The habits redesign's motion decision (#716) admits
 * no animation, and a height transition here would be the kind that has to
 * measure its content - which is exactly the sort that misbehaves under
 * reduce-motion and on first paint.
 */
export function Disclosure({
  label,
  expanded,
  onToggle,
  children,
  className,
  testID,
}: DisclosureProps) {
  const contentId = useId();

  return (
    <View className={cn("gap-4", className)}>
      <Pressable
        accessibilityRole="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
        onPress={onToggle}
        className="flex-row items-center gap-2 self-start active:opacity-70"
        role="button"
        testID={testID}
        {...spaceKeyActivationProps(onToggle)}
      >
        <Icon
          name={expanded ? "expand-less" : "expand-more"}
          className="size-5 text-muted-foreground"
        />
        <Text className="text-sm font-semibold">{label}</Text>
      </Pressable>
      {expanded ? (
        <View nativeID={contentId} className="gap-6">
          {children}
        </View>
      ) : null}
    </View>
  );
}
