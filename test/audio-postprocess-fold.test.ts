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
import { foldPlan, report } from "../scripts/audio/postprocess.mjs";
import { outputSpecFor } from "../scripts/audio/catalog.mjs";

const BED = outputSpecFor("brown-noise");
const BELL = outputSpecFor("meditation-bell");
// ⚠️ A voice cue, not a texture. The texture lane was retired on 2026-08-30, so
// its spec no longer exists — but `foldPlan`'s rule is per-CLASS, not per-clip,
// and voice is the other class that carries no fold length. The assertion below
// is unchanged in substance: a class with nothing to fold refuses `--fold` loudly
// instead of reporting a fold that never ran.
const VOICE = outputSpecFor("guide_intro");

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
    expect(foldPlan(VOICE).foldSeconds).toBeNull();
  });

  it("refuses to fold a bell that was asked for one, rather than ignoring the ask", () => {
    // ☠️ Silently ignoring `--fold` on a bell would report a fold that never ran.
    // The fold trims 0.4s off the end, which on a 2s temple block is a fifth of
    // its decay — an operator who typed it deserves an error, not a no-op.
    expect(() => foldPlan(BELL, { fold: true })).toThrow(/bells/);
    expect(() => foldPlan(VOICE, { fold: true })).toThrow(/voice/);
  });
});

/**
 * ☠️ ADVICE IS NOT A FAULT. The seam-gate failure now points at `--fold`, and the
 * first version of that pointed by pushing the sentence into `failures` — where it
 * printed as "FAIL:" and padded the count of things actually wrong with the file.
 * A bed with one seam problem was reported as having two. The hint is real and
 * worth printing; it just must never be counted.
 */
describe("the fold hint is printed but never counted as a failure", () => {
  const seamFail = (folded: boolean) => ({
    spec: BED,
    // ⚠️ Numbers sit ON the bed target, which moved from -20 to -28 on 2026-08-30.
    // The point of this fixture is a clip whose ONLY fault is the seam, so a
    // loudness miss here would add a second FAIL and quietly defeat the test.
    pre: { lufs: -29.5, dbtp: -8.6 },
    post: { lufs: -28.05, dbtp: -7.1 },
    size: 486_800,
    // Over the head/tail limit, which is how a natively looping bed actually failed.
    seam: { wrapStepRatio: 0.94, energyDeltaRatio: 2.05, headTailDb: 1.02, naturalDb: 0.5 },
    foldNote: folded ? "0.4s fold (seam-gate fallback)" : "rendered loop: true, no fold (#1347)",
    gain: 1.55,
    ceilingBound: false,
    folded,
    // A natively looping bed returns zero lead and zero tail — measured on the live
    // API over six generations (#1347). Present because `report` now refuses to
    // call a file PASS on a rule it was given no measurement for.
    edges: { silent: false, leadMs: 0, tailMs: 0, peakDbfs: -7.1, floorDbfs: -60 },
    durationSeconds: folded ? 29.6 : 30.0,
  });

  let lines: string[];
  beforeEach(() => {
    lines = [];
    jest.spyOn(console, "log").mockImplementation((line?: unknown) => {
      lines.push(String(line));
    });
  });
  afterEach(() => jest.restoreAllMocks());

  it("counts exactly the one real problem, not the advice as well", () => {
    expect(report("brown-noise", seamFail(false))).toBe(false);
    expect(lines.filter((line) => line.includes("FAIL:"))).toHaveLength(1);
  });

  it("still prints the fallback, under its own label", () => {
    report("brown-noise", seamFail(false));
    const hint = lines.find((line) => line.includes("--fold"));
    expect(hint).toBeDefined();
    expect(hint).not.toContain("FAIL:");
  });

  it("does not offer the fold to a bed that was already folded", () => {
    report("brown-noise", seamFail(true));
    expect(lines.some((line) => line.includes("--fold"))).toBe(false);
  });
});
