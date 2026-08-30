/**
 * The spending half of the `loop: true` probe (#1347), driven against a stubbed API.
 *
 * ☠️ THIS IS THE PART THAT CALLS THE API. `audio-loop-probe.test.ts` pins the
 * arithmetic that reads a returned buffer; this file proves the probe actually
 * asks the question it claims to — that the loop call and its control differ in
 * exactly one flag and nothing else, that the request duration reaches the wire
 * unchanged, that a dry run spends nothing, and that an existing master is never
 * overwritten. #1347 exists because a recorded probe result went unread for a
 * week; a probe that asked the wrong question would be worse than none.
 *
 * The API and ffmpeg are both stubbed, so this costs nothing and needs no binary
 * on PATH. What is real: the catalog, the composed prompt, the filenames, the
 * control flow and the JSON that gets written.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { CREDITS_PER_SECOND } from "../scripts/audio/catalog.mjs";

const decodeCalls: { out: string; options: Record<string, unknown> }[] = [];

jest.mock("../scripts/audio/postprocess.mjs", () => {
  const actual = jest.requireActual("../scripts/audio/postprocess.mjs");
  return {
    ...actual,
    assertFfmpeg: () => Promise.resolve(),
    measure: () => Promise.resolve({ lufs: -20.2, dbtp: -3.4, lra: 1.1, thresh: -30 }),
    // One second of quiet noise, enough for the pure measurements to run on.
    decodeToFloatWav: (
      _input: string,
      out: string,
      options: { channels: number; inputPcm?: { channels: number } },
    ) => {
      decodeCalls.push({ out, options });
      const frames = 4800;
      const samples = new Float32Array(frames * options.channels);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.sin(i / 3) * 0.4;
      return Promise.resolve({ samples, channels: options.channels, sampleRate: 48000, out });
    },
  };
});

const RATE = 48000;
const PROBE_SECONDS = 2;
const STEREO_BYTES_PER_SECOND = RATE * 2 * 2;

type Results = {
  clip: string;
  prompt: string;
  requestedSeconds: number;
  creditsSpent: number | null;
  creditsCharged: number | null;
  creditSource: string;
  creditVerdict: string;
  channelReading: { reading: string; ratio: number | null };
  takes: { loop: boolean; bytes: number; shape: { secondsIfStereo: number } }[];
};

let outDir: string;
let loopProbe: (options: {
  clipId: string;
  seconds: number;
  go: boolean;
  withControl: boolean;
}) => Promise<void>;
let fetchMock: jest.Mock;
let sentBodies: Record<string, unknown>[];
let sentUrls: string[];
let used: number;
/** What the stubbed generation responds with; null means "no character-cost". */
let responseHeaders: Map<string, string> | null;

function results(clipId: string, seconds: number): Results {
  return JSON.parse(
    readFileSync(join(outDir, "loop-probe", `${clipId}-${seconds}s-results.json`), "utf8"),
  );
}

beforeAll(() => {
  outDir = mkdtempSync(join(tmpdir(), "selftend-loopprobe-"));
  process.env.AUDIO_MASTERS_DIR = outDir;
  process.env.ELEVENLABS_API_KEY = "test-key-not-a-real-one";
  // ☠️ `require`, not `await import()`: OUT_DIR is read once at module scope, so
  // the env has to be set before the module loads, and babel hoists static imports
  // above this block. The same constraint audio-render-reroll.test.ts carries.
  ({ loopProbe } = require("../scripts/audio/render.mjs"));
});

