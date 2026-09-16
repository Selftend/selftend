/**
 * The looping lanes fade, a swap crossfades, and the cue lane does neither
 * (#1743, #2484, #2441 — `docs/sound.md` §3-§5).
 *
 * ☠️ Everything here runs on FAKE timers: the ramp is a `setInterval`, so a test that
 * forgets to advance the clock sees a player frozen at its starting volume and can
 * pass or fail for the wrong reason. Volume is SAMPLED off the fake player between
 * advances, so the assertions are on the shape of the ramp, not on step counts.
 *
 * ☠️ A `play()` NOT followed by `await flush()` is deliberate in the crossfade cases:
 * it is how "the open has not resolved yet" is expressed. `jest.advanceTimersByTime`
 * is synchronous and runs no microtasks, so the clock can move while the open is
 * genuinely still pending — which is exactly the window §4.1 is about.
 */
import { LOOP_FADE_MS, createLanePlayer } from "@/src/lib/lane-player";
import {
  fakePlayers as players,
  flushAudioSetup as flush,
  livePlayers as live,
  mockCreateAudioPlayer,
  resetFakeAudio,
} from "@/test/expo-audio-mock";
import { setPlatformOS } from "@/test/modal-marker-mock";
import {
  DEFAULT_BED_SECONDS,
  type FakeWebAudio,
  installFakeWebAudio,
  uninstallFakeWebAudio,
} from "@/test/web-audio-mock";

jest.mock("expo-audio", () =>
  jest
    .requireActual<typeof import("@/test/expo-audio-mock")>("@/test/expo-audio-mock")
    .expoAudioModuleMock(),
);

/** Advance the clock in `parts` slices, sampling the player's volume after each. */
function sampleRamp(read: () => number, parts = 4): number[] {
  const samples: number[] = [];
  for (let i = 0; i < parts; i++) {
    jest.advanceTimersByTime(LOOP_FADE_MS / parts);
    samples.push(read());
  }
  return samples;
}

beforeEach(() => {
  jest.useFakeTimers();
  resetFakeAudio();
});
afterEach(() => {
  jest.useRealTimers();
});

