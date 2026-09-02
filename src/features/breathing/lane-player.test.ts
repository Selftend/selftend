/**
 * The looping lanes fade; the cue lane does not (#1743).
 *
 * ☠️ Everything here runs on FAKE timers: the ramp is a `setInterval`, so a test that
 * forgets to advance the clock sees a player frozen at its starting volume and can
 * pass or fail for the wrong reason. Volume is SAMPLED off the fake player between
 * advances, so the assertions are on the shape of the ramp, not on step counts.
 */
import { LOOP_FADE_MS, createLanePlayer } from "@/src/features/breathing/lane-player";
import {
  fakePlayers as players,
  flushAudioSetup as flush,
  livePlayers as live,
  resetFakeAudio,
} from "@/test/expo-audio-mock";
import { setPlatformOS } from "@/test/modal-marker-mock";

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

  it("leaves exactly one live player when play() lands during a fade-out", async () => {
    const lane = createLanePlayer();
    void lane.play(1, 0.6, true);
    await flush();
    jest.advanceTimersByTime(LOOP_FADE_MS);
    void lane.stop();
    jest.advanceTimersByTime(LOOP_FADE_MS / 2);
    // Mid-fade, a new bed arrives: the outgoing one is cut, once, and the new one
    // fades in from 0. Never two live players, never a double remove().
    void lane.play(2, 0.4, true);
    await flush();
    expect(players).toHaveLength(2);
    expect(players[0].remove).toHaveBeenCalledTimes(1);
    expect(live()).toEqual([players[1]]);
    expect(players[1].volume).toBe(0);
    jest.advanceTimersByTime(LOOP_FADE_MS * 2);
    expect(players[0].remove).toHaveBeenCalledTimes(1);
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

describe("a looping bed on web", () => {
  type FakeAudio = {
    src: string;
    loop: boolean;
    volume: number;
    play: jest.Mock;
    pause: jest.Mock;
  };
  const elements: FakeAudio[] = [];
  const ORIGINAL_OS = (require("react-native") as typeof import("react-native")).Platform.OS;

  beforeEach(() => {
    elements.length = 0;
    setPlatformOS("web");
    const g = globalThis as unknown as { window?: { Audio?: unknown } };
    if (!g.window) g.window = {};
    g.window.Audio = function FakeAudioCtor(this: FakeAudio, src: string) {
      this.src = src;
      this.loop = false;
      this.volume = 1;
      this.play = jest.fn().mockResolvedValue(undefined);
      this.pause = jest.fn();
      elements.push(this);
    } as unknown;
  });
  afterEach(() => {
    setPlatformOS(ORIGINAL_OS as "web" | "ios" | "android");
  });

  it("rises from 0, and on stop() falls to 0 before pause()", async () => {
    const lane = createLanePlayer();
    void lane.play(1, 0.5, true);
    await flush();
    const el = elements[0];
    expect(el.play).toHaveBeenCalledTimes(1);
    expect(el.volume).toBe(0);
    const up = sampleRamp(() => el.volume);
    expect(up[up.length - 1]).toBeCloseTo(0.5, 6);
    void lane.stop();
    expect(el.pause).not.toHaveBeenCalled();
    const down = sampleRamp(() => el.volume);
    for (let i = 1; i < down.length; i++) expect(down[i]).toBeLessThan(down[i - 1]);
    expect(down[down.length - 1]).toBe(0);
    expect(el.pause).toHaveBeenCalledTimes(1);
  });

  it("keeps one live element when play() lands during a fade-out", async () => {
    const lane = createLanePlayer();
    void lane.play(1, 0.5, true);
    await flush();
    jest.advanceTimersByTime(LOOP_FADE_MS);
    void lane.stop();
    jest.advanceTimersByTime(LOOP_FADE_MS / 2);
    void lane.play(2, 0.5, true);
    await flush();
    jest.advanceTimersByTime(LOOP_FADE_MS * 2);
    expect(elements).toHaveLength(2);
    expect(elements[0].pause).toHaveBeenCalledTimes(1);
    expect(elements[1].pause).not.toHaveBeenCalled();
    expect(elements[1].volume).toBeCloseTo(0.5, 6);
  });
});
