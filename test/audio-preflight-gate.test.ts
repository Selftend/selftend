/**
 * `preflight` and `render` grade a take on the same bar (#2219).
 *
 * ☠️ WHY THIS FILE EXISTS. `classifyTake` widens a limited class's crest budget
 * by `LIMITER_HEADROOM_DB`, and it learns "limited" only from the caller.
 * `render` passed `limited: Boolean(spec.limit)`; `preflight` read `.lufs` off
 * the same spec and dropped `.limit` at that line, so every round-B bed was
 * graded 12 dB harsher before the spend than during it. A take in that band
 * printed BROKEN and `preflight` exited 1, telling the operator to rewrite a
 * prompt `render` would have accepted - against a seedless model, on credits.
 *
 * Both commands now build their grader through `takeGraderFor(spec)`, and this
 * suite pins that the grader reads BOTH fields off the spec. `preflight` itself
 * is not exported and calls the API, so the grader is what can be exercised
 * for free; the second suite checks by source that neither command has grown a
 * private `classifyTake` call again.
 */
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { outputSpecFor } from "../scripts/audio/catalog.mjs";
import { LIMITER_HEADROOM_DB, maxCrestDb } from "../scripts/audio/take-gate.mjs";

jest.mock("../scripts/audio/postprocess.mjs", () => ({
  measure: () => Promise.reject(new Error("not measured in this suite")),
  assertFfmpeg: () => Promise.resolve(),
}));

// `OUT_DIR` is read once at module scope from this env, and resolving it from
// `import.meta.url` is not available under babel's CJS transform - so the env
// is set before the module loads, as audio-render-reroll.test.ts does. Nothing
// here writes to it.
process.env.AUDIO_MASTERS_DIR = tmpdir();

// Loaded after the mock so render.mjs's postprocess import resolves to the stub.
const { takeGraderFor } = require("../scripts/audio/render.mjs") as {
  takeGraderFor: (spec: { lufs: number; limit?: boolean }) => (measured: {
    dbtp: number;
    lufs: number;
  }) => {
    accepted: boolean;
    rejectedFor: string | null;
  };
};

/** A take whose crest sits `crestDb` above its loudness, peaking at -6 dBTP. */
function takeWithCrest(crestDb: number) {
  const dbtp = -6;
  return { dbtp, lufs: dbtp - crestDb };
}

describe("takeGraderFor (#2219)", () => {
  it("grades a limited bed on the widened crest budget, exactly as render does", () => {
    const spec = outputSpecFor("rain");
    // The premise, asserted rather than assumed: rain is a limited bed at -28.
    expect(spec).toMatchObject({ lufs: -28, limit: true });

    const unlimitedBudget = maxCrestDb(spec.lufs);
    const limitedBudget = maxCrestDb(spec.lufs, { limited: true });
    expect(limitedBudget).toBe(unlimitedBudget + LIMITER_HEADROOM_DB);

    // A take strictly inside the band the two bars disagree on - one dB past the
    // unlimited budget, well inside the limited one - is the whole defect: it
    // was BROKEN under the dropped flag and accepted with it.
    const inBand = takeWithCrest(unlimitedBudget + 1);
    expect(takeGraderFor(spec)(inBand)).toEqual({ accepted: true, rejectedFor: null });

    // And the limiter's headroom is a bound, not a licence: past it, still refused.
    const pastBoth = takeWithCrest(limitedBudget + 1);
    expect(takeGraderFor(spec)(pastBoth)).toEqual({
      accepted: false,
      rejectedFor: "ceiling-bound",
    });
  });

  it("grades an unlimited class on the plain budget - the flag is read, not assumed", () => {
    const spec = outputSpecFor("interval-temple-block");
    expect(spec.limit).toBeFalsy();

    const budget = maxCrestDb(spec.lufs);
    expect(takeGraderFor(spec)(takeWithCrest(budget))).toEqual({
      accepted: true,
      rejectedFor: null,
    });
    expect(takeGraderFor(spec)(takeWithCrest(budget + 1))).toEqual({
      accepted: false,
      rejectedFor: "ceiling-bound",
    });
  });

  it("reads the target off the spec, so a spec-less grade cannot come back", () => {
    // `classifyTake` with no target grades on peaks alone - the gate that let
    // round B through. A grader built from a -16 voice spec must reject a take
    // whose crest exceeds voice's 13 dB, which a target-less grade would accept.
    const grader = takeGraderFor({ lufs: -16 });
    expect(grader(takeWithCrest(14))).toEqual({ accepted: false, rejectedFor: "ceiling-bound" });
  });
});

describe("render.mjs grades through the shared grader only", () => {
  const source = readFileSync(join(__dirname, "..", "scripts", "audio", "render.mjs"), "utf8");

  it("calls classifyTake in exactly one place - inside takeGraderFor", () => {
    // Every other call site is a second bar waiting to drift. The import line
    // and doc comments mention the name too, so only invocations are counted.
    const calls = [...source.matchAll(/\bclassifyTake\(/g)];
    expect(calls).toHaveLength(1);
    const grader = /export function takeGraderFor[\s\S]*?\n}\n/.exec(source)?.[0] ?? "";
    expect(grader).toContain("classifyTake(");
    expect(grader).toContain("limited");
  });

  it("builds both commands' graders from the spec", () => {
    const preflight = /async function preflight[\s\S]*?\n}\n/.exec(source)?.[0] ?? "";
    const render = /async function render\([\s\S]*?\n}\n/.exec(source)?.[0] ?? "";
    expect(preflight).toContain("takeGraderFor(outputSpecFor(clip.id))");
    expect(render).toContain("takeGraderFor(outputSpecFor(clip.id))");
  });
});
