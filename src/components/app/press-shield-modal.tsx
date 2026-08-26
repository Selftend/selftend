import { useEffect, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, View, type ModalProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { DEFAULT_INTERACTIVE_HIT_SLOP, useReduceMotionEnabled } from "@/src/lib/accessibility";
import { useOverlayRegistration } from "@/src/stores/overlay-count-store";

/**
 * react-native-web's slide-in runs 250ms; the shield lifts on RNW's onShow
 * (fired from animationend), and this timer is only the failsafe for a missed
 * animationend — a permanently inert modal would be far worse than the
 * swallowed tap the shield prevents (#1108).
 */
export const ENTRANCE_FALLBACK_MS = 600;

interface PressShieldModalBaseProps extends Omit<ModalProps, "animationType"> {
  /**
   * The entrance the modal is meant to have when motion is allowed. The
   * wrapper collapses it to `"none"` under the OS reduce-motion setting, so
   * call sites state intent once instead of each repeating the ternary
   * (#1118).
   */
  animation?: "slide" | "fade";
}

/**
 * Who owns the surface, and therefore who owns the Escape (#1252, spec M1 on
 * #1167).
 *
 * `"full-screen"` — the default, and the shape M1 governs: the modal covers
 * `InvisibleHeader` entirely, so the wrapper pins the escape row itself and
 * `onEscape` is **required**. A full-screen modal that forgets its way out is
 * a type error, not something a test has to catch (G1).
 *
 * `"sheet"` — the modal paints its own panel over a backdrop (a bottom sheet,
 * a centred card, a native `pageSheet`) and the screen stays visible behind
 * it. A 48px `bg-background` row above such a panel would be an opaque bar
 * hanging over the dimmed backdrop, so the wrapper renders no chrome and the
 * call site pins its own Escape inside its own panel — which is what
 * `ManageEmotionsModal` already does, and what M1 names as "the shape to
 * copy". Declaring it is deliberate and greppable: it is the one way to opt a
 * modal out of the pinned row, and #1257 visited each of the four that do.
 */
type PressShieldModalEscapeProps =
  // The default, so a new modal starts out owing an Escape.
  //
  // `escapeLabel` is M2's word (#1258): a bare X when closing is free, a
  // word when closing decides something that sticks. Pass an
  // already-translated label and the row wears it in place of the X glyph —
  // the label IS the accessible name then, replacing the bare `common:close`.
  // Exactly one surface in the app qualifies: the first-run onboarding gate,
  // whose skip persists onboarding as done and never returns. Everything
  // that closes free leaves this off.
  | { surface?: "full-screen"; onEscape: () => void; escapeLabel?: string }
  // The opt-out, and the only one.
  | { surface: "sheet"; onEscape?: never; escapeLabel?: never };

export type PressShieldModalProps = PressShieldModalBaseProps & PressShieldModalEscapeProps;

/**
 * A `Modal` whose content cannot half-receive a press while it is still
 * sliding in on web, and — since #1252 — whose full-screen form always
 * carries a visible way out.
 *
 * During react-native-web's 250ms `animationType="slide"` entrance, a press
 * on a control is silently swallowed: mousedown reaches the button, the
 * button moves before mouseup, and `onPress` never fires — the user sees a
 * focused button and nothing happening (#1051's diagnosis, decided in #1108).
 * Until RNW reports the entrance finished (`onShow`), this wrapper overlays a
 * transparent shield that swallows the whole press instead.
 *
 * Web-only and slide-only by design: native touch handling tracks moving
 * views, and a fade never moves the press target. Under reduce motion the
 * entrance is `"none"` and no shield is ever rendered, so gated flows behave
 * identically under `prefers-reduced-motion` — including the e2e suite, which
 * runs that way.
 *
 * The wrapper also owns the #1054 web-unmount gate: when `visible` goes
 * false on web it renders nothing, instead of handing RNW a dismissed Modal
 * that lingers as a non-inert focus trap for its 250ms fade-out (#1034).
 * Call sites therefore need no per-site gate — and since only this wrapper's
 * render is gated, a call site's own state still survives a close.
 *
 * ⚠️ `onRequestClose` is untouched by any of this (M4). Android hardware back
 * and the web Escape key already work on every modal here, and on the
 * onboarding wizard back deliberately steps to the previous panel. This
 * wrapper governs the *visible* affordance; the system gesture is a bonus and
 * never the safety net.
 */
export function PressShieldModal(props: PressShieldModalProps) {
  // Read off `props` rather than the destructured copy below: destructuring a
  // discriminated union drops the correlation between `surface` and
  // `onEscape`, and this narrowing is exactly what makes a missing Escape a
  // type error rather than a runtime `undefined`.
  const escapeRow =
    props.surface === "sheet" ? null : (
      <SafeAreaView edges={["top", "left", "right"]}>
        <ModalEscape label={props.escapeLabel} onPress={props.onEscape} />
      </SafeAreaView>
    );

  // `surface`, `onEscape` and `escapeLabel` are destructured only to keep
  // them off the `Modal` (rest siblings, deliberately unused here).
  const {
    animation = "slide",
    surface,
    onEscape,
    escapeLabel,
    children,
    onShow,
    ...modalProps
  } = props;
  const { visible = true } = modalProps;
  // Registering here covers every call site at once, the same way the wrapper
  // already carries the #1054 gate for all of them (#1473, spec §2 on #1142).
  useOverlayRegistration(visible);
  const reduceMotionEnabled = useReduceMotionEnabled();
  const animationType = reduceMotionEnabled ? "none" : animation;
  const [entranceDone, setEntranceDone] = useState(false);
  const shieldActive =
    Platform.OS === "web" && animationType === "slide" && visible && !entranceDone;

  // Closing re-arms the shield, so a reopened modal is shielded through its
  // next slide-in too. Render-time reset, not an effect: the hooks lint
  // (react-hooks/set-state-in-effect) forbids the effect form, and this is
  // the react.dev-endorsed "adjust state when a prop changes" shape.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (!visible && entranceDone) setEntranceDone(false);
  }

  useEffect(() => {
    if (!shieldActive) return;
    const fallback = setTimeout(() => setEntranceDone(true), ENTRANCE_FALLBACK_MS);
    return () => clearTimeout(fallback);
  }, [shieldActive]);

  const handleShow = (event: Parameters<NonNullable<ModalProps["onShow"]>>[0]) => {
    setEntranceDone(true);
    onShow?.(event);
  };

  // ⚠️ WEB: a closed modal unmounts outright instead of lingering for its
  // 250ms fade-out, during which react-native-web's Modal is a non-inert
  // focus trap (#1034; swept in #1054 — the full story lives on
  // ConfirmDialog's gate). Native keeps its exit animation: it has none of
  // this. After the hooks, so a close still re-arms the shield above.
  if (!visible && Platform.OS === "web") return null;

  return (
    <Modal {...modalProps} animationType={animationType} onShow={handleShow}>
      {escapeRow === null ? (
        children
      ) : (
        <View className="flex-1 bg-background">
          {/* The row owns the top inset, which is why the full-screen call
              sites below it ask for `edges` without "top": on web
              `SafeAreaView` is a plain padding shim with no idea where it
              sits, so a nested one would inset twice (it is position-aware
              only on native). */}
          {escapeRow}
          {/* Outside the scroller, and this is the whole fix: `HelpSheet`'s X
              — the precedent named when this work was charted — sat INSIDE
              its `ScrollView` and scrolled away on the first swipe, so on a
              long guide it was visible only at scroll position zero (#1257
              removed it). Anything that moves this row into `children`
              reintroduces the original complaint one gesture later. */}
          <View className="flex-1">{children}</View>
        </View>
      )}
      {shieldActive ? (
        <View
          aria-hidden
          // The prop, not style, and "auto", not "box-none": the shield must
          // swallow the press itself, not pass it to the moving control.
          pointerEvents="auto"
          style={[StyleSheet.absoluteFill, styles.shield]}
          testID="modal-entrance-shield"
        />
      ) : null}
    </Modal>
  );
}

