import { useCallback, useRef } from "react";
import { Platform } from "react-native";

import { spaceKeyActivationProps } from "@/src/lib/accessibility";

interface UseRovingFocusOptions {
  count: number;
  activeIndex: number;
  onActivate: (index: number) => void;
}

interface WebRovingKeyEvent {
  key: string;
  repeat: boolean;
  preventDefault: () => void;
}

interface FocusableNode {
  focus?: () => void;
}

/**
 * Roving-tabindex keyboard support for composite widgets (radiogroups,
 * tablists): only the active item is tabbable, and Arrow/Home/End keys move
 * focus between items, activating on move (the radiogroup pattern).
 *
 * Spread getItemProps(i, onPress) onto each item Pressable. When onPress is
 * given, Space also activates the focused item (via spaceKeyActivationProps) -
 * pass it here instead of spreading spaceKeyActivationProps separately, since
 * both helpers own onKeyDown and a second spread would clobber the first.
 * No-op ({} per item) on native, where focus roving does not apply.
 */
export function useRovingFocus({ count, activeIndex, onActivate }: UseRovingFocusOptions) {
  const itemRefs = useRef<(FocusableNode | null)[]>([]);

  const getItemProps = useCallback(
    (index: number, onPress?: () => void) => {
      if (Platform.OS !== "web") {
        return {};
      }

      return {
        ref: (node: FocusableNode | null) => {
          itemRefs.current[index] = node;
        },
        // RN types tabIndex as the literal union 0 | -1.
        tabIndex: (index === activeIndex ? 0 : -1) as 0 | -1,
        onKeyDown: (event: WebRovingKeyEvent) => {
          if (onPress) {
            spaceKeyActivationProps(onPress).onKeyDown?.(event);
          }

          if (count <= 0) {
            return;
          }

          let next: number;
          switch (event.key) {
            case "ArrowRight":
            case "ArrowDown":
              next = (index + 1) % count;
              break;
            case "ArrowLeft":
            case "ArrowUp":
              next = (index - 1 + count) % count;
              break;
            case "Home":
              next = 0;
              break;
            case "End":
              next = count - 1;
              break;
            default:
              return;
          }

          // Stop arrows from scrolling the page while moving within the group.
          event.preventDefault();
          onActivate(next);
          itemRefs.current[next]?.focus?.();
        },
      };
    },
    [count, activeIndex, onActivate],
  );

  return { getItemProps };
}