describe("a looping bed on native", () => {
  it("starts at 0 and rises to the requested volume across the ramp", async () => {
    const lane = createLanePlayer();
    void lane.play(1, 0.6, true);
    await flush();
    const player = players[0];
    expect(player.play).toHaveBeenCalledTimes(1);
    expect(player.loop).toBe(true);
    expect(player.volume).toBe(0);
    const samples = sampleRamp(() => player.volume);
    // Monotonic, and it lands exactly on the target rather than one step short.
    for (let i = 1; i < samples.length; i++) expect(samples[i]).toBeGreaterThan(samples[i - 1]);
    expect(samples[samples.length - 1]).toBeCloseTo(0.6, 6);
    // And stays there.
    jest.advanceTimersByTime(LOOP_FADE_MS);
    expect(player.volume).toBeCloseTo(0.6, 6);
  });

  it("fades to 0 on stop() and only then removes the player", async () => {
    const lane = createLanePlayer();
    void lane.play(1, 0.6, true);
    await flush();
    jest.advanceTimersByTime(LOOP_FADE_MS);
    const player = players[0];
    void lane.stop();
    // ☠️ Not removed at once - that is the cut this ticket removes.
    expect(player.remove).not.toHaveBeenCalled();
    const samples = sampleRamp(() => player.volume);
    for (let i = 1; i < samples.length; i++) expect(samples[i]).toBeLessThan(samples[i - 1]);
    expect(samples[samples.length - 1]).toBe(0);
    expect(player.remove).toHaveBeenCalledTimes(1);
  });

  it("ignores a second stop() during the fade-out: same ramp, same release time, one remove", async () => {
    const lane = createLanePlayer();
    void lane.play(1, 0.6, true);
    await flush();
    jest.advanceTimersByTime(LOOP_FADE_MS);
    void lane.stop();
    jest.advanceTimersByTime(LOOP_FADE_MS / 2);
    const midway = players[0].volume;
    void lane.stop();
    // ⚠️ Not restarted: a restart would begin a fresh LOOP_FADE_MS from here and
    // push the release out to 1.5 ramps. The original ramp finishes on schedule.
    expect(players[0].volume).toBe(midway);
    jest.advanceTimersByTime(LOOP_FADE_MS / 2);
    expect(players[0].volume).toBe(0);
    expect(players[0].remove).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(LOOP_FADE_MS);
    expect(players[0].remove).toHaveBeenCalledTimes(1);
  });

  /**
   * ⚠️ REWRITTEN AND RENAMED for §4.5, and flagged so no reviewer reads it as an
   * assertion weakened to match broken behaviour (`AGENTS.md`, Correctness & tests).
   * It was "leaves exactly one live player when play() lands during a fade-out", and
   * it asserted that the departing player is removed IMMEDIATELY when the new play()
   * lands. That is the cut the crossfade ruling removes: the departing bed now keeps
   * its own ramp and is released at the end of its own fall. What has NOT moved is
   * the half of the invariant the old name was really guarding - release exactly
   * once, one live player once both ramps have run - and that is asserted below.
   */
  it("lets a bed already fading out finish its own fall while the new bed rises", async () => {
    const lane = createLanePlayer();
    void lane.play(1, 0.6, true);
    await flush();
    jest.advanceTimersByTime(LOOP_FADE_MS);
    void lane.stop();
    jest.advanceTimersByTime(LOOP_FADE_MS / 2);
    const departing = players[0];
    const midFall = departing.volume;
    expect(midFall).toBeGreaterThan(0);

    void lane.play(2, 0.4, true);
    await flush();
    expect(players).toHaveLength(2);
    // Not cut: still live, still where its own ramp had reached.
    expect(departing.remove).not.toHaveBeenCalled();
    expect(departing.volume).toBe(midFall);
    expect(players[1].volume).toBe(0);

    // The departing bed reaches 0 on ITS original schedule - half a ramp from here,
    // not a fresh one - and releases itself there.
    jest.advanceTimersByTime(LOOP_FADE_MS / 2);
    expect(departing.volume).toBe(0);
    expect(departing.remove).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(LOOP_FADE_MS * 2);
    expect(departing.remove).toHaveBeenCalledTimes(1);
    expect(live()).toEqual([players[1]]);
    expect(players[1].volume).toBeCloseTo(0.4, 6);
  });

  it("lets setVolume() retarget a fade-in, so the slider wins over the play() value", async () => {
    const lane = createLanePlayer();
    void lane.play(1, 0.6, true);
    await flush();
    jest.advanceTimersByTime(LOOP_FADE_MS / 4);
    void lane.setVolume(0.2);
    jest.advanceTimersByTime(LOOP_FADE_MS);
    expect(players[0].volume).toBeCloseTo(0.2, 6);
  });

  it("applies setVolume() at once when nothing is ramping", async () => {
    const lane = createLanePlayer();
    void lane.play(1, 0.6, true);
    await flush();
    jest.advanceTimersByTime(LOOP_FADE_MS);
    void lane.setVolume(0.9);
    expect(players[0].volume).toBe(0.9);
  });

  it("does not let setVolume() during a fade-out pull the bed back up", async () => {
    const lane = createLanePlayer();
    void lane.play(1, 0.6, true);
    await flush();
    jest.advanceTimersByTime(LOOP_FADE_MS);
    void lane.stop();
    jest.advanceTimersByTime(LOOP_FADE_MS / 2);
    void lane.setVolume(0.9);
    jest.advanceTimersByTime(LOOP_FADE_MS);
    expect(players[0].volume).toBe(0);
    expect(players[0].remove).toHaveBeenCalledTimes(1);
  });

  it("fades out a bed that stop() catches mid fade-in, from where it is", async () => {
    const lane = createLanePlayer();
    void lane.play(1, 0.8, true);
    await flush();
    jest.advanceTimersByTime(LOOP_FADE_MS / 2);
    const player = players[0];
    const midway = player.volume;
    expect(midway).toBeGreaterThan(0);
    void lane.stop();
    // From WHERE IT IS: no jump to 0, no jump up to the play() target first.
    expect(player.volume).toBe(midway);
    jest.advanceTimersByTime(LOOP_FADE_MS / 4);
    expect(player.volume).toBeLessThan(midway);
    expect(player.volume).toBeGreaterThan(0);
    jest.advanceTimersByTime(LOOP_FADE_MS);
    expect(player.volume).toBe(0);
    expect(player.remove).toHaveBeenCalledTimes(1);
  });

  it("fades in to a setVolume() that landed while play() was still awaiting the audio mode", async () => {
    // The hook's volume effect and its play effect run in the same commit, so on
    // native the slider's value can arrive BEFORE the player exists. It must not be
    // lost to the value play() was called with.
    const lane = createLanePlayer();
    void lane.play(1, 0.6, true);
    void lane.setVolume(0.3);
    await flush();
    expect(players[0].volume).toBe(0);
    jest.advanceTimersByTime(LOOP_FADE_MS);
    expect(players[0].volume).toBeCloseTo(0.3, 6);
  });

  it("releases a player whose play() was still awaiting the audio mode when stop() came", async () => {
    const lane = createLanePlayer();
    void lane.play(1, 0.6, true);
    // No flush: the audio-mode await has not settled. This is the pre-existing
    // playGen guard, kept working with the fade in place.
    void lane.stop();
    await flush();
    jest.advanceTimersByTime(LOOP_FADE_MS * 2);
    expect(live()).toHaveLength(0);
  });
});

