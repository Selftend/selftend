import { Platform, View } from "react-native";
import { useTranslation } from "react-i18next";

import { PressShieldModal } from "@/src/components/app/press-shield-modal";
import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";

/**
 * The in-app update offer (#1142 spec §3-§4): a calm two-button dialog, shown
 * at most once per version, on web and Android only.
 *
 * ⚠️ This deliberately overturns #388 §3 ("app-shell inline strip, never
 * overlaying content, no focus stealing, no live-region interruption"). The
 * reversal is total, not clause-by-clause — every react-native-web Modal
 * steals focus by construction (`ModalFocusTrap`), so the clause could only
 * be replaced, never softened (#1146). All four clauses are dead, replaced by
 * three constraints this component is judged against:
 *
 * - C1 — the destructive default is never the focused default: initial focus
 *   lands on "Later", never on the platform action.
 * - C2 — one appearance per version: every close path ("Later", web Escape,
 *   Android back — all one `onRequestClose` handler — plus `act` on Android,
 *   inside the hook) persists the per-version dismissal.
 * - C3 — two labelled buttons; no X, no bare glyph, no scrim tap.
 *
 * Three things here are load-bearing and were measured, not assumed (#1153):
 *
 * 1. BUTTON ORDER IS THE FOCUS MECHANISM. C1 needs no ref and no autoFocus.
 *    react-native-web's `ModalFocusTrap` runs `focusFirstDescendant` once on
 *    activation, which walks childNodes depth-first and focuses the first
 *    node that accepts focus. Card/CardHeader/CardTitle are Views and Texts
 *    with no role, so `createDOMProps` gives them no tabIndex and they are
 *    skipped; the first `role="button"` wins. "Later" is first in the tree,
 *    so "Later" is focused. Reordering these two buttons silently hands focus
 *    to the irreversible action — hence the test that pins the order.
 *
 * 2. THERE IS NO SCRIM TAP, ON PURPOSE. A `Pressable` scrim sits before the
 *    Card in the tree, so it would win `focusFirstDescendant` and break C1.
 *    ☠️ The obvious guards do NOT help: RNW's `Pressable` always emits
 *    `tabIndex` (0, or -1 when disabled), and `attemptFocus` calls `.focus()`
 *    programmatically — which succeeds on `tabindex="-1"`. Measured in
 *    Chromium (probe: `prototypes/1153-update-popup/focus-probe.mjs` on
 *    branch `prototype/1153-update-popup`): plain View scrim → focus lands
 *    on "Later"; Pressable scrim → "scrim"; `focusable={false}` scrim →
 *    still "scrim". This matches `ConfirmDialog`, which has no scrim tap
 *    either.
 *
 * 3. `animation="fade"`, NOT "slide". The press-shield is slide-only by
 *    design, so fade never arms it — the wrapper is chosen for the #1054
 *    web-unmount gate it carries, not for the shield. Fade is also what
 *    every other dialog in the app uses, and a sliding panel reads as more
 *    urgent than a non-urgent offer should.
 *
 * ☠️ `registerOverlay={false}`: the popup is the single overlay that must
 * NOT report into the #1473 overlay-count registry — its trigger gates on
 * that count, so its own registration would oscillate the offer (spec §2).
 *
 * ☠️ Rendered inside `AppLockGate`'s children even though the TRIGGER is
 * hoisted above it (#1474) — hoisting the render would put the update dialog
 * over the lock screen.
 *
 * Purely presentational: `useUpdateAvailability` mounts ONCE in the
 * protected shell and feeds this via props, so suppression can never unmount
 * the hook and reset its state.
 */
interface UpdatePopupProps {
  available: boolean;
  act: () => void;
  dismiss: () => void;
}

export function UpdatePopup({ available, act, dismiss }: UpdatePopupProps) {
  const { t } = useTranslation("common");

  // Branched in the JSX-adjacent expression with LITERAL keys — not a
  // `getActionKey()` port — so both keys sit under the i18n key-coverage
  // guard, which needs a string literal after `t(` (#1150). iOS falls
  // through to NOTHING, never to Play (#529's lesson): there is no offer to
  // act on, so there is no popup at all.
  const actionLabel =
    Platform.OS === "web"
      ? t("updatePrompt.actionWeb")
      : Platform.OS === "android"
        ? t("updatePrompt.actionPlayStore")
        : null;
  if (actionLabel === null) return null;

  return (
    <PressShieldModal
      animation="fade"
      // Web Escape and Android back both land here, and both must persist the
      // per-version dismissal (C2) — the hook's `available` never clears
      // without `dismiss()`, so a close that skips it re-opens the modal.
      onRequestClose={dismiss}
      registerOverlay={false}
      // iOS only, and inert while iOS is out of scope (#1142) — kept because
      // the wrapper forwards it and a landscape iPad would otherwise be
      // portrait-locked (WikiCanvas #667). Passes through `...modalProps`.
      supportedOrientations={["portrait", "portrait-upside-down", "landscape"]}
      // The popup paints its own panel over the dimmed backdrop, so it owns
      // its close paths itself ("Later" + onRequestClose) — a pinned escape
      // row would be the X that C3 forbids.
      surface="sheet"
      transparent
      visible={available}
    >
      <View className="flex-1 items-center justify-center bg-black/50 p-6">
        <Card className="w-full max-w-md" testID="update-popup">
          <CardHeader>
            <CardTitle>{t("updatePrompt.title")}</CardTitle>
            <CardDescription>{t("updatePrompt.body")}</CardDescription>
          </CardHeader>
          <CardContent>
            <View className="gap-3">
              {/* FIRST on purpose — this is what C1's focus rule rests on. */}
              <Button onPress={dismiss} testID="update-popup-later" variant="secondary">
                <Text>{t("updatePrompt.later")}</Text>
              </Button>
              <Button onPress={act} testID="update-popup-act" variant="default">
                <Text>{actionLabel}</Text>
              </Button>
            </View>
          </CardContent>
        </Card>
      </View>
    </PressShieldModal>
  );
}
