import { useEffect } from "react";
import { Keyboard, Platform } from "react-native";

import { useWebKeyboardInset } from "@/src/lib/use-web-keyboard-inset";
import { INSET_LAYER, useLayeredInsetStore } from "@/src/stores/layered-inset-store";

/** There is exactly one keyboard, so layer 0 needs no per-instance id. */
const KEYBOARD_ID = "keyboard";

/**
 * The soft keyboard's top edge, published as layer 0 (#1339, spec §5.2).
 *
 * ☠️ The web keyboard overlays the layout viewport. `public/index.html` has no
 * `interactive-widget=resizes-content` — deliberately, see
 * `use-web-keyboard-inset.ts` — so a bottom-anchored `absolute` element sits
 * BEHIND the keyboard unless something measures it. `visualViewport` is that
 * something; a window resize is not a proxy for any of it.
 *
 * ☠️ Native has no avoidance either: since SDK 54's edge-to-edge, Android's
 * `adjustResize` behaves like `adjustNothing`, so the keyboard overlays exactly
 * as it does on iOS, and the floaters live outside every KeyboardAvoidingView.
 *
 * Renders nothing: it is mounted for its subscriptions alone. Keeping it a
 * component rather than a hook confines the keyboard's re-renders to itself,
 * instead of re-rendering the whole app under the root layout.
 */
export function KeyboardInsetPublisher() {
  const webInset = useWebKeyboardInset();

  useEffect(() => {
    // Platform.OS, not Platform.select: jest resolves `select`'s web branch
    // invisibly, which makes any assertion about it vacuous.
    if (Platform.OS === "web") {
      return;
    }

    const show = Keyboard.addListener("keyboardDidShow", (event) => {
      useLayeredInsetStore
        .getState()
        .publishInset(KEYBOARD_ID, INSET_LAYER.keyboard, event.endCoordinates.height);
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      useLayeredInsetStore.getState().clearInset(KEYBOARD_ID);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }

    if (webInset > 0) {
      useLayeredInsetStore.getState().publishInset(KEYBOARD_ID, INSET_LAYER.keyboard, webInset);
    } else {
      useLayeredInsetStore.getState().clearInset(KEYBOARD_ID);
    }
  }, [webInset]);

  useEffect(() => () => useLayeredInsetStore.getState().clearInset(KEYBOARD_ID), []);

  return null;
}
