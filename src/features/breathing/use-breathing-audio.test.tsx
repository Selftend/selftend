import { renderHook } from "@testing-library/react-native";

import { useBreathingAudio } from "@/src/features/breathing/use-breathing-audio";

type FakePlayer = {
  play: jest.Mock;
  remove: jest.Mock;
  addListener: jest.Mock;
  loop: boolean;
  volume: number;
};

const players: FakePlayer[] = [];
const mockCreateAudioPlayer = jest.fn((..._args: unknown[]) => {
  const player: FakePlayer = {
    play: jest.fn(),
    remove: jest.fn(),
    addListener: jest.fn(),
    loop: false,
    volume: 1,
  };
  players.push(player);
  return player;
});

jest.mock("expo-audio", () => ({
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  createAudioPlayer: (...args: unknown[]) => mockCreateAudioPlayer(...args),
}));

describe("useBreathingAudio", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    players.length = 0;
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
