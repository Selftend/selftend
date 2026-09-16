/**
 * #1134's one HARD rule finally has an instrument in the pipeline (#1210).
 *
 * ☠️ WHY THIS FILE EXISTS. "Zero leading silence on every clip" is #1210's first
 * acceptance check and #1134 calls it a hard rule — and `postprocess run`, the
 * command that produces the file the app ships, never measured it. `edgeSilence`
 * existed (#1347) but only behind `postprocess edges <file>`, a separate command
 * pointed at a file by hand. So the pass could finish with every clip reported
 * PASS and the rule unchecked on the only class that has ever broken it.
 *
 * ⚠️ It is in practice a VOICE-clip rule. #1138 measured the shipped set: the four
 * `guide_*` clips carry 36.2 / 34.1 / 15.0 / 3.2 ms of lead, and every bed, texture
 * and bell measures 0.0. #1210 restates it as one — and adds the case a limit has
 * to survive: "if voice masters are MP3, confirm ffmpeg strips the encoder delay
 * before calling this met".
 *
 * ☠️ The check runs on the FINISHED file, not the master. Encoding is where a
 * delay can be introduced, so measuring the input would answer a question nobody
 * asked. #1138 measured AAC round-tripping sample-exact at +8 samples (0.18 ms),
 * which is what the limit has to sit above.
 */
import fs from "fs";
import path from "path";

import { LEAD_SILENCE_LIMIT_MS, report } from "../scripts/audio/postprocess.mjs";
import { OUTPUT_SAMPLE_RATE, outputSpecFor } from "../scripts/audio/catalog.mjs";

const VOICE = outputSpecFor("guide_inhale");
const BELL = outputSpecFor("meditation-bell");
// The class the master-lead gate exists for: only beds run through the limiter
// that prepended the hole, and its target loudness differs from the voice's.
const BED = outputSpecFor("rain");

/**
 * The measurements a clean pass produces, with the edges under test.
 *
 * `post.lufs` comes from the spec so the fixture is on target for whichever class
 * it is describing — the voice sits at -16 and a bell at -20 (#1139), and a fixed
 * number would fail one of them for a reason this file is not about.
 */
const result = (
  spec: { lufs: number } & Record<string, unknown>,
  edges: { leadMs: number; tailMs: number },
  // The pre-encode master's own edges (#2508). Defaults to a clean head, so a
  // test about the FINISHED file's lead says nothing accidental about the
  // master's - the two are separately gated and separately interesting.
  masterEdges: { leadMs: number; tailMs: number } = { leadMs: 0, tailMs: 0 },
) => ({
  spec,
  pre: { lufs: spec.lufs - 2.2, dbtp: -1.1 },
  post: { lufs: spec.lufs, dbtp: -3.2 },
  size: 24_800,
  seam: null,
  foldNote: "no fold",
  gain: 2.2,
  ceilingBound: false,
  folded: false,
  edges: { silent: false, peakDbfs: -3.2, floorDbfs: -60, ...edges },
  masterEdges: { silent: false, peakDbfs: -3.2, floorDbfs: -60, ...masterEdges },
});

let lines: string[];
beforeEach(() => {
  lines = [];
  jest.spyOn(console, "log").mockImplementation((line?: unknown) => {
    lines.push(String(line));
  });
});
afterEach(() => jest.restoreAllMocks());

describe("the limit itself", () => {
  it("sits above the encoder delay #1138 measured, so a clean clip is not failed by AAC", () => {
    // +8 samples at 44.1 kHz = 0.18 ms. A limit at or below that fails every file
    // the pipeline produces, which is a broken gate rather than a strict one.
    expect(LEAD_SILENCE_LIMIT_MS).toBeGreaterThan(0.18);
  });

  it("sits below the smallest lead the shipped set actually carries", () => {
    // `guide_hold` is 3.2 ms — the least of the four, and the one a loose limit
    // would wave through.
    expect(LEAD_SILENCE_LIMIT_MS).toBeLessThan(3.2);
  });

  it("is not expressible in whole samples, so its boundary can never be reached", () => {
    // ☠️ FOUND BY MUTATION TESTING: flipping the gate's `>` to `>=` survived every
    // test, and the reason is arithmetic rather than a missing case. `edgeSilence`
    // returns `(firstAudibleFrame / sampleRate) * 1000`, so a measured lead can only
    // ever be a whole number of samples — at 44.1 kHz a 1.0 ms lead is 44.1 samples
    // and the two nearest reachable values are 0.9977 and 1.0204 ms. Nothing can
    // measure exactly the limit, so the two comparisons cannot disagree about any
    // real file, and writing a test for `leadMs === LEAD_SILENCE_LIMIT_MS` would be
    // asserting on an input the pipeline cannot produce.
    //
    // ⚠️ That is a property of these two numbers together, not a law. This test is
    // the alarm: change the limit or the output rate to a pair where the boundary IS
    // reachable and it fails, at which point `>` versus `>=` becomes a decision
    // somebody has to make deliberately rather than a difference nobody can observe.
    const samplesAtTheLimit = (LEAD_SILENCE_LIMIT_MS * OUTPUT_SAMPLE_RATE) / 1000;
    expect(Number.isInteger(samplesAtTheLimit)).toBe(false);
  });
});

