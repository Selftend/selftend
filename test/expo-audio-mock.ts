/**
 * One fake `expo-audio` for the lane-player tests, so `lane-player.test.ts` and
 * `use-breathing-audio.test.tsx` observe the same player shape.
 *
 * Wire it up with `jest.mock("expo-audio", () => jest.requireActual("@/test/expo-audio-mock").expoAudioModuleMock())`
 * (the factory is hoisted, so it cannot close over an import; requiring inside it
 * is the sanctioned way), then read `fakePlayers` / `mockCreateAudioPlayer` from a
 * normal import. Reset both in `beforeEach`.
 */
export type FakeAudioPlayer = {
  play: jest.Mock;
  remove: jest.Mock;
  addListener: jest.Mock;
  loop: boolean;
  volume: number;
};

/** Every player created since the last reset, in creation order. */
export const fakePlayers: FakeAudioPlayer[] = [];

export const mockCreateAudioPlayer = jest.fn((..._args: unknown[]) => {
  const player: FakeAudioPlayer = {
    play: jest.fn(),
    remove: jest.fn(),
    addListener: jest.fn(),
    loop: false,
    volume: 1,
  };
  fakePlayers.push(player);
  return player;
});

export function expoAudioModuleMock() {
  return {
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    createAudioPlayer: (...args: unknown[]) => mockCreateAudioPlayer(...args),
  };
}

/** Forget every player and every call. */
export function resetFakeAudio() {
  fakePlayers.length = 0;
  mockCreateAudioPlayer.mockClear();
}

/** Players that have not been `remove()`d. */
export const livePlayers = () => fakePlayers.filter((p) => p.remove.mock.calls.length === 0);

/**
 * Let the `await ensureNativeAudioMode(...)` inside a lane's play() settle. Microtasks
 * only, so it works under fake timers without advancing the clock.
 */
export async function flushAudioSetup() {
  for (let i = 0; i < 4; i++) await Promise.resolve();
}
