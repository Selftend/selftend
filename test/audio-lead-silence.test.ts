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
import { LEAD_SILENCE_LIMIT_MS, report } from "../scripts/audio/postprocess.mjs";
import { outputSpecFor } from "../scripts/audio/catalog.mjs";

const VOICE = outputSpecFor("guide_inhale");
const BELL = outputSpecFor("meditation-bell");

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