describe("a bed swap on native", () => {
  /** A bed at its full volume, playing, nothing else live. */
  async function playingAt(lane: ReturnType<typeof createLanePlayer>, volume: number) {
    void lane.play(1, volume, true);
    await flush();
    jest.advanceTimersByTime(LOOP_FADE_MS);
  }

  it("holds the outgoing bed at level while the incoming one is still opening", async () => {
    const lane = createLanePlayer();
    await playingAt(lane, 0.6);
    const outgoing = players[0];

    // No flush: play()'s open has NOT resolved. Under the old cut the outgoing bed
    // was already released here, which is exactly the hole this rule closes.
    void lane.play(2, 0.4, true);
    jest.advanceTimersByTime(LOOP_FADE_MS * 2);
    expect(outgoing.remove).not.toHaveBeenCalled();
    expect(outgoing.volume).toBeCloseTo(0.6, 6);
    expect(players).toHaveLength(1);

    // Only once the incoming bed can start do the two ramps run together.
    await flush();
    expect(players).toHaveLength(2);
    expect(outgoing.volume).toBeCloseTo(0.6, 6);
    expect(players[1].volume).toBe(0);
    const falling = sampleRamp(() => outgoing.volume);
    for (let i = 1; i < falling.length; i++) expect(falling[i]).toBeLessThan(falling[i - 1]);
    expect(falling[falling.length - 1]).toBe(0);
    expect(outgoing.remove).toHaveBeenCalledTimes(1);
    expect(live()).toEqual([players[1]]);
    expect(players[1].volume).toBeCloseTo(0.4, 6);
  });

  it("demotes the riser and cuts the older fader when a third bed arrives", async () => {
    const lane = createLanePlayer();
    await playingAt(lane, 0.6);
    void lane.play(2, 0.5, true);
    await flush();
    jest.advanceTimersByTime(LOOP_FADE_MS / 2);
    expect(live()).toHaveLength(2);

    void lane.play(3, 0.4, true);
    await flush();
    // Ceiling of two, never three: the first bed - still on its way down - is cut.
    expect(players).toHaveLength(3);
    expect(live()).toEqual([players[1], players[2]]);
    expect(players[0].remove).toHaveBeenCalledTimes(1);
    expect(players[2].volume).toBe(0);

    jest.advanceTimersByTime(LOOP_FADE_MS * 2);
    expect(live()).toEqual([players[2]]);
    expect(players[2].volume).toBeCloseTo(0.4, 6);
    // One release each: nothing orphaned, nothing released twice.
    for (const player of players.slice(0, 2)) expect(player.remove).toHaveBeenCalledTimes(1);
  });

  it("fades both halves of a crossfade to 0 on stop() and releases both", async () => {
    const lane = createLanePlayer();
    await playingAt(lane, 0.6);
    void lane.play(2, 0.5, true);
    await flush();
    jest.advanceTimersByTime(LOOP_FADE_MS / 2);
    const [fader, riser] = players;
    expect(fader.volume).toBeGreaterThan(0);
    expect(riser.volume).toBeGreaterThan(0);

    void lane.stop();
    // Each falls from where IT is - no jump on either.
    expect(fader.volume).toBeGreaterThan(0);
    expect(riser.volume).toBeGreaterThan(0);

    // Zero live within one ramp of the stop: the fader was already half way down,
    // the riser starts its own fall here.
    jest.advanceTimersByTime(LOOP_FADE_MS);
    expect(fader.volume).toBe(0);
    expect(riser.volume).toBe(0);
    expect(live()).toHaveLength(0);
    expect(fader.remove).toHaveBeenCalledTimes(1);
    expect(riser.remove).toHaveBeenCalledTimes(1);
  });

  it("aims setVolume() at the riser only, leaving the fader's fall alone", async () => {
    const lane = createLanePlayer();
    await playingAt(lane, 0.6);
    void lane.play(2, 0.5, true);
    await flush();
    jest.advanceTimersByTime(LOOP_FADE_MS / 4);
    const [fader, riser] = players;

    const quarter = fader.volume;
    void lane.setVolume(0.2);

    // The fader keeps falling on its own schedule and lands on 0 exactly one ramp
    // after the swap started - not later, and not sooner.
    jest.advanceTimersByTime(LOOP_FADE_MS / 4);
    const half = fader.volume;
    expect(half).toBeLessThan(quarter);
    expect(half).toBeGreaterThan(0);
    jest.advanceTimersByTime(LOOP_FADE_MS / 4);
    expect(fader.volume).toBeLessThan(half);
    expect(fader.volume).toBeGreaterThan(0);
    jest.advanceTimersByTime(LOOP_FADE_MS / 4);
    expect(fader.volume).toBe(0);
    expect(fader.remove).toHaveBeenCalledTimes(1);

    // The riser went to the slider's value, not to the one play() was called with.
    expect(riser.volume).toBeCloseTo(0.2, 6);
    expect(live()).toEqual([riser]);
  });

  it("leaves the previous bed playing when the incoming one fails to open", async () => {
    const lane = createLanePlayer();
    await playingAt(lane, 0.6);
    const playing = players[0];

    mockCreateAudioPlayer.mockImplementationOnce(() => {
      throw new Error("no player");
    });
    void lane.play(2, 0.4, true);
    await flush();
    jest.advanceTimersByTime(LOOP_FADE_MS * 2);

    // §4.3: silence was the old outcome and this is the better one. It is deliberate,
    // and deliberately unsignalled - the chip and what is heard can disagree.
    expect(playing.remove).not.toHaveBeenCalled();
    expect(playing.volume).toBeCloseTo(0.6, 6);
    expect(live()).toEqual([playing]);
  });
});

