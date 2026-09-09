import { renderHook } from "@testing-library/react-native";

import { LOOP_FADE_MS } from "@/src/lib/lane-player";
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
        hapticCues: false,
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
        hapticCues: false,
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
        hapticCues: false,
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
            hapticCues: false,
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
        hapticCues: false,
      }),
    );
    expect(mockCreateAudioPlayer).not.toHaveBeenCalled();
  });
});

// The phase's tap (#1741), replaced at the module seam like the audio.
const mockPhaseHaptic = jest.fn();
jest.mock("@/src/lib/native-haptics", () => ({ phaseHaptic: () => mockPhaseHaptic() }));

describe("phase haptic (#1741)", () => {
  type Props = Parameters<typeof useBreathingAudio>[0];
  const on: Omit<Props, "phaseLabel"> = {
    active: true,
    breathSoundId: "none",
    ambientSoundId: "none",
    breathVolume: 0.7,
    ambientVolume: 0.5,
    hapticCues: true,
  };
  const mount = (initialProps: Props) =>
    renderHook((props: Props) => useBreathingAudio(props), { initialProps });

  beforeEach(() => {
    mockPhaseHaptic.mockClear();
  });

  it("taps once per phase change with the `none` sound, where the sound path has nothing to play", () => {
    // The case the tap has its own effect for: beside `lane.play` it would never
    // fire here, because with no clip the sound effect never plays anything.
    const { rerender } = mount({ ...on, phaseLabel: "inhale" });
    expect(mockPhaseHaptic).toHaveBeenCalledTimes(1);

    rerender({ ...on, phaseLabel: "hold" });
    rerender({ ...on, phaseLabel: "exhale" });
    rerender({ ...on, phaseLabel: "holdOut" });
    expect(mockPhaseHaptic).toHaveBeenCalledTimes(4);
    expect(mockCreateAudioPlayer).not.toHaveBeenCalled();
  });

  it("taps every boundary for a voice without a hold cue, where the sound skips the hold", () => {
    // The guided voice has no hold clip; the sound effect de-duplicates on the
    // clip and stays silent through the hold. The tap marks the hold anyway.
    const { rerender } = mount({ ...on, breathSoundId: "guided", phaseLabel: "inhale" });
    rerender({ ...on, breathSoundId: "guided", phaseLabel: "hold" });
    rerender({ ...on, breathSoundId: "guided", phaseLabel: "exhale" });
    expect(mockPhaseHaptic).toHaveBeenCalledTimes(3);
  });

  it("taps nothing while inactive, nothing on pause, and once for the phase a resume returns to", () => {
    const { rerender } = mount({ ...on, active: false, phaseLabel: "inhale" });
    expect(mockPhaseHaptic).not.toHaveBeenCalled();

    rerender({ ...on, active: true, phaseLabel: "inhale" });
    expect(mockPhaseHaptic).toHaveBeenCalledTimes(1);

    // Pause: `active` drops with the phase unchanged.
    rerender({ ...on, active: false, phaseLabel: "inhale" });
    expect(mockPhaseHaptic).toHaveBeenCalledTimes(1);

    // Resume: one tap for the phase it comes back to, exactly as the sound re-cues it.
    rerender({ ...on, active: true, phaseLabel: "inhale" });
    expect(mockPhaseHaptic).toHaveBeenCalledTimes(2);
  });

  it("taps nothing with the switch off, and waits for the next boundary when it flips on mid-phase", () => {
    // A full cycle with the switch off - the default, and every existing account.
    const { rerender } = mount({ ...on, hapticCues: false, phaseLabel: "inhale" });
    rerender({ ...on, hapticCues: false, phaseLabel: "hold" });
    rerender({ ...on, hapticCues: false, phaseLabel: "exhale" });
    rerender({ ...on, hapticCues: false, phaseLabel: "holdOut" });
    rerender({ ...on, hapticCues: false, phaseLabel: "inhale" });
    rerender({ ...on, hapticCues: false, phaseLabel: "exhale" });
    expect(mockPhaseHaptic).not.toHaveBeenCalled();

    rerender({ ...on, hapticCues: true, phaseLabel: "exhale" });
    expect(mockPhaseHaptic).not.toHaveBeenCalled();

    rerender({ ...on, hapticCues: true, phaseLabel: "inhale" });
    expect(mockPhaseHaptic).toHaveBeenCalledTimes(1);
  });
});
