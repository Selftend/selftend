import { readFileSync } from "node:fs";
import { join } from "node:path";

import { rawModalRenderers, sourceFiles, stripComments } from "./source-scan";

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
 * gate for all of them. This suite therefore polices the files that render a
 * raw `<Modal>` (the wrapper's own source among them: its internal
 * registration is what every wrapper call site inherits) — plus, since
 * #1475, the one escape hatch from that inheritance: the wrapper's
 * `registerOverlay={false}` opt-out, which only EXEMPT files may pass.
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
 * Overlay renderers that must NOT register — either a raw-`<Modal>` file with
 * no `useOverlayRegistration` call, or a `PressShieldModal` call site passing
 * the wrapper's `registerOverlay={false}` opt-out. Each entry carries the
 * reason; the update popup is the single exemption and is expected to stay
 * that way.
 */
const EXEMPT: Record<string, string> = {
  // Spec §2 on #1142: the popup's trigger GATES on the overlay count, so its
  // own registration would oscillate the offer (armed → counted → disarmed →
  // uncounted → armed again).
  "src/components/app/update-popup.tsx": "gates on the count its own render would raise",
};

/** One registration call anywhere in the file satisfies the gate. */
const REGISTERS = /\buseOverlayRegistration\s*\(/;

/** The wrapper's registration opt-out, at a call site, in its literal form. */
const OPTS_OUT = /\bregisterOverlay=\{false\}/;

/**
 * ANY value passed to the wrapper's `registerOverlay` prop. The offender scan
 * uses this wider net so a computed `registerOverlay={flag}` cannot slip past
 * a gate that only knew the literal form — outside EXEMPT the prop may not be
 * passed at all, and inside EXEMPT the liveness check still demands the
 * literal `{false}` (a conditional opt-out is not a sanctioned shape).
 */
const PASSES_OPT_OUT_PROP = /\bregisterOverlay=\{/;

// Detection is shared with modal-web-unmount.test.ts (rawModalRenderers in
// source-scan.ts): both suites mean "this file renders a raw react-native
// Modal", and a shared definition keeps that lockstep structural.
const modalFiles = rawModalRenderers(ROOT);

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

  it("only exempt files use the wrapper's registerOverlay={false} opt-out", () => {
    // The wrapper registers for its call sites, so a call site passing the
    // opt-out silently leaves the registry blind to that overlay — the exact
    // hole the raw-Modal check above closes for raw Modals. Same rule, same
    // allowlist: an overlay that must not count joins EXEMPT with the reason,
    // or it counts.
    const offenders = sourceFiles(ROOT, { dirs: ["src", "app"] })
      .filter((file) => !(file in EXEMPT))
      .filter((file) =>
        PASSES_OPT_OUT_PROP.test(stripComments(readFileSync(join(ROOT, file), "utf8"))),
      );

    expect(offenders).toEqual([]);
  });

  it("the exemptions still exist and still opt out of the registry", () => {
    // An allowlist must not outlive what it exempts: if one of these stops
    // rendering an unregistered overlay (or is deleted), drop it from EXEMPT.
    for (const file of Object.keys(EXEMPT)) {
      const code = stripComments(readFileSync(join(ROOT, file), "utf8"));
      const rawModalWithoutRegistration = modalFiles.includes(file) && !REGISTERS.test(code);
      const wrapperCallSiteOptingOut = OPTS_OUT.test(code);
      expect({
        file,
        exemptionLive: rawModalWithoutRegistration || wrapperCallSiteOptingOut,
      }).toEqual({ file, exemptionLive: true });
    }
  });
});