describe("a one-shot cue on native", () => {
  it("starts at full volume and is cut, not faded, on stop()", async () => {
    const lane = createLanePlayer();
    void lane.play(1, 0.7, false);
    await flush();
    const player = players[0];
    expect(player.loop).toBe(false);
    expect(player.volume).toBe(0.7);
    void lane.stop();
    expect(player.remove).toHaveBeenCalledTimes(1);
  });
});

type FakeAudioElement = {
  src: string;
  loop: boolean;
  volume: number;
  play: jest.Mock;
  pause: jest.Mock;
};

/**
 * The web lane keeps ONE `AudioContext` and ONE decode cache in module state (W1, W5),
 * so each web test gets a fresh MODULE rather than a reset hook in production code.
 * `setPlatformOS` has to land after the reset: `jest.resetModules()` hands out a new
 * `react-native` whose `Platform.OS` is back to the runner's platform.
 */
function webHarness() {
  const elements: FakeAudioElement[] = [];
  let audio: FakeWebAudio;

  const install = (options?: Parameters<typeof installFakeWebAudio>[0]) => {
    jest.resetModules();
    setPlatformOS("web");
    audio = installFakeWebAudio(options);
    const g = globalThis as unknown as { window?: { Audio?: unknown } };
    if (!g.window) g.window = {};
    g.window.Audio = function FakeAudioCtor(this: FakeAudioElement, src: string) {
      this.src = src;
      this.loop = false;
      this.volume = 1;
      this.play = jest.fn().mockResolvedValue(undefined);
      this.pause = jest.fn();
      elements.push(this);
    } as unknown;
  };

  return {
    elements,
    get audio() {
      return audio;
    },
    install,
    createLane: () =>
      (
        require("@/src/lib/lane-player") as typeof import("@/src/lib/lane-player")
      ).createLanePlayer(),
    /**
     * The web open awaits a fetch, an arrayBuffer, a decode and a resume, so it needs
     * more microtask turns than the native audio-mode await. Timers stay untouched.
     */
    flush: async () => {
      for (let i = 0; i < 24; i++) await Promise.resolve();
    },
  };
}