beforeEach(() => {
  // ☠️ The probe refuses to overwrite a master — correctly, since a seedless render
  // cannot be re-made — so a scratch directory left standing between tests would
  // trip that refusal and take jest's own process down with `process.exit(1)`. The
  // refusal is proved deliberately below, on a directory a test populates itself.
  rmSync(join(outDir, "loop-probe"), { recursive: true, force: true });
  decodeCalls.length = 0;
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
  sentBodies = [];
  sentUrls = [];
  used = 1000;
  responseHeaders = null;

  fetchMock = jest.fn(async (url: string, init?: { body?: string }) => {
    sentUrls.push(url);
    if (url.includes("/user/subscription")) {
      return {
        ok: true,
        json: async () => ({ tier: "creator", character_count: used, character_limit: 100000 }),
      };
    }
    const body = JSON.parse(init?.body ?? "{}");
    sentBodies.push(body);
    // The recorded 1s probe came back at 1.5x, so the stub returns 1.5x for the
    // loop call and exactly what was asked for the control — the shape the probe
    // has to be able to describe.
    const seconds = body.duration_seconds * (body.loop ? 1.5 : 1);
    // ☠️ The rate is IMPORTED, never written out here. This stub is a model of the
    // API's billing, and a hard-coded 3.3 in it is what let the real constant sit
    // 3.3x under the truth for a week with a green suite (#1359).
    used += Math.round(seconds * CREDITS_PER_SECOND);
    return {
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(seconds * STEREO_BYTES_PER_SECOND),
      // A bare object, not a Headers: the default stub carries no `character-cost`,
      // so the probe has to fall back to the balance. The tests that need the
      // header replace this with an iterable Map.
      headers: responseHeaders ?? { get: () => "audio/pcm" },
    };
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  jest.restoreAllMocks();
  // The same guard the render suite carries: `loopProbe` reaches for process.exit
  // on a refusal, and a leaked exit code fails the whole suite with no message.
  process.exitCode = undefined;
});

describe("the loop probe asks exactly one question", () => {
  /**
   * ☠️ THIS SUITE USED TO PROBE `brown-noise` — the very clip #1347's ruling was
   * measured on. It became synthesised on #1130, which took it out of `SFX_CLIPS`
   * and made every case here exit 1 with "unknown clip: brown-noise": false, and
   * the least useful thing the tool could say. The subject moved to `ocean`, a bed
   * that is still generated, and the two cases below pin the refusal that replaced
   * it so the next clip to leave the render list fails loudly instead.
   */
  it("refuses a computed bed with a reason, not with 'unknown clip'", async () => {
    const exit = jest.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("exit");
    }) as never);
    const error = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      loopProbe({ clipId: "brown-noise", seconds: PROBE_SECONDS, go: true, withControl: true }),
    ).rejects.toThrow("exit");

    const said = error.mock.calls.flat().join("\n");
    expect(said).toContain("synth-noise.mjs");
    expect(said).toContain("periodic BY CONSTRUCTION");
    expect(said).not.toContain("unknown clip");
    expect(fetchMock).not.toHaveBeenCalled();
    exit.mockRestore();
    error.mockRestore();
  });

  it("still names a genuinely unknown clip as unknown", async () => {
    const exit = jest.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("exit");
    }) as never);
    const error = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      loopProbe({ clipId: "not-a-clip", seconds: PROBE_SECONDS, go: true, withControl: true }),
    ).rejects.toThrow("exit");

    const said = error.mock.calls.flat().join("\n");
    expect(said).toContain("unknown clip");
    // ...and it lists the SHIP set, so a computed bed appears as a real option.
    expect(said).toContain("brown-noise");
    exit.mockRestore();
    error.mockRestore();
  });

  it("spends nothing on a dry run", async () => {
    await loopProbe({
      clipId: "ocean",
      seconds: PROBE_SECONDS,
      go: false,
      withControl: true,
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(existsSync(join(outDir, "loop-probe"))).toBe(false);
  });

  it("sends the loop call and its control differing in one flag only", async () => {
    await loopProbe({ clipId: "ocean", seconds: PROBE_SECONDS, go: true, withControl: true });

    expect(sentBodies).toHaveLength(2);
    const [loop, control] = sentBodies;

    expect(loop.loop).toBe(true);
    expect(control.loop).toBe(false);
    // ⚠️ EVERYTHING ELSE MUST MATCH. Sound Effects is seedless, so the control is
    // the only baseline there is; a control that differs in duration, influence or
    // wording measures the difference between two prompts, not two modes.
    expect(control.text).toBe(loop.text);
    expect(control.duration_seconds).toBe(loop.duration_seconds);
    expect(control.prompt_influence).toBe(loop.prompt_influence);
    expect(loop.duration_seconds).toBe(PROBE_SECONDS);
    expect(sentUrls.filter((url) => url.includes("sound-generation"))).toHaveLength(2);
    expect(sentUrls.every((url) => !url.includes("mp3"))).toBe(true);
    expect(sentUrls.filter((url) => url.includes("output_format=pcm_48000"))).toHaveLength(2);
  });

  it("falls back to the balance when the response carries no cost header", async () => {
    await loopProbe({ clipId: "ocean", seconds: PROBE_SECONDS, go: true, withControl: true });

    expect(sentUrls.filter((url) => url.includes("/user/subscription"))).toHaveLength(2);
    const recorded = results("ocean", PROBE_SECONDS);
    // 2s requested + 3s returned for the loop call, 2s each way for the control.
    const billed = Math.round(3 * CREDITS_PER_SECOND) + Math.round(2 * CREDITS_PER_SECOND);
    expect(recorded.creditsSpent).toBe(billed);
    expect(recorded.creditVerdict).toContain("RETURNED");
    // No header came back, so nothing exact was recorded and the source says which
    // of the two instruments actually spoke.
    expect(recorded.creditsCharged).toBeNull();
    expect(recorded.creditSource).toMatch(/balance/);
  });

  /**
   * ☠️ THE BALANCE LAGS AND THE HEADER DOES NOT. Across a real 22-credit call
   * `/user/subscription` did not move at all, then reconciled later — so a delta
   * read straight after a call can report ZERO for a call that spent real,
   * unrepeatable credits. This stubs exactly that: a balance that does not move,
   * and a `character-cost` that says what was charged.
   */
  it("prefers the character-cost header to a balance that has not caught up", async () => {
    responseHeaders = new Map([
      ["content-type", "audio/pcm"],
      // 2s requested each way, at the API's own rate — the answer #1347 measured.
      ["character-cost", String(PROBE_SECONDS * CREDITS_PER_SECOND)],
    ]);
    // The lagging balance: frozen across both calls.
    fetchMock.mockImplementation(async (url: string, init?: { body?: string }) => {
      sentUrls.push(url);
      if (url.includes("/user/subscription")) {
        return {
          ok: true,
          json: async () => ({ tier: "creator", character_count: 1000, character_limit: 100000 }),
        };
      }
      const body = JSON.parse(init?.body ?? "{}");
      sentBodies.push(body);
      const seconds = body.duration_seconds * (body.loop ? 1.5 : 1);
      return {
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(seconds * STEREO_BYTES_PER_SECOND),
        headers: responseHeaders,
      };
    });

    await loopProbe({ clipId: "ocean", seconds: PROBE_SECONDS, go: true, withControl: true });

    const recorded = results("ocean", PROBE_SECONDS);
    // Both calls priced, summed: 2s x 2 at the API rate.
    expect(recorded.creditsCharged).toBe(2 * PROBE_SECONDS * CREDITS_PER_SECOND);
    expect(recorded.creditSource).toMatch(/character-cost/);
    // The frozen balance says nothing was spent, and is not what the verdict reads.
    expect(recorded.creditsSpent).toBe(0);
    expect(recorded.creditVerdict).toContain("REQUESTED");
  });

  /**
   * ☠️ A PARTIAL SUM LOOKS EXACTLY LIKE A TOTAL, and understating an unrepeatable
   * spend is the one direction that misleads. If only some calls come back priced,
   * adding up the ones that did produces a confident number that is too small — so
   * the header reading is withheld entirely and the run says which instrument it
   * fell back to, rather than quoting a fraction as if it were the whole.
   */
  it("withholds the header total when only some of the calls were priced", async () => {
    let call = 0;
    fetchMock.mockImplementation(async (url: string, init?: { body?: string }) => {
      sentUrls.push(url);
      if (url.includes("/user/subscription")) {
        return {
          ok: true,
          json: async () => ({ tier: "creator", character_count: used, character_limit: 100000 }),
        };
      }
      const body = JSON.parse(init?.body ?? "{}");
      sentBodies.push(body);
      const seconds = body.duration_seconds * (body.loop ? 1.5 : 1);
      used += Math.round(seconds * CREDITS_PER_SECOND);
      // Only the first generation carries a cost header; the second does not.
      const headers = new Map<string, string>([["content-type", "audio/pcm"]]);
      if (call === 0) headers.set("character-cost", String(PROBE_SECONDS * CREDITS_PER_SECOND));
      call += 1;
      return {
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(seconds * STEREO_BYTES_PER_SECOND),
        headers,
      };
    });

    await loopProbe({ clipId: "ocean", seconds: PROBE_SECONDS, go: true, withControl: true });

    const recorded = results("ocean", PROBE_SECONDS);
    // NOT `PROBE_SECONDS * CREDITS_PER_SECOND` — the one priced call's figure must
    // not be recorded as the pass's cost.
    expect(recorded.creditsCharged).toBeNull();
    expect(recorded.creditSource).toMatch(/balance/);
  });

  it("records both readings of what came back", async () => {
    await loopProbe({ clipId: "ocean", seconds: PROBE_SECONDS, go: true, withControl: true });

    const recorded = results("ocean", PROBE_SECONDS);
    expect(recorded.takes).toHaveLength(2);
    expect(recorded.takes[0].loop).toBe(true);
    expect(recorded.takes[0].shape.secondsIfStereo).toBe(PROBE_SECONDS * 1.5);
    expect(recorded.takes[1].shape.secondsIfStereo).toBe(PROBE_SECONDS);
    expect(recorded.prompt).toContain("open water");
    // The prompt is the only reproducible artifact of a seedless render, so it is
    // recorded verbatim beside the bytes it produced.
    expect(recorded.prompt).toBe(sentBodies[0].text);
  });

  /**
   * ☠️ THE MONO READING IS A RE-READ, NOT A DOWNMIX. The bytes are headerless, so
   * the mono candidate is a different signal cut from the same buffer — and a
   * downmix of the stereo reading would be neither. It has to be declared on the
   * INPUT side, and the crossing-rate comparison is worthless if it is not.
   */
  it("decodes each take both ways, declaring the mono reading on the input", async () => {
    await loopProbe({ clipId: "ocean", seconds: PROBE_SECONDS, go: true, withControl: true });

    const monoDecodes = decodeCalls.filter((call) => call.out.endsWith("-as-mono.wav"));
    const stereoDecodes = decodeCalls.filter((call) => call.out.endsWith("-as-stereo.wav"));

    expect(stereoDecodes).toHaveLength(2);
    expect(monoDecodes).toHaveLength(2);
    expect(stereoDecodes.every((call) => call.options.channels === 2)).toBe(true);
    expect(monoDecodes.every((call) => call.options.channels === 1)).toBe(true);
    expect(
      monoDecodes.every(
        (call) => (call.options.inputPcm as { channels: number } | undefined)?.channels === 1,
      ),
    ).toBe(true);
    // The stereo read is the shipping one and must take the format's own default.
    expect(stereoDecodes.every((call) => call.options.inputPcm === undefined)).toBe(true);
  });

  it("writes both takes under names that say which is which", async () => {
    await loopProbe({ clipId: "ocean", seconds: PROBE_SECONDS, go: true, withControl: true });

    const dir = join(outDir, "loop-probe");
    expect(existsSync(join(dir, `ocean-loop-${PROBE_SECONDS}s.pcm`))).toBe(true);
    expect(existsSync(join(dir, `ocean-control-${PROBE_SECONDS}s.pcm`))).toBe(true);
  });

  it("renders the loop call alone when the control is declined", async () => {
    await loopProbe({ clipId: "rain", seconds: PROBE_SECONDS, go: true, withControl: false });

    expect(sentBodies).toHaveLength(1);
    expect(sentBodies[0].loop).toBe(true);
    // ⚠️ Without a control there is nothing to compare a crossing rate against, so
    // the channel question has to come back unanswered rather than guessed.
    expect(results("rain", PROBE_SECONDS).channelReading.reading).toBe("unclear");
  });
});

