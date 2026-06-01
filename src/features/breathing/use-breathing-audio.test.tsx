import { renderHook } from "@testing-library/react-native";

import { useBreathingAudio } from "@/src/features/breathing/use-breathing-audio";

const mockCreateAsync = jest.fn().mockResolvedValue({
  sound: {
    playAsync: jest.fn().mockResolvedValue(undefined),
    stopAsync: jest.fn().mockResolvedValue(undefined),
    unloadAsync: jest.fn().mockResolvedValue(undefined),
    setVolumeAsync: jest.fn().mockResolvedValue(undefined),
  },
});

jest.mock("expo-av", () => ({
  Audio: {
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    Sound: { createAsync: (...args: unknown[]) => mockCreateAsync(...args) },
  },
}));

describe("useBreathingAudio", () => {
  beforeEach(() => jest.clearAllMocks());

  it("does nothing while inactive", () => {
    renderHook(() =>
      useBreathingAudio({
        active: false,
        phaseLabel: "inhale",
        breathSoundId: "soft-breath",
        ambientSoundId: "rain",
        breathVolume: 0.7,
        ambientVolume: 0.5,
      }),
    );
    expect(mockCreateAsync).not.toHaveBeenCalled();
  });

  it("plays a breath clip on an active inhale", async () => {
    renderHook(() =>
      useBreathingAudio({
        active: true,
        phaseLabel: "inhale",
        breathSoundId: "soft-breath",
        ambientSoundId: "none",
        breathVolume: 0.7,
        ambientVolume: 0.5,
      }),
    );
    // microtask flush
    await Promise.resolve();
    expect(mockCreateAsync).toHaveBeenCalled();
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
    expect(mockCreateAsync).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ isLooping: false }),
    );
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
    expect(mockCreateAsync).not.toHaveBeenCalled();
  });
});
