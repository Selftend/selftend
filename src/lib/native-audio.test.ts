/**
 * The one-shot player's silence guard (#1188), and the sound loaded ahead of its
 * moment (#1744).
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

type FakePlayer = {
  volume: number;
  addListener: jest.Mock;
  play: jest.Mock;
  remove: jest.Mock;
};

const player = (): FakePlayer => ({
  volume: -1,
  addListener: jest.fn(),
  play: jest.fn(),
  remove: jest.fn(),
});

const created = (index: number) => mockCreateAudioPlayer.mock.results[index]!.value as FakePlayer;

// The module latches "audio mode configured" for the life of the module, so a
// test that wants to observe that call has to start from a fresh copy.
type NativeAudio = typeof import("@/src/lib/native-audio");
const freshAudio = () => {
  let audio!: NativeAudio;
  jest.isolateModules(() => {
    audio = jest.requireActual<NativeAudio>("@/src/lib/native-audio");
  });
  return audio;
};

const flush = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  mockCreateAudioPlayer.mockReset().mockImplementation(player);
  mockSetAudioModeAsync.mockReset().mockResolvedValue(undefined);
});

describe("playOneShot", () => {
  it("plays at the volume it was given", async () => {
    freshAudio().playOneShot(42, 0.4);
    await flush();

    expect(mockCreateAudioPlayer).toHaveBeenCalledWith(42);
    expect(created(0).volume).toBe(0.4);
    expect(created(0).play).toHaveBeenCalled();
  });

  it("builds nothing at all when the volume is off", async () => {
    freshAudio().playOneShot(42, 0);
    await flush();

    expect(mockCreateAudioPlayer).not.toHaveBeenCalled();
    // The whole point: silence must not configure the global audio session.
    expect(mockSetAudioModeAsync).not.toHaveBeenCalled();
  });

  it("treats a nonsense volume as off rather than as full", async () => {
    // `?? 1` fallbacks upstream mean this should never arrive, but a NaN slipping
    // through must not become a bell at whatever the platform does with NaN.
    freshAudio().playOneShot(42, Number.NaN);
    await flush();

    expect(mockCreateAudioPlayer).not.toHaveBeenCalled();
  });
});

describe("prepareOneShot", () => {
  it("loads the player and starts the audio-mode setup ahead; the moment only plays", async () => {
    const prepared = freshAudio().prepareOneShot(42);

    // Both costs are paid here, before anything is due.
    expect(mockCreateAudioPlayer).toHaveBeenCalledWith(42);
    expect(mockSetAudioModeAsync).toHaveBeenCalledTimes(1);
    expect(created(0).play).not.toHaveBeenCalled();

    prepared.play(0.4);
    await flush();

    expect(created(0).volume).toBe(0.4);
    expect(created(0).play).toHaveBeenCalledTimes(1);
    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(1);
    expect(mockSetAudioModeAsync).toHaveBeenCalledTimes(1);
  });

  it("configures the global audio session once for several sounds prepared in one tick", () => {
    // A sit screen prepares its three bells together; the old boolean latch was
    // only set AFTER the await, so all three would have asked.
    const audio = freshAudio();
    audio.prepareOneShot(1);
    audio.prepareOneShot(2);
    audio.prepareOneShot(3);

    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(3);
    expect(mockSetAudioModeAsync).toHaveBeenCalledTimes(1);
  });

  it("plays once: a second play does nothing, and so does a play after release", async () => {
    const prepared = freshAudio().prepareOneShot(42);
    prepared.play(0.5);
    prepared.play(0.5);
    await flush();
    expect(created(0).play).toHaveBeenCalledTimes(1);

    const dropped = freshAudio().prepareOneShot(43);
    dropped.release();
    dropped.play(0.5);
    await flush();
    expect(created(1).play).not.toHaveBeenCalled();
  });

  it("release removes a player that never played; after a play it belongs to the self-release", async () => {
    const audio = freshAudio();
    const unplayed = audio.prepareOneShot(42);
    unplayed.release();
    unplayed.release();
    expect(created(0).remove).toHaveBeenCalledTimes(1);

    const played = audio.prepareOneShot(43);
    played.play(0.5);
    await flush();
    played.release();
    expect(created(1).remove).not.toHaveBeenCalled();
    // The listener `playOneShot` has always attached is what lets go of it.
    const [, onStatus] = created(1).addListener.mock.calls[0] as [
      string,
      (status: { didJustFinish: boolean }) => void,
    ];
    onStatus({ didJustFinish: false });
    expect(created(1).remove).not.toHaveBeenCalled();
    onStatus({ didJustFinish: true });
    expect(created(1).remove).toHaveBeenCalledTimes(1);
  });

  it("plays nothing at 0 and keeps the sound prepared for a later moment", async () => {
    // The preference can resolve between preparation and the moment; 0 at the
    // moment is a bell that stays silent, not a bell that is thrown away.
    const prepared = freshAudio().prepareOneShot(42);
    prepared.play(0);
    await flush();
    expect(created(0).play).not.toHaveBeenCalled();

    prepared.play(0.3);
    await flush();
    expect(created(0).play).toHaveBeenCalledTimes(1);
    expect(created(0).volume).toBe(0.3);
  });

  it("a failed audio-mode setup plays nothing, frees the player, and is retried by the next sound", async () => {
    mockSetAudioModeAsync.mockRejectedValueOnce(new Error("session busy"));
    const audio = freshAudio();
    const first = audio.prepareOneShot(42);
    first.play(0.5);
    await flush();
    expect(created(0).play).not.toHaveBeenCalled();
    expect(created(0).remove).toHaveBeenCalledTimes(1);

    const second = audio.prepareOneShot(43);
    second.play(0.5);
    await flush();
    expect(mockSetAudioModeAsync).toHaveBeenCalledTimes(2);
    expect(created(1).play).toHaveBeenCalledTimes(1);
  });
});