describe("the probe refuses rather than destroys", () => {
  const exits = () => {
    jest.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`exit ${code}`);
    }) as never);
  };

  it("will not overwrite a master already on disk", async () => {
    await loopProbe({ clipId: "forest", seconds: PROBE_SECONDS, go: true, withControl: true });
    const before = fetchMock.mock.calls.length;
    exits();

    await expect(
      loopProbe({ clipId: "forest", seconds: PROBE_SECONDS, go: true, withControl: true }),
    ).rejects.toThrow("exit 1");
    // ☠️ And it refuses BEFORE spending. A seedless render that overwrites an
    // archived one destroys evidence that cannot be re-made, so the refusal is
    // worth nothing if the credits are already gone by the time it fires.
    expect(fetchMock.mock.calls).toHaveLength(before);
  });

  it("refuses a clip that never loops at runtime", async () => {
    exits();
    // A texture plays once start to finish (#1137), and a bell is a one-shot.
    await expect(
      loopProbe({ clipId: "meditation-bell", seconds: PROBE_SECONDS, go: true, withControl: true }),
    ).rejects.toThrow("exit 1");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses an unknown clip id", async () => {
    exits();
    await expect(
      loopProbe({ clipId: "not-a-clip", seconds: PROBE_SECONDS, go: true, withControl: true }),
    ).rejects.toThrow("exit 1");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a duration past the API's own ceiling", async () => {
    exits();
    await expect(
      loopProbe({ clipId: "night", seconds: 45, go: true, withControl: true }),
    ).rejects.toThrow("exit 1");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("an unreadable balance is reported, not assumed away", () => {
  it("says unknown when the key cannot read the subscription", async () => {
    // The recorded key lacks `user_read` and 401s on exactly this endpoint.
    fetchMock.mockImplementation(async (url: string, init?: { body?: string }) => {
      if (url.includes("/user/subscription")) {
        return { ok: false, status: 401, text: async () => "missing_permissions" };
      }
      const body = JSON.parse(init?.body ?? "{}");
      sentBodies.push(body);
      return {
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(body.duration_seconds * STEREO_BYTES_PER_SECOND),
        headers: { get: () => "audio/pcm" },
      };
    });

    await loopProbe({ clipId: "ocean", seconds: PROBE_SECONDS, go: true, withControl: true });

    const recorded = results("ocean", PROBE_SECONDS);
    expect(recorded.creditsSpent).toBeNull();
    expect(recorded.creditVerdict).toContain("unknown");
    // The render still happened and is still on disk — a balance the key cannot
    // read is a gap in the record, not a reason to throw the masters away.
    expect(existsSync(join(outDir, "loop-probe", `ocean-loop-${PROBE_SECONDS}s.pcm`))).toBe(true);
  });
});

describe("a partly-written probe directory", () => {
  it("refuses when only the control name is taken", async () => {
    const dir = join(outDir, "loop-probe");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `night-control-${PROBE_SECONDS}s.pcm`), "");
    jest.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`exit ${code}`);
    }) as never);

    await expect(
      loopProbe({ clipId: "night", seconds: PROBE_SECONDS, go: true, withControl: true }),
    ).rejects.toThrow("exit 1");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
