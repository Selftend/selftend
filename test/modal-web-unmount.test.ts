import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { sourceFiles, stripComments } from "./source-scan";

/**
 * #1054: every raw react-native `<Modal>` driven by a visibility value must
 * unmount on web when that value goes false, rather than being handed
 * `visible={false}`.
 *
 * react-native-web keeps a DISMISSED Modal in the tree for its whole 250ms
 * fade-out, and it is not inert while it lingers: a full-viewport
 * `position: fixed; z-index: 9999` layer whose `ModalFocusTrap` holds a
 * document-level capture `focus` listener and force-refocuses on unmount. So
 * anything focus-taking that opens within that window has focus yanked out
 * from under it — a Radix popover (every @rn-primitives menu on web)
 * dismisses itself on focus-outside, which is how the habits overflow menu
 * shut before "Delete" could be pressed, ~20% of runs (#1034).
 *
 * The decided fix (#1054 triage) is one grep-able line per component, gated
 * to web so native keeps its exit animation:
 *
 *   if (!visible && Platform.OS === "web") return null;
 *
 * or, where the Modal is a sibling of an always-rendered trigger (the
 * date/time fields), the equivalent inline gate:
 *
 *   {!open && Platform.OS === "web" ? null : ( <Modal ... /> )}
 *
 * Since #1118 the #1108 press-shield wrapper carries the gate itself, so a
 * call site rendering `<PressShieldModal>` needs no per-site line — this
 * suite only polices files that render a raw `<Modal>` (the wrapper's own
 * source among them: its internal gate is what every wrapper call site
 * inherits, so this suite enforcing it there is what keeps the #1054 regime
 * intact for all of them; PressShieldModal's behavioral suite covers the
 * gate's runtime semantics).
 *
 * This suite DERIVES the file list from source rather than pinning it, so a
 * new raw `<Modal>` lands already gated or fails CI here.
 */

const ROOT = join(__dirname, "..");

/**
 * Files that render a raw `<Modal>` but never leave one lingering on web —
 * either the PARENT stops rendering them entirely on close (unmounting is the
 * mount point's job there, the shape that never has this problem, #1054 issue
 * body), or the file itself never ships on web.
 */
const EXEMPT: Record<string, string> = {
  // Hardcodes `visible` on the Modal; home-tour.tsx gates mounting with
  // `if (!current || !targetRect) return null;`.
  "src/features/tours/tour-overlay.tsx": "mounted only while a tour step is active",
  // The web bundle resolves time-field.web.tsx (an <input type="time">, no
  // Modal), so this Modal only ever renders on native — where the lingering
  // fade-out is the wanted exit animation. The #1054 table listed this file,
  // but the premise did not survive the platform fork.
  "src/components/app/time-field.tsx": "web ships time-field.web.tsx instead",
};

/** `if (!visible && Platform.OS === "web") return null;` (any prop name). */
const RETURN_NULL_GATE = /if\s*\(!\w+\s*&&\s*Platform\.OS === "web"\)\s*return null;/;

/** `{!open && Platform.OS === "web" ? null : (` — the sibling-Modal form. */
const INLINE_GATE = /!\w+\s*&&\s*Platform\.OS === "web"\s*\?\s*null\s*:/;

/**
 * JSX use of `<Modal` (word-bounded, so neither `<ModalFocusTrap` nor
 * `<PressShieldModal` matches). Call sites of the #1108 press-shield wrapper
 * are deliberately out of scope: since #1118 the wrapper gates its own raw
 * Modal, so they inherit the unmount instead of each repeating the line.
 */
const RENDERS_A_MODAL = /<Modal[\s/>]/;

/** `Modal` named in an import from "react-native" (single or multi-line). */
const IMPORTS_RN_MODAL = /import\s*\{[^}]*\bModal\b[^}]*\}\s*from\s*"react-native"/;

const files = sourceFiles(ROOT, { dirs: ["src", "app"] });

const modalFiles = files.filter((file) => {
  const source = readFileSync(join(ROOT, file), "utf8");
  return IMPORTS_RN_MODAL.test(source) && RENDERS_A_MODAL.test(stripComments(source));
});

describe("raw react-native Modals unmount on web when closed (#1034 → #1054)", () => {
  it("derives the Modal list from source (canary: ConfirmDialog is found)", () => {
    // If the detection regexes rot, `modalFiles` goes empty and the gate check
    // below passes vacuously — this canary turns that silent blindness into a
    // failure.
    expect(modalFiles).toContain("src/components/app/confirm-dialog.tsx");
  });

  it("still polices the press-shield wrapper's own raw Modal (#1118)", () => {
    // Every `<PressShieldModal>` call site relies on the wrapper's internal
    // gate instead of a per-site line, so the wrapper dropping out of this
    // suite's derived list would silently un-police the gate all of them
    // inherit. If the wrapper's file moves, update this path — the property
    // under test is that its raw Modal stays inside the regime.
    expect(modalFiles).toContain("src/components/app/press-shield-modal.tsx");
  });

  it("every non-exempt Modal renderer carries the web unmount gate", () => {
    const offenders = modalFiles
      .filter((file) => !(file in EXEMPT))
      .filter((file) => {
        const code = stripComments(readFileSync(join(ROOT, file), "utf8"));
        return !RETURN_NULL_GATE.test(code) && !INLINE_GATE.test(code);
      });

    // Each listed file keeps a dismissed Modal mounted on web for its 250ms
    // fade-out, where its focus trap steals focus from whatever opens next
    // (#1034). Add the one-line gate (see this suite's header), render
    // through <PressShieldModal> (which carries the gate, #1118), or — only
    // if the file's Modal genuinely never lingers on web — add it to EXEMPT
    // with the reason.
    expect(offenders).toEqual([]);
  });

  it("the exemptions still exist and still render a raw Modal", () => {
    // An allowlist must not outlive what it exempts: if one of these stops
    // rendering a raw Modal (or is deleted), drop it from EXEMPT.
    for (const file of Object.keys(EXEMPT)) {
      expect(modalFiles).toContain(file);
    }
    // time-field.tsx's exemption holds only while the web fork exists.
    expect(existsSync(join(ROOT, "src/components/app/time-field.web.tsx"))).toBe(true);
  });
});