describe("a looping bed on web", () => {
  const web = webHarness();

  beforeEach(() => {
    web.elements.length = 0;
    web.install();
  });
  afterEach(() => {
    uninstallFakeWebAudio();
    jest.resetModules();
  });

  it("loops on an AudioBufferSourceNode, never on the element", async () => {
    // ☠️ STRUCTURAL, on purpose (§3.3.1): the element's `loop` is a full pipeline seek
    // with ~20 ms of digital silence in it, so a refactor that quietly puts the bed
    // back on the element must fail here rather than in somebody's ear.
    const lane = web.createLane();
    void lane.play(1, 0.5, true);
    await web.flush();
    expect(web.audio.sources).toHaveLength(1);
    expect(web.audio.sources[0].loop).toBe(true);
    expect(web.audio.sources[0].start).toHaveBeenCalledTimes(1);
    expect(web.elements).toHaveLength(0);
  });

  it("rises from 0 through the gain, and on stop() falls to 0 before the source stops", async () => {
    const lane = web.createLane();
    void lane.play(1, 0.5, true);
    await web.flush();
    const [source] = web.audio.sources;
    const [gain] = web.audio.gains;
    expect(gain.gain.value).toBe(0);
    const up = sampleRamp(() => gain.gain.value);
    for (let i = 1; i < up.length; i++) expect(up[i]).toBeGreaterThan(up[i - 1]);
    expect(up[up.length - 1]).toBeCloseTo(0.5, 6);

    void lane.stop();
    expect(source.stop).not.toHaveBeenCalled();
    const down = sampleRamp(() => gain.gain.value);
    for (let i = 1; i < down.length; i++) expect(down[i]).toBeLessThan(down[i - 1]);
    expect(down[down.length - 1]).toBe(0);
    expect(source.stop).toHaveBeenCalledTimes(1);
  });

  /** ⚠️ The web twin of the rewritten native case. Same ruling, same rename. */
  it("lets a source already fading out finish its own fall while the new one rises", async () => {
    const lane = web.createLane();
    void lane.play(1, 0.5, true);
    await web.flush();
    jest.advanceTimersByTime(LOOP_FADE_MS);
    void lane.stop();
    jest.advanceTimersByTime(LOOP_FADE_MS / 2);
    const midFall = web.audio.gains[0].gain.value;
    expect(midFall).toBeGreaterThan(0);

    void lane.play(2, 0.5, true);
    await web.flush();
    expect(web.audio.sources).toHaveLength(2);
    expect(web.audio.sources[0].stop).not.toHaveBeenCalled();
    expect(web.audio.gains[0].gain.value).toBe(midFall);

    jest.advanceTimersByTime(LOOP_FADE_MS * 2);
    expect(web.audio.sources[0].stop).toHaveBeenCalledTimes(1);
    expect(web.audio.liveSources()).toEqual([web.audio.sources[1]]);
    expect(web.audio.gains[1].gain.value).toBeCloseTo(0.5, 6);
  });

  it("falls back to the element when the decode rejects", async () => {
    // ☠️ Not hypothetical: the beds' major brand is `M4A `, exactly what a Safari 27
    // beta rejected with EncodingError until 2026-07-27. The fallback is today's seam,
    // and a seam is not silence.
    const lane = web.createLane();
    web.audio.decodeError = new Error("EncodingError");
    void lane.play(1, 0.5, true);
    await web.flush();
    // The graph was TRIED and refused, rather than never reached: without this the
    // case would pass just as well against a lane that had no graph path at all.
    expect(web.audio.context?.decodeAudioData).toHaveBeenCalledTimes(1);
    expect(web.audio.sources).toHaveLength(0);
    expect(web.elements).toHaveLength(1);
    expect(web.elements[0].loop).toBe(true);
    expect(web.elements[0].play).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(LOOP_FADE_MS);
    expect(web.elements[0].volume).toBeCloseTo(0.5, 6);
  });

  it("falls back to the element when the context never reaches running", async () => {
    const lane = web.createLane();
    web.audio.resumeFails = true;
    void lane.play(1, 0.5, true);
    await web.flush();
    expect(web.audio.context?.state).toBe("suspended");
    expect(web.audio.sources).toHaveLength(0);
    expect(web.elements).toHaveLength(1);
    expect(web.elements[0].play).toHaveBeenCalledTimes(1);
  });

  it("falls back to the element in a browser with no AudioContext at all", async () => {
    web.elements.length = 0;
    web.install({ withoutConstructor: true });
    const lane = web.createLane();
    void lane.play(1, 0.5, true);
    await web.flush();
    expect(web.audio.contexts).toHaveLength(0);
    expect(web.elements).toHaveLength(1);
    expect(web.elements[0].loop).toBe(true);
  });

  it("suspends the context once the last bed is released, and resumes it on the next play", async () => {
    const lane = web.createLane();
    void lane.play(1, 0.5, true);
    await web.flush();
    const ctx = web.audio.context!;
    expect(web.audio.contexts).toHaveLength(1);
    expect(ctx.state).toBe("running");

    void lane.stop();
    jest.advanceTimersByTime(LOOP_FADE_MS);
    await web.flush();
    expect(ctx.suspend).toHaveBeenCalledTimes(1);
    expect(ctx.state).toBe("suspended");

    // One context per page: the next play resumes THIS one rather than building a second.
    void lane.play(1, 0.5, true);
    await web.flush();
    expect(web.audio.contexts).toHaveLength(1);
    expect(ctx.state).toBe("running");
  });

  it("loops inside [duration - nominal, duration] when the decode kept the AAC priming", async () => {
    const lane = web.createLane();
    // 1024 samples of priming at 44.1 kHz that the decoder did not trim: the ~23 ms
    // hole at the head of the file, which the loop window exists to skip.
    const priming = 1024 / 44100;
    web.audio.durations.set("1", DEFAULT_BED_SECONDS + priming);
    void lane.play(1, 0.5, true, DEFAULT_BED_SECONDS);
    await web.flush();
    const [source] = web.audio.sources;
    expect(source.loopStart).toBeCloseTo(priming, 9);
    expect(source.loopEnd).toBeCloseTo(DEFAULT_BED_SECONDS + priming, 9);
    // And playback starts past the priming too, not at 0.
    expect(source.start).toHaveBeenCalledWith(0, expect.closeTo(priming, 9));
  });

  it("loops the whole buffer when the decode trimmed the priming", async () => {
    const lane = web.createLane();
    void lane.play(1, 0.5, true, DEFAULT_BED_SECONDS);
    await web.flush();
    const [source] = web.audio.sources;
    expect(source.loopStart).toBe(0);
    expect(source.loopEnd).toBeCloseTo(DEFAULT_BED_SECONDS, 9);
  });

  it("never puts a one-shot into the graph", async () => {
    // W3. A cue is cut, not faded, and does not loop, so the graph buys it nothing
    // and would cost it a decode it has no time for.
    const lane = web.createLane();
    void lane.play(1, 0.7, false);
    await web.flush();
    expect(web.audio.contexts).toHaveLength(0);
    expect(web.audio.sources).toHaveLength(0);
    expect(web.elements).toHaveLength(1);
    expect(web.elements[0].loop).toBe(false);
    expect(web.elements[0].volume).toBe(0.7);
    void lane.stop();
    expect(web.elements[0].pause).toHaveBeenCalledTimes(1);
  });

  it("claims the playback audio session before the first looping bed, and only for it", async () => {
    // §3.1.8. Without it an iOS Safari graph would obey the mute switch and be
    // interrupted on backgrounding - parity the element has had all along, and what
    // the native app asks for with `playsInSilentMode`.
    const lane = web.createLane();
    expect(web.audio.audioSessionType).toBe("auto");

    void lane.play(1, 0.7, false);
    await web.flush();
    // A one-shot never reaches the graph, so it never claims the session either.
    expect(web.audio.audioSessionType).toBe("auto");

    void lane.play(2, 0.5, true);
    await web.flush();
    expect(web.audio.audioSessionType).toBe("playback");
  });

  it("plays on in a browser that has no audioSession at all", async () => {
    web.elements.length = 0;
    web.install({ withAudioSession: false });
    const lane = web.createLane();
    void lane.play(1, 0.5, true);
    await web.flush();
    expect(web.audio.audioSessionType).toBeUndefined();
    expect(web.audio.sources).toHaveLength(1);
    expect(web.audio.sources[0].loop).toBe(true);
  });

  it("keeps two decoded beds resident and re-decodes the third only once evicted", async () => {
    // W5: the playing bed and the previous one. A swap BACK is free; a third bed
    // evicts the oldest, and coming back to it costs one decode.
    const lane = web.createLane();
    const playBed = async (asset: number) => {
      void lane.play(asset, 0.5, true);
      await web.flush();
      jest.advanceTimersByTime(LOOP_FADE_MS * 2);
    };
    await playBed(1);
    await playBed(2);
    expect(web.audio.fetched).toEqual(["1", "2"]);

    // Back to a resident bed: no fetch, no decode.
    await playBed(1);
    expect(web.audio.fetched).toEqual(["1", "2"]);

    // A third bed evicts the least recently played one, which is now 2.
    await playBed(3);
    await playBed(1);
    expect(web.audio.fetched).toEqual(["1", "2", "3"]);
    await playBed(2);
    expect(web.audio.fetched).toEqual(["1", "2", "3", "2"]);
  });
});

