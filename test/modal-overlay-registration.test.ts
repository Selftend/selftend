import { readFileSync } from "node:fs";
import { join } from "node:path";

import { sourceFiles, stripComments } from "./source-scan";

/**
 * #1473 (spec §2 on #1142): every modal overlay reports "I am visible" into
 * the shared overlay-count registry (`src/stores/overlay-count-store.ts`), so
 * the update offer can ask "is anything already on screen?" with a single
 * read and never appear over another modal.
 *
 * The registration line is one hook call per component:
 *
 *   useOverlayRegistration(visible);
 *
 * Call sites of `PressShieldModal` need no per-site line — the wrapper
 * registers its own `visible`, the same way it carries the #1054 web-unmount
 * gate for all of them. This suite therefore polices only the files that
 * render a raw `<Modal>` (the wrapper's own source among them: its internal
 * registration is what every wrapper call site inherits).
 *
 * Deliberately a SEPARATE suite from `modal-web-unmount.test.ts`, with its
 * own `EXEMPT` map, because the exemption sets differ and will keep
 * differing: `tour-overlay.tsx` is exempt from the unmount gate (its parent
 * gates the mount) but MUST register here (it covers the screen while
 * mounted), and the update popup will be exempt here (self-registration
 * would oscillate the gate its own render raises, spec §2) while carrying
 * the unmount gate through the wrapper.
 *
 * Like its sibling, this suite DERIVES the file list from source rather than
 * pinning it, so a new raw `<Modal>` lands already registered or fails CI
 * here.
 */

const ROOT = join(__dirname, "..");

/**
 * Raw-`<Modal>` renderers that must NOT register. Empty today; the update
 * popup joins with its own ticket (spec §2: it gates on the count, so its own
 * registration would oscillate it), each entry with the reason.
 */
const EXEMPT: Record<string, string> = {};

/** One registration call anywhere in the file satisfies the gate. */
const REGISTERS = /\buseOverlayRegistration\s*\(/;

/**
 * JSX use of `<Modal` (word-bounded, so neither `<ModalFocusTrap` nor
 * `<PressShieldModal` matches) — the same detection pair as
 * `modal-web-unmount.test.ts`, kept in lockstep on purpose: both suites mean
 * "this file renders a raw react-native Modal".
 */
const RENDERS_A_MODAL = /<Modal[\s/>]/;

/** `Modal` named in an import from "react-native" (single or multi-line). */
const IMPORTS_RN_MODAL = /import\s*\{[^}]*\bModal\b[^}]*\}\s*from\s*"react-native"/;

const files = sourceFiles(ROOT, { dirs: ["src", "app"] });

const modalFiles = files.filter((file) => {
  const source = readFileSync(join(ROOT, file), "utf8");
  return IMPORTS_RN_MODAL.test(source) && RENDERS_A_MODAL.test(stripComments(source));
});

describe("every raw react-native Modal reports into the overlay-count registry (#1473)", () => {
  it("derives the Modal list from source (canary: ConfirmDialog is found)", () => {
    // If the detection regexes rot, `modalFiles` goes empty and the
    // registration check below passes vacuously — this canary turns that
    // silent blindness into a failure.
    expect(modalFiles).toContain("src/components/app/confirm-dialog.tsx");
  });

  it("the press-shield wrapper itself registers (#1473 — call sites inherit it)", () => {
    // Every `<PressShieldModal>` call site relies on the wrapper's internal
    // registration instead of a per-site line, so the wrapper dropping out of
    // this suite's derived list would silently un-police the registration all
    // of them inherit. If the wrapper's file moves, update this path.
    expect(modalFiles).toContain("src/components/app/press-shield-modal.tsx");
  });

  it("every non-exempt Modal renderer calls useOverlayRegistration", () => {
    const offenders = modalFiles
      .filter((file) => !(file in EXEMPT))
      .filter((file) => !REGISTERS.test(stripComments(readFileSync(join(ROOT, file), "utf8"))));

    // Each listed file puts an overlay on screen that the registry cannot
    // see, so the update offer could appear on top of it (spec §2 on #1142).
    // Add `useOverlayRegistration(visible)` beside the component's other
    // hooks, render through <PressShieldModal> (which registers for its call
    // sites), or — only for an overlay that must not raise the count it
    // itself gates on — add it to EXEMPT with the reason.
    expect(offenders).toEqual([]);
  });

  it("the exemptions still exist and still render a raw Modal", () => {
    // An allowlist must not outlive what it exempts: if one of these stops
    // rendering a raw Modal (or is deleted), drop it from EXEMPT.
    for (const file of Object.keys(EXEMPT)) {
      expect(modalFiles).toContain(file);
    }
  });
});
