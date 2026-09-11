interface ScrollableNode {
  scrollIntoView?: (options: { block: "start"; behavior: "auto" }) => void;
}

/**
 * Put a block at the top of whatever is scrolling it.
 *
 * For the one case a scroll container cannot handle by itself: a section that
 * REMOVES most of its own height while the viewport is sitting inside the part
 * that goes (the thought record's patterns fold, #2350). Nothing above the
 * section moves, but the scroll offset then clamps to the shortened content and
 * where that lands is arithmetic, not a decision.
 *
 * ☠️ **Web only, by construction, and the native gap is real rather than
 * hidden.** On react-native-web a `View` ref IS the DOM node, so the element can
 * ask its own scroll parents to move without anyone forwarding a `ScrollView`
 * ref down to it - the same shape `mood-entry-editor-screen` already uses to
 * bring its score row into view. On iOS and Android the ref is a native handle
 * with no such method, this returns `false`, and the landing position is
 * whatever the clamp gives. Closing that would need the `ScrollView` ref
 * `MobileFormScreen` deliberately does not forward (#2333), which is a ruling to
 * reopen rather than route around.
 *
 * `behavior: "auto"` - instant, never smooth. The disclosure this accompanies is
 * unanimated by written ruling (#716), so a glide would be motion the fold
 * itself refuses, and reduce-motion is honoured by having none to suppress.
 *
 * Returns whether anything was asked to scroll, so a caller can tell "no DOM
 * here" from "done".
 */
export function scrollNodeToTop(node: unknown): boolean {
  const element = node as ScrollableNode | null;
  if (!element || typeof element.scrollIntoView !== "function") {
    return false;
  }
  element.scrollIntoView({ block: "start", behavior: "auto" });
  return true;
}
