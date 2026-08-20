/**
 * The one-shot player's silence guard (#1188).
 *
 * Bells became mutable, and 0 has to mean nothing happens - not "a player is
 * built, handed a volume of zero, and left to finish". The second claim matters
 * more than it looks on native: every one-shot passes through
 * `ensureNativeAudioMode`, which configures the app's GLOBAL audio session to
 * play through the iOS mute switch. A user who turned the bells off should not
 * be having that done on their behalf for a sound nobody hears.
 */
const mockCreateAudioPlayer = jest.fn();
const mockSetAudioModeAsync = jest.fn().mockResolvedValue(undefined);

jest.mock("expo-audio", () => ({
  createAudioPlayer: (...args: unknown[]) => mockCreateAudioPlayer(...args),
  setAudioModeAsync: (...args: unknown[]) => mockSetAudioModeAsync(...args),
}));

const player = () => ({
  volume: -1,
  addListener: jest.fn(),
  play: jest.fn(),
  remove: jest.fn(),
});

// The module latches "audio mode configured" for the life of the module, so a
// test that wants to observe that call has to start from a fresh copy.
const freshPlayOneShot = () => {
  let playOneShot!: typeof import("@/src/lib/native-audio").playOneShot;
  jest.isolateModules(() => {
    playOneShot =
      jest.requireActual<typeof import("@/src/lib/native-audio")>(
        "@/src/lib/native-audio",
      ).playOneShot;
  });
  return playOneShot;
};

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe("playOneShot", () => {
  beforeEach(() => {
    mockCreateAudioPlayer.mockReset().mockImplementation(player);
    mockSetAudioModeAsync.mockClear();
  });

  it("plays at the volume it was given", async () => {
    freshPlayOneShot()(42, 0.4);
    await flush();

    expect(mockCreateAudioPlayer).toHaveBeenCalledWith(42);
    expect(mockCreateAudioPlayer.mock.results[0]!.value.volume).toBe(0.4);
    expect(mockCreateAudioPlayer.mock.results[0]!.value.play).toHaveBeenCalled();
  });

  it("builds nothing at all when the volume is off", async () => {
    freshPlayOneShot()(42, 0);
    await flush();

    expect(mockCreateAudioPlayer).not.toHaveBeenCalled();
    // The whole point: silence must not configure the global audio session.
    expect(mockSetAudioModeAsync).not.toHaveBeenCalled();
  });

  it("treats a nonsense volume as off rather than as full", async () => {
    // `?? 1` fallbacks upstream mean this should never arrive, but a NaN slipping
    // through must not become a bell at whatever the platform does with NaN.
    freshPlayOneShot()(42, Number.NaN);
    await flush();

    expect(mockCreateAudioPlayer).not.toHaveBeenCalled();
  });
});