describe("a bed swap on web", () => {
  const web = webHarness();

  beforeEach(() => {
    web.elements.length = 0;
    web.install();
  });
  afterEach(() => {
    uninstallFakeWebAudio();
    jest.resetModules();
  });

  it("holds the outgoing bed at level through a cold fetch and decode", async () => {
    // ☠️ This is the window the web change makes longest: before §4.1 the lane released
    // the playing bed and THEN awaited a network fetch and a decode, so the hole was
    // as long as the connection was slow.
    const lane = web.createLane();
    void lane.play(1, 0.5, true);
    await web.flush();
    jest.advanceTimersByTime(LOOP_FADE_MS);
    const outgoingGain = web.audio.gains[0];

    void lane.play(2, 0.3, true);
    jest.advanceTimersByTime(LOOP_FADE_MS * 2);
    expect(web.audio.sources).toHaveLength(1);
    expect(web.audio.sources[0].stop).not.toHaveBeenCalled();
    expect(outgoingGain.gain.value).toBeCloseTo(0.5, 6);

    await web.flush();
    expect(web.audio.sources).toHaveLength(2);
    expect(web.audio.gains[1].gain.value).toBe(0);
    jest.advanceTimersByTime(LOOP_FADE_MS);
    expect(outgoingGain.gain.value).toBe(0);
    expect(web.audio.sources[0].stop).toHaveBeenCalledTimes(1);
    expect(web.audio.liveSources()).toEqual([web.audio.sources[1]]);
    expect(web.audio.gains[1].gain.value).toBeCloseTo(0.3, 6);
  });

  it("crossfades on the element fallback too, so a fallback browser hears no cut", async () => {
    // W2: the lane's contract is identical on both paths. A browser that cannot decode
    // the bed still gets the blend, not the cut.
    const lane = web.createLane();
    web.audio.decodeError = new Error("EncodingError");
    void lane.play(1, 0.5, true);
    await web.flush();
    jest.advanceTimersByTime(LOOP_FADE_MS);
    expect(web.elements).toHaveLength(1);
    expect(web.elements[0].volume).toBeCloseTo(0.5, 6);

    void lane.play(2, 0.4, true);
    await web.flush();
    expect(web.elements).toHaveLength(2);
    // Held at level for the swap, then both ramps run together.
    expect(web.elements[0].pause).not.toHaveBeenCalled();
    expect(web.elements[0].volume).toBeCloseTo(0.5, 6);
    expect(web.elements[1].volume).toBe(0);

    const falling = sampleRamp(() => web.elements[0].volume);
    for (let i = 1; i < falling.length; i++) expect(falling[i]).toBeLessThan(falling[i - 1]);
    expect(web.elements[0].volume).toBe(0);
    expect(web.elements[0].pause).toHaveBeenCalledTimes(1);
    expect(web.elements[1].volume).toBeCloseTo(0.4, 6);
    expect(web.elements[1].pause).not.toHaveBeenCalled();
  });

  it("cuts the older fader when a third bed arrives, keeping two sources at most", async () => {
    const lane = web.createLane();
    void lane.play(1, 0.5, true);
    await web.flush();
    jest.advanceTimersByTime(LOOP_FADE_MS);
    void lane.play(2, 0.5, true);
    await web.flush();
    jest.advanceTimersByTime(LOOP_FADE_MS / 2);
    expect(web.audio.liveSources()).toHaveLength(2);

    void lane.play(3, 0.4, true);
    await web.flush();
    expect(web.audio.sources).toHaveLength(3);
    expect(web.audio.liveSources()).toEqual([web.audio.sources[1], web.audio.sources[2]]);
    expect(web.audio.sources[0].stop).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(LOOP_FADE_MS * 2);
    expect(web.audio.liveSources()).toEqual([web.audio.sources[2]]);
    for (const source of web.audio.sources.slice(0, 2))
      expect(source.stop).toHaveBeenCalledTimes(1);
  });

  it("aims setVolume() at the rising gain only, leaving the falling one alone", async () => {
    const lane = web.createLane();
    void lane.play(1, 0.5, true);
    await web.flush();
    jest.advanceTimersByTime(LOOP_FADE_MS);
    void lane.play(2, 0.4, true);
    await web.flush();
    jest.advanceTimersByTime(LOOP_FADE_MS / 4);
    const [falling, rising] = web.audio.gains;
    const quarter = falling.gain.value;

    void lane.setVolume(0.1);
    // The falling gain keeps its own schedule and lands on 0 exactly one ramp after
    // the swap began - not later, and not sooner.
    jest.advanceTimersByTime(LOOP_FADE_MS / 4);
    const half = falling.gain.value;
    expect(half).toBeLessThan(quarter);
    expect(half).toBeGreaterThan(0);
    jest.advanceTimersByTime(LOOP_FADE_MS / 2);
    expect(falling.gain.value).toBe(0);
    expect(web.audio.sources[0].stop).toHaveBeenCalledTimes(1);
    expect(rising.gain.value).toBeCloseTo(0.1, 6);
  });

  it("fades both halves to 0 on stop() and suspends the context only once both are gone", async () => {
    const lane = web.createLane();
    void lane.play(1, 0.5, true);
    await web.flush();
    jest.advanceTimersByTime(LOOP_FADE_MS);
    void lane.play(2, 0.4, true);
    await web.flush();
    jest.advanceTimersByTime(LOOP_FADE_MS / 2);
    const ctx = web.audio.context!;

    void lane.stop();
    expect(web.audio.gains[0].gain.value).toBeGreaterThan(0);
    expect(web.audio.gains[1].gain.value).toBeGreaterThan(0);
    jest.advanceTimersByTime(LOOP_FADE_MS / 2);
    // The first half is gone and the second is still falling: the page's audio
    // hardware stays open until the lane is actually silent.
    expect(ctx.suspend).not.toHaveBeenCalled();

    jest.advanceTimersByTime(LOOP_FADE_MS);
    expect(web.audio.liveSources()).toHaveLength(0);
    expect(ctx.suspend).toHaveBeenCalledTimes(1);
  });

  it("leaves the previous bed playing when the incoming one cannot open at all", async () => {
    const lane = web.createLane();
    void lane.play(1, 0.5, true);
    await web.flush();
    jest.advanceTimersByTime(LOOP_FADE_MS);

    // Neither path can open: no graph, and no element constructor either.
    web.audio.decodeError = new Error("EncodingError");
    const g = globalThis as unknown as { window: { Audio: unknown } };
    const realCtor = g.window.Audio;
    g.window.Audio = function Broken() {
      throw new Error("no element");
    } as unknown;
    void lane.play(2, 0.4, true);
    await web.flush();
    jest.advanceTimersByTime(LOOP_FADE_MS * 2);
    g.window.Audio = realCtor;

    expect(web.audio.sources[0].stop).not.toHaveBeenCalled();
    expect(web.audio.gains[0].gain.value).toBeCloseTo(0.5, 6);
    expect(web.audio.liveSources()).toEqual([web.audio.sources[0]]);
  });
});
