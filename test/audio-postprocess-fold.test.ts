/**
 * When the fold runs, now that it is no longer the bed path (#1359).
 *
 * ☠️ WHY THIS FILE EXISTS. `postprocess` folded any clip whose spec carried a
 * `foldSeconds`, which was every bed and only beds — always or never, decided by
 * the catalog. #1347 ruled that beds render `loop: true` and need no fold, and in
 * the same breath refused to clear the TONAL case: three `night` draws all landed
 * under the usable gate, and the two carrying signal failed on head/tail energy.
 * So the fold cannot be deleted and cannot stay automatic. It becomes the
 * seam-gate fallback, and `foldPlan` is the seam where that is decided.
 *
 * ☠️ The fold TRIMS — 30.0s in, 29.6s out — so which branch runs changes the
 * length of an unrepeatable master and the bundle arithmetic #1138 sized. That is
 * why this is a pure function with its own tests rather than an `if` buried in a
 * 100-line ffmpeg chain.
 */
import { foldPlan } from "../scripts/audio/postprocess.mjs";
import { outputSpecFor } from "../scripts/audio/catalog.mjs";

const BED = outputSpecFor("brown-noise");
const BELL = outputSpecFor("meditation-bell");
const TEXTURE = outputSpecFor("soft-breath_inhale");

describe("a natively looping bed is not folded", () => {
  it("skips the fold by default, and says why", () => {
    const plan = foldPlan(BED);
    expect(plan.foldSeconds).toBeNull();
    expect(plan.note).toMatch(/loop: true/);
  });

  it("folds when the seam gate sends it back, with the length the catalog holds", () => {
    const plan = foldPlan(BED, { fold: true });
    expect(plan.foldSeconds).toBeCloseTo(0.4, 6);
    expect(plan.note).toMatch(/fallback/);
  });
});

describe("a bed that did NOT render looping still folds by default", () => {
  // The path is not dead code: it is what the pipeline does if `CLASS_LOOP.beds`
  // is ever put back to false, and the two states have to stay coherent — a
  // non-looping bed with no fold is the raw 30s render #1347 measured at 14.34x
  // the wrap-step limit.
  const nonLooping = { ...BED, loop: false };

  it("folds without being asked", () => {
    expect(foldPlan(nonLooping).foldSeconds).toBeCloseTo(0.4, 6);
  });

  it("does not call that fold a fallback — it is the path", () => {
    expect(foldPlan(nonLooping).note).not.toMatch(/fallback/);
  });

  it("folds once, not twice, when it is also asked to", () => {
    expect(foldPlan(nonLooping, { fold: true }).foldSeconds).toBeCloseTo(0.4, 6);
  });
});

describe("nothing but a bed is ever folded", () => {
  it("leaves a bell alone", () => {
    expect(foldPlan(BELL).foldSeconds).toBeNull();
    expect(foldPlan(BELL).note).toMatch(/not a bed/);
  });

  it("leaves a texture alone", () => {
    expect(foldPlan(TEXTURE).foldSeconds).toBeNull();
  });

  it("refuses to fold a bell that was asked for one, rather than ignoring the ask", () => {
    // ☠️ Silently ignoring `--fold` on a bell would report a fold that never ran.
    // The fold trims 0.4s off the end, which on a 2s temple block is a fifth of
    // its decay — an operator who typed it deserves an error, not a no-op.
    expect(() => foldPlan(BELL, { fold: true })).toThrow(/bells/);
    expect(() => foldPlan(TEXTURE, { fold: true })).toThrow(/textures/);
  });
});
