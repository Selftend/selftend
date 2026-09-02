import { renderHook } from "@testing-library/react-native";

import { LOOP_FADE_MS } from "@/src/features/breathing/lane-player";
import { useBreathingAudio } from "@/src/features/breathing/use-breathing-audio";
import {
  fakePlayers as players,
  flushAudioSetup,
  mockCreateAudioPlayer,
  resetFakeAudio,
} from "@/test/expo-audio-mock";

jest.mock("expo-audio", () =>
  jest
    .requireActual<typeof import("@/test/expo-audio-mock")>("@/test/expo-audio-mock")
    .expoAudioModuleMock(),
);

describe("useBreathingAudio", () => {
  beforeEach(() => {
    resetFakeAudio();
  });

  it("does nothing while inactive", () => {
    renderHook(() =>
      useBreathingAudio({
        active: false,
        phaseLabel: "inhale",
        breathSoundId: "guided",
        ambientSoundId: "rain",
        breathVolume: 0.7,
        ambientVolume: 0.5,
      }),
    );
    expect(mockCreateAudioPlayer).not.toHaveBeenCalled();
  });

  it("plays a breath clip on an active inhale", async () => {
    renderHook(() =>
      useBreathingAudio({
        active: true,
        phaseLabel: "inhale",
        breathSoundId: "guided",
        ambientSoundId: "none",
        breathVolume: 0.7,
        ambientVolume: 0.5,
      }),
    );
    // flush the audio-mode await inside LanePlayer.play
    await Promise.resolve();
    await Promise.resolve();
    expect(mockCreateAudioPlayer).toHaveBeenCalled();
    expect(players[0]?.play).toHaveBeenCalled();
  });

  it("fires a guided cue once (not looping) at the start of a phase", async () => {
    renderHook(() =>
      useBreathingAudio({
        active: true,
        phaseLabel: "inhale",
        breathSoundId: "guided",
        ambientSoundId: "none",
        breathVolume: 0.7,
        ambientVolume: 0.5,
      }),
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(mockCreateAudioPlayer).toHaveBeenCalled();
    expect(players[0]?.loop).toBe(false);
  });

  it("fades the bed out on pause, back in on resume, and out again at the end (#1743)", async () => {
    // The session screen drops `active` on every pause as well as at the end
    // (session.tsx: `active: screenPhase === "active" && !paused`), so one prop
    // drives all three transitions and the lane must FADE on each rather than cut.
    jest.useFakeTimers();
    try {
      const { rerender } = renderHook(
        (active: boolean) =>
          useBreathingAudio({
            active,
            phaseLabel: "inhale",
            breathSoundId: "none",
            ambientSoundId: "rain",
            breathVolume: 0.7,
            ambientVolume: 0.5,
          }),
        { initialProps: true },
      );
      await flushAudioSetup();
      const bed = players[0];
      expect(bed.loop).toBe(true);
      expect(bed.volume).toBe(0);
      jest.advanceTimersByTime(LOOP_FADE_MS);
      expect(bed.volume).toBeCloseTo(0.5, 6);

      // Pause: not removed at once, ramped to 0 and then released.
      rerender(false);
      expect(bed.remove).not.toHaveBeenCalled();
      jest.advanceTimersByTime(LOOP_FADE_MS / 2);
      expect(bed.volume).toBeGreaterThan(0);
      expect(bed.volume).toBeLessThan(0.5);
      jest.advanceTimersByTime(LOOP_FADE_MS);
      expect(bed.volume).toBe(0);
      expect(bed.remove).toHaveBeenCalledTimes(1);

      // Resume: a fresh player rising from 0.
      rerender(true);
      await flushAudioSetup();
      const resumed = players[1];
      expect(resumed.volume).toBe(0);
      jest.advanceTimersByTime(LOOP_FADE_MS);
      expect(resumed.volume).toBeCloseTo(0.5, 6);

      // End of session: the same fade-out.
      rerender(false);
      expect(resumed.remove).not.toHaveBeenCalled();
      jest.advanceTimersByTime(LOOP_FADE_MS);
      expect(resumed.remove).toHaveBeenCalledTimes(1);
      expect(players).toHaveLength(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it("stays silent when both lanes are 'none'", () => {
    renderHook(() =>
      useBreathingAudio({
        active: true,
        phaseLabel: "inhale",
        breathSoundId: "none",
        ambientSoundId: "none",
        breathVolume: 0.7,
        ambientVolume: 0.5,
      }),
    );
    expect(mockCreateAudioPlayer).not.toHaveBeenCalled();
  });
});
