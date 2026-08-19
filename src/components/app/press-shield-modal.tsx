import { useEffect, useState } from "react";
import { Modal, Platform, StyleSheet, View, type ModalProps } from "react-native";

import { useReduceMotionEnabled } from "@/src/lib/accessibility";

/**
 * react-native-web's slide-in runs 250ms; the shield lifts on RNW's onShow
 * (fired from animationend), and this timer is only the failsafe for a missed
 * animationend — a permanently inert modal would be far worse than the
 * swallowed tap the shield prevents (#1108).
 */
export const ENTRANCE_FALLBACK_MS = 600;

export interface PressShieldModalProps extends Omit<ModalProps, "animationType"> {
  /**
   * The entrance the modal is meant to have when motion is allowed. The
   * wrapper collapses it to `"none"` under the OS reduce-motion setting, so
   * call sites state intent once instead of each repeating the ternary
   * (#1118).
   */
  animation?: "slide" | "fade";
}

/**
 * A `Modal` whose content cannot half-receive a press while it is still
 * sliding in on web.
 *
 * During react-native-web's 250ms `animationType="slide"` entrance, a press
 * on a control is silently swallowed: mousedown reaches the button, the
 * button moves before mouseup, and `onPress` never fires — the user sees a
 * focused button and nothing happening (#1051's diagnosis, decided in #1108).
 * Until RNW reports the entrance finished (`onShow`), this wrapper overlays a
 * transparent full-modal shield that swallows the whole press instead.
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
 */
export function PressShieldModal({
  animation = "slide",
  children,
  onShow,
  ...modalProps
}: PressShieldModalProps) {
  const { visible = true } = modalProps;
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
      {children}
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

const styles = StyleSheet.create({
  // Above any positioned content inside the modal; transparent, so the
  // entrance looks identical shielded or not.
  shield: { zIndex: 9999 },
});
