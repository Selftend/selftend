/**
 * Subscribes to the browser window's `focus` event, returning an unsubscribe.
 *
 * The focus EVENT, not a state value: a tab regaining focus is when a permission change made
 * in browser site settings becomes observable, and react-native-web's `AppState` only tracks
 * document visibility - which switching windows need not change.
 *
 * Feature-detected rather than platform-detected. React Native defines a `window` global on
 * native too, so `typeof window === "undefined"` is false there while `addEventListener` is
 * still missing - checking the method is what makes this safe to call from shared code and
 * under jest's native environment.
 */
export function onWindowFocus(handler: () => void): () => void {
  if (typeof window === "undefined" || typeof window.addEventListener !== "function") {
    return () => {};
  }
  window.addEventListener("focus", handler);
  return () => window.removeEventListener("focus", handler);
}
