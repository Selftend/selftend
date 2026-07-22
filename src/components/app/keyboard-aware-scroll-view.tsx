import { useMemo, useRef } from "react";
import { Keyboard, ScrollView, TextInput } from "react-native";
import type { ComponentProps } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

import { useReduceMotionEnabled } from "@/src/lib/accessibility";
import {
  computeKeyboardScrollDelta,
  KeyboardScrollContainerContext,
} from "@/src/lib/keyboard-scroll";

/** Breathing room between the focused input and the visible-area edges. */
const VISIBLE_MARGIN = 12;

/**
 * ScrollView that scrolls the focused TextInput just above the on-screen
 * keyboard on native. It provides KeyboardScrollContainerContext; the shared
 * Input/Textarea focus hook calls scrollFocusedInputIntoView at the right
 * moments (focus with keyboard up, keyboardDidShow, and a settle pass).
 *
 * All measurements are window coordinates: the ScrollView's own frame (already
 * shrunk by the surrounding KeyboardAvoidingView's padding, so footers are
 * excluded), capped by the keyboard's top edge from Keyboard.metrics().
 * On web this renders a plain ScrollView; the web hooks handle the keyboard.
 */
export function KeyboardAwareScrollView({
  children,
  onScroll,
  ...props
}: ComponentProps<typeof ScrollView>) {
  const scrollRef = useRef<ScrollView>(null);
  // Current scroll offset, tracked so the correction can be expressed as an
  // absolute scrollTo (ScrollView has no scrollBy).
  const offsetRef = useRef(0);
  const reduceMotionEnabled = useReduceMotionEnabled();

  const container = useMemo(
    () => ({
      scrollFocusedInputIntoView: () => {
        const scrollView = scrollRef.current;
        const scrollHost = scrollView?.getNativeScrollRef();
        const input = TextInput.State.currentlyFocusedInput();
        if (!scrollView || !scrollHost || !input) {
          return;
        }
        scrollHost.measureInWindow((_svX, svY, _svWidth, svHeight) => {
          input.measureInWindow((_x, y, _width, height) => {
            // While the keyboard is closed (or metrics are unavailable) the
            // ScrollView frame alone bounds the visible area.
            const keyboardTop = Keyboard.metrics()?.screenY ?? Number.POSITIVE_INFINITY;
            const delta = computeKeyboardScrollDelta({
              inputTop: y,
              inputBottom: y + height,
              visibleTop: svY + VISIBLE_MARGIN,
              visibleBottom: Math.min(svY + svHeight, keyboardTop) - VISIBLE_MARGIN,
            });
            if (delta === 0) {
              return;
            }
            scrollView.scrollTo({
              y: Math.max(0, offsetRef.current + delta),
              animated: !reduceMotionEnabled,
            });
          });
        });
      },
    }),
    [reduceMotionEnabled],
  );

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetRef.current = event.nativeEvent.contentOffset.y;
    onScroll?.(event);
  };

  return (
    <ScrollView ref={scrollRef} onScroll={handleScroll} scrollEventThrottle={16} {...props}>
      <KeyboardScrollContainerContext.Provider value={container}>
        {children}
      </KeyboardScrollContainerContext.Provider>
    </ScrollView>
  );
}
