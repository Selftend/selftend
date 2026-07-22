import type { KeyboardAvoidingViewProps } from "react-native";

/**
 * `behavior` for every KeyboardAvoidingView in the app.
 *
 * "padding" on BOTH native platforms. The classic
 * `Platform.OS === "ios" ? "padding" : undefined` pattern relied on Android's
 * window-level `adjustResize` doing the work - but edge-to-edge (enforced
 * since Expo SDK 54 / Android 15) makes `adjustResize` behave like
 * `adjustNothing`: the window no longer resizes and the keyboard just overlays
 * the app. With `behavior` undefined KeyboardAvoidingView renders a plain
 * View, so Android screens got no avoidance at all. Explicit "padding" makes
 * the view pad itself by the keyboard overlap on every platform.
 *
 * On web KeyboardAvoidingView renders a plain View regardless; form screens
 * use `useWebKeyboardInset` / `useScrollIntoViewOnFocus` there instead.
 */
export const KEYBOARD_AVOIDING_BEHAVIOR: KeyboardAvoidingViewProps["behavior"] = "padding";
