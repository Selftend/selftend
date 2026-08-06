import { useEffect, useRef } from "react";
import { Platform, type View } from "react-native";

// Focusable elements inside the panel, in DOM order. tabindex="-1" nodes are
// excluded on purpose: the overlay backdrop and roving-focus inactive items
// must never become trap stops.
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

interface UseModalPanelKeyboardOptions {
  /** Whether the panel is currently open. */
  open: boolean;
  /** Close the panel (Escape path). Must be referentially stable. */
  onClose: () => void;
}

/**
 * The web keyboard story for the navigation overlay panel (#665/#671):
 * Escape closes, Tab/Shift+Tab cycle within the panel, focus lands on the
 * panel's first focusable item (Home) on open, and returns to the opener (the
 * hamburger) on ANY close path — Escape, backdrop tap, or selecting a nav
 * item — via the effect's cleanup.
 *
 * Hand-rolled by decision (#665), not a dialog primitive: primitives portal
 * their content and fight the full-height side-panel layout. Attach the
 * returned `panelRef` to the panel container View; pair it with `aria-modal`
 * on the panel and `aria-hidden` on the background for assistive tech (the
 * trap below only covers the keyboard).
 *
 * A no-op on native — hardware-keyboard behavior there is out of scope.
 */
export function useModalPanelKeyboard({ open, onClose }: UseModalPanelKeyboardOptions) {
  const panelRef = useRef<View | null>(null);

  useEffect(() => {
    if (!open || Platform.OS !== "web" || typeof document === "undefined") {
      return;
    }

    // Closure-captured so the cleanup never re-reads the global — it can run
    // after a test harness (or a closing page) has already torn it down.
    const doc = document;

    // On web the RN ref is the backing DOM element.
    const panel = panelRef.current as unknown as HTMLElement | null;
    if (!panel) {
      return;
    }

    const focusables = () => Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));

    // In practice the opener is the hamburger — whatever was focused when the
    // panel opened gets focus back on close, whichever way it closes.
    const opener = doc.activeElement as HTMLElement | null;

    focusables()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const items = focusables();
      if (items.length === 0) {
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = doc.activeElement;

      // Focus escaped the panel (or never entered): pull it back in at the
      // edge matching the Tab direction instead of letting it roam the page.
      if (!active || !panel.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    // Capture phase, so an inner handler's stopPropagation cannot leak Tab or
    // Escape past the trap while the panel is modal.
    doc.addEventListener("keydown", onKeyDown, true);
    return () => {
      doc.removeEventListener("keydown", onKeyDown, true);
      opener?.focus();
    };
  }, [open, onClose]);

  return { panelRef };
}
