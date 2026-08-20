import { Platform, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { PressShieldModal } from "@/src/components/app/press-shield-modal";
import { Text } from "@/src/components/react-native-reusables/text";

/**
 * PROTOTYPE (#1153) — not wired to anything, not shipped. The decided shape for
 * the update popup that replaces `UpdateBanner` (#1142). Delete when the spec
 * lands; the real component takes its props from the hoisted hook (#1148).
 *
 * ⚠️ This deliberately overturns #388 §3 ("app-shell inline strip, never
 * overlaying content, no focus stealing"). All four of its clauses are dead —
 * see #1146. The shipped component carries this docblock for real.
 *
 * Three things here are load-bearing and were measured, not assumed:
 *
 * 1. BUTTON ORDER IS THE FOCUS MECHANISM. C1 ("Later" is focused, never
 *    "Update") needs no ref and no autoFocus. react-native-web's
 *    `ModalFocusTrap` runs `focusFirstDescendant` once on activation, which
 *    walks childNodes depth-first and focuses the first node that accepts
 *    focus. Card/CardHeader/CardTitle are Views and Texts with no role, so
 *    `createDOMProps` gives them no tabIndex and they are skipped; the first
 *    `role="button"` wins. "Later" is first in the tree, so "Later" is focused.
 *    Reordering these two buttons silently hands focus to the irreversible
 *    action — hence the test that pins the order.
 *
 * 2. THERE IS NO SCRIM TAP, ON PURPOSE. A `Pressable` scrim sits before the
 *    Card in the tree, so it would win `focusFirstDescendant` and break C1.
 *    ☠️ The obvious guards do NOT help: RNW's `Pressable` always emits
 *    `tabIndex` (0, or -1 when disabled), and `attemptFocus` calls `.focus()`
 *    programmatically — which succeeds on `tabindex="-1"`. Measured in
 *    Chromium: plain View scrim → focus lands on "Later"; Pressable scrim →
 *    "scrim"; `focusable={false}` scrim → still "scrim". So the close paths
 *    are the labelled "Later", Escape (web, via RNW's ModalContent), and the
 *    Android back button — all three the same handler, per C2. This matches
 *    `ConfirmDialog`, which has no scrim tap either.
 *
 * 3. `animation="fade"`, NOT "slide". The press-shield is slide-only by
 *    design, so fade never arms it — this wrapper is chosen for the #1054
 *    web-unmount gate it carries, not for the shield. Fade is also what every
 *    other dialog in the app uses, and a sliding panel reads as more urgent
 *    than a non-urgent offer should.
 */
export function UpdatePopupPrototype({
  visible,
  onLater,
  onUpdate,
}: {
  visible: boolean;
  onLater: () => void;
  onUpdate: () => void;
}) {
  const { t } = useTranslation("common");

  return (
    <PressShieldModal
      animation="fade"
      // Web Escape and Android back both land here, and both must persist the
      // per-version dismissal (C2) — the hook's `available` never clears
      // without `dismiss()`, so a close that skips it re-opens the modal.
      onRequestClose={onLater}
      // iOS only, and inert while iOS is out of scope (#1142) — kept because
      // the wrapper forwards it and a landscape iPad would otherwise be
      // portrait-locked (WikiCanvas #667). Passes through `...modalProps`.
      supportedOrientations={["portrait", "portrait-upside-down", "landscape"]}
      transparent
      visible={visible}
    >
      <View className="flex-1 items-center justify-center bg-black/50 p-6">
        <Card className="w-full max-w-md" testID="update-popup">
          <CardHeader>
            <CardTitle>{t("updatePopup.title")}</CardTitle>
            <CardDescription>{t("updatePopup.message")}</CardDescription>
          </CardHeader>
          <CardContent>
            <View className="gap-3">
              {/* FIRST on purpose — this is what C1's focus rule rests on. */}
              <Button onPress={onLater} testID="update-popup-later" variant="secondary">
                <Text>{t("updatePopup.later")}</Text>
              </Button>
              <Button onPress={onUpdate} testID="update-popup-act" variant="default">
                <Text>{t(getActionKey())}</Text>
              </Button>
            </View>
          </CardContent>
        </Card>
      </View>
    </PressShieldModal>
  );
}

/**
 * Read per render, never at module scope — the same reason `UpdateBanner`
 * does (#529): module-scope evaluation bakes the platform in at import time
 * and makes the branch untestable. iOS is unreachable while the popup is
 * web + Android only, but the key stays so the branch is not a lie.
 */
function getActionKey() {
  if (Platform.OS === "web") return "updatePopup.actionWeb";
  if (Platform.OS === "ios") return "updatePopup.actionAppStore";
  return "updatePopup.actionPlayStore";
}
