import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/**
 * How much of the screen the software keyboard currently covers, in points.
 *
 * ☠️ This exists because `KeyboardAvoidingView` measurably did not do it on the
 * age gate. Measured from the Maestro hierarchy of the 2026-09-21 capture run
 * (iPhone 17 Pro Max, 440x956 points, clean install, keyboard up from the
 * country search):
 *
 * - the keyboard's `inputView` occupies **611-956**, so its top edge is 611
 * - `Continue` occupies **591-631** - its centre is 611, exactly the edge
 * - the card occupies roughly **275-655**, centred in the FULL 956
 *
 * That last line is the finding: centred in 956 rather than in the 611 above
 * the keyboard means the surrounding `KeyboardAvoidingView` contributed **zero**
 * padding. ⚠️ The card is only ~380 points tall, so it fits above the keyboard
 * with room to spare - nothing was too big, it was merely positioned as though
 * the keyboard were not there. See #2647.
 *
 * ⚠️ **iOS only, and that is a scoping decision rather than a platform
 * difference.** The defect is measured on iOS; Android's keyboard handling
 * rests on the `behavior="padding"` reasoning in `keyboard-avoiding.ts`
 * (edge-to-edge makes `adjustResize` behave like `adjustNothing`), and that
 * path is not reproducible here, so it is left exactly as it was. Returning 0
 * off iOS means a caller adds no padding there and nothing changes.
 *
 * Returns 0 while the keyboard is closed, so `inset > 0` reads as "the keyboard
 * is up".
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "ios") {
      return;
    }

    // `keyboardWillChangeFrame` rather than `keyboardDidShow`: it fires for the
    // height CHANGES too, which is the case that matters here. Moving from the
    // country field's alphabetic keyboard to a numeric one is a resize with no
    // hide in between, and a did-show listener would hold the first height.
    const onChange = Keyboard.addListener("keyboardWillChangeFrame", (event) => {
      const height = event.endCoordinates?.height;
      if (typeof height !== "number") {
        return;
      }
      // Clamped because a dismissing or undocked keyboard can report a
      // negative height mid-animation, and negative padding is a crash.
      setInset(Math.max(height, 0));
    });

    const onHide = Keyboard.addListener("keyboardWillHide", () => {
      setInset(0);
    });

    return () => {
      onChange.remove();
      onHide.remove();
    };
  }, []);

  return inset;
}