/**
 * The modal Escape: 48px tall to match `ScreenTopBar` (#733), so a modal's
 * escape row and a screen's escape row are the same object at a glance, and
 * right-aligned over `bg-background`.
 *
 * **The row holds only the Escape — no title** (M5). All ten guides already
 * render their own title inside the scroll, so a pinned title would show it
 * twice, and threading one in would be the first crack in "only the Escape".
 * For the same reason the accessible name is a bare `common:close` and never
 * "Close {title}" (#1239): the dialog announces its title on entry through
 * its own `accessibilityLabel`, so repeating it on the way out is redundancy.
 *
 * Rendered **unconditionally** for a full-screen surface — never
 * `{cond ? <ModalEscape/> : null}` — for the same reason `ScreenEscape` is:
 * a conditional is precisely what the enforcement gate cannot see through
 * (G1, #1263).
 *
 * With a `label` it wears the word instead of the X (M2, #1258): closing the
 * one surface that passes it decides something that sticks, and a bare X
 * there would disguise a decision as a dismissal. The word then IS the
 * accessible name — announcing "Close" on a press that persists a decision
 * would be the same disguise, one sense over.
 */
function ModalEscape({ label, onPress }: { label?: string; onPress: () => void }) {
  const { t } = useTranslation("common");

  return (
    <View className="h-12 flex-row items-center justify-end px-5">
      <Pressable
        accessibilityLabel={label ?? t("close")}
        accessibilityRole="button"
        className="active:opacity-70"
        hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
        onPress={onPress}
        testID="modal-escape"
      >
        {label ? (
          <Text className="text-sm font-medium text-muted-foreground">{label}</Text>
        ) : (
          <Icon name="close" className="size-6 text-muted-foreground" />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Above any positioned content inside the modal; transparent, so the
  // entrance looks identical shielded or not.
  shield: { zIndex: 9999 },
});