describe("leading silence is gated", () => {
  it("passes a clip that begins immediately", () => {
    expect(report("guide_inhale", result(VOICE, { leadMs: 0, tailMs: 0 }))).toBe(true);
  });

  it("passes the 0.18 ms AAC round-trip rather than treating the codec as a defect", () => {
    expect(report("guide_inhale", result(VOICE, { leadMs: 0.18, tailMs: 0.18 }))).toBe(true);
  });

  it("fails the 3.2 ms the shipped guide_hold carries", () => {
    // ⚠️ Every trigger in the app is already up to 250 ms late (`TICK_MS` polling,
    // #1134), so leading silence in the file adds on top of a lateness the user
    // can already hear. That is why the rule is hard and not a preference.
    expect(report("guide_hold", result(VOICE, { leadMs: 3.2, tailMs: 0 }))).toBe(false);
    expect(lines.filter((line) => line.includes("FAIL:"))).toHaveLength(1);
    expect(lines.some((line) => line.includes("3.2"))).toBe(true);
  });

  it("fails the 25 ms an unstripped MP3 encoder delay would leave", () => {
    // #1210: "if voice masters are MP3, confirm ffmpeg strips the encoder delay
    // before calling this met". #1138 measured MP3 declaring start_time 0.025057.
    expect(report("guide_intro", result(VOICE, { leadMs: 25.06, tailMs: 0 }))).toBe(false);
  });
});

describe("trailing silence is measured but never gated", () => {
  it("passes a bell that decays into silence, which is what a bell is", () => {
    // ☠️ #1139 fixes the bell as a long smooth decay "fading continuously to
    // silence". Gating the tail the way the head is gated would fail the two clips
    // whose entire character is a tail, for having one.
    expect(report("meditation-bell", result(BELL, { leadMs: 0, tailMs: 640 }))).toBe(true);
  });

  it("still prints the tail, so a texture that quietly ends early is visible", () => {
    report("meditation-bell", result(BELL, { leadMs: 0, tailMs: 640 }));
    expect(lines.some((line) => line.includes("640"))).toBe(true);
  });
});

describe("the remedy is a hint, not a second failure", () => {
  // ☠️ #1359's lesson: guidance pushed into `failures` prints as "FAIL:" and a
  // clip with one problem reads as having two.
  it("counts exactly one problem and points at the class's own escape hatch", () => {
    expect(report("guide_inhale", result(VOICE, { leadMs: 12, tailMs: 0 }))).toBe(false);
    expect(lines.filter((line) => line.includes("FAIL:"))).toHaveLength(1);
    const hint = lines.find((line) => line.startsWith("   next:"));
    // Text to Speech is the one class that CAN be re-drawn — it takes a seed — so
    // the remedy costs nothing, unlike everything else on this map.
    expect(hint).toMatch(/seed|candidate/i);
  });

  it("offers no seed remedy to a sound effect, which cannot be re-drawn", () => {
    // ☠️ Sound Effects has no seed. Telling someone to re-render a bed with a
    // different one names a path that does not exist.
    report("meditation-bell", result(BELL, { leadMs: 12, tailMs: 0 }));
    const hint = lines.find((line) => line.startsWith("   next:"));
    expect(hint ?? "").not.toMatch(/seed/i);
  });
});

describe("a result with no edges", () => {
  it("does not silently pass the rule it could not check", () => {
    // A missing measurement is not a clean one. Reporting PASS here is exactly the
    // failure mode this file exists to remove.
    const { edges: _edges, ...withoutEdges } = result(VOICE, { leadMs: 0, tailMs: 0 });
    expect(report("guide_inhale", withoutEdges)).toBe(false);
  });
});

