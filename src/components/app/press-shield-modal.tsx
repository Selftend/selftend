import { useEffect, useState } from "react";
import { Modal, Platform, StyleSheet, View, type ModalProps } from "react-native";

/**
 * react-native-web's slide-in runs 250ms; the shield lifts on RNW's onShow
 * (fired from animationend), and this timer is only the failsafe for a missed
 * animationend — a permanently inert modal would be far worse than the
 * swallowed tap the shield prevents (#1108).
 */
const ENTRANCE_FALLBACK_MS = 600;

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
 * views, and a fade never moves the press target. With
 * `animationType="none"` (the reduce-motion path) no shield is ever
 * rendered, so gated flows behave identically under
 * `prefers-reduced-motion` — including the e2e suite, which runs that way.
 */
export function PressShieldModal({ children, onShow, ...modalProps }: ModalProps) {
  const { animationType, visible = true } = modalProps;
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

  return (
    <Modal {...modalProps} onShow={handleShow}>
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