/**
 * ☠️ The half of the rule that was missing for three weeks (#2460, fixed in
 * #2508). Every case below is a FINISHED file that reads clean — because that is
 * exactly the shape of the defect: the encoder does not leave digital silence
 * silent, it fills the head with pre-echo at −10…−31 dBFS, an order of magnitude
 * above the −60 dBFS floor `edgeSilence` works to. The old gate saw "starts on
 * time" on nine beds that started 4.97 ms late.
 */
describe("leading silence is gated on the master too (#2508)", () => {
  it("passes a master whose first sample is the take's first sample", () => {
    expect(report("guide_inhale", result(VOICE, { leadMs: 0, tailMs: 0 }))).toBe(true);
    expect(lines.join("\n")).not.toContain("the master starts");
  });

  it("fails the 4.97 ms hole alimiter left, on a finished file that reads 0.00", () => {
    // The measured numbers from the shipped `rain`, before the fix: the two
    // checks disagree, and only the master's is telling the truth.
    const ok = report("rain", result(BED, { leadMs: 0, tailMs: 0 }, { leadMs: 4.97, tailMs: 0 }));

    expect(ok).toBe(false);
    const failures = lines.filter((line) => line.includes("FAIL:"));
    // Exactly one problem: the finished-file check must NOT also fire, or the
    // count double-reports a single defect.
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("the master starts 4.97 ms late");
    expect(failures[0]).toContain("which the finished file hides");
  });

  it("prints both leads, so the disagreement is visible rather than inferred", () => {
    report("rain", result(BED, { leadMs: 0, tailMs: 0 }, { leadMs: 4.97, tailMs: 0 }));

    const printed = lines.join("\n");
    expect(printed).toContain("edges     lead 0.00 ms");
    expect(printed).toContain("master    lead 4.97 ms");
  });

  it("does not silently pass the master rule it could not check", () => {
    // The same reasoning as the finished-file case below it: a rule that was not
    // measured is not a rule that passed.
    const { masterEdges: _masterEdges, ...withoutMaster } = result(VOICE, {
      leadMs: 0,
      tailMs: 0,
    });

    expect(report("guide_inhale", withoutMaster)).toBe(false);
    expect(lines.join("\n")).toContain("leading silence was not measured on the master");
  });

  it("holds the master to the same 1 ms limit, which the AAC round-trip no longer has to fit under", () => {
    // 0.18 ms is the encoder's round-trip (#1138) and it is why the finished-file
    // limit cannot be tighter. The master never passes through an encoder at all,
    // so the same limit is if anything generous there — sharing it keeps one
    // number to reason about rather than two.
    expect(report("rain", result(BED, { leadMs: 0, tailMs: 0 }, { leadMs: 0.18, tailMs: 0 }))).toBe(
      true,
    );
    expect(report("rain", result(BED, { leadMs: 0, tailMs: 0 }, { leadMs: 1.01, tailMs: 0 }))).toBe(
      false,
    );
  });
});

/**
 * ☠️ A STRUCTURAL PIN ON ONE TOKEN, because nothing else can hold it.
 *
 * The nine beds are committed binaries: deleting `latency=1` from the limiter
 * leaves every shipped file untouched and every other test in this repo green.
 * The damage would land on the NEXT bed anyone renders, months later, as the
 * same 4.97 ms hole #2460 spent a bisect finding — and the gate above would
 * catch it only if somebody happened to read the run's output.
 *
 * So this reads the source. It is deliberately the narrowest possible assertion:
 * the argument string the bed limiter is built from, and nothing about how.
 *
 * ⚠️ A source-grepping test is invisible to `jest --findRelatedTests`, so a
 * commit touching only `postprocess.mjs` will not run it locally in the
 * pre-commit hook. CI's full suite is what actually enforces this one.
 */
describe("the bed limiter's lookahead compensation (#2460)", () => {
  const SOURCE = fs.readFileSync(
    path.resolve(__dirname, "..", "scripts", "audio", "postprocess.mjs"),
    "utf8",
  );

  it("passes latency=1, so the limiter delay-compensates instead of prepending zeros", () => {
    // At ffmpeg's default latency=0, alimiter prepends 219 frames (4.97 ms) of
    // digital silence as its lookahead and drops the source's last 219 frames.
    // The AAC encoder then fills that silence with pre-echo, which reads as a
    // fade-in at every loop point and is not a fade at all.
    expect(SOURCE).toContain("alimiter=limit=${BED_LIMITER_PEAK}:level=disabled:latency=1");
  });

  it("builds exactly one alimiter, so the pin above cannot be satisfied by a second one", () => {
    expect(SOURCE.match(/alimiter=/g)).toHaveLength(1);
  });
});
