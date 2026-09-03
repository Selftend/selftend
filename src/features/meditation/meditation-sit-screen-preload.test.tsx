/**
 * The bells are loaded ahead of their moments (#1744).
 *
 * `playOneShot` built its player when a bell was due, so the opening bell - fired
 * the instant the sit starts - arrived late by the asset load. The sit screen now
 * prepares every bell it will certainly ring on mount, through the REAL audio
 * module over the shared expo-audio fake, and the moments only play.
 *
 * ⚠️ Order matters in this file: the audio module latches "session configured"
 * for its whole life, so the one test that asserts `setAudioModeAsync` WAS asked
 * has to be the first test that triggers it. The volume-0 test runs before it
 * and triggers nothing; keep them in this order.
 */
import { act, fireEvent, screen } from "@testing-library/react-native";

import { MeditationSitScreen } from "@/src/features/meditation/meditation-sit-screen";
import {
  fakePlayers as players,
  mockCreateAudioPlayer,
  resetFakeAudio,
} from "@/test/expo-audio-mock";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-audio", () =>
  jest
    .requireActual<typeof import("@/test/expo-audio-mock")>("@/test/expo-audio-mock")
    .expoAudioModuleMock(),
);
const { setAudioModeAsync } = jest.requireMock<{ setAudioModeAsync: jest.Mock }>("expo-audio");

const mockParams: { duration?: string; bell?: string } = {};
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual<typeof import("react")>("react");
  return {
    router: { replace: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => false) },
    useLocalSearchParams: () => mockParams,
    usePathname: () => "/tools/meditation/session",
    // Runs its callback as focus does: the sit - and its opening bell - starts there.
    useFocusEffect: (callback: () => void | (() => void)) => {
      useEffect(() => callback(), [callback]);
    },
    useNavigation: () => ({ addListener: () => () => {}, dispatch: jest.fn() }),
  };
});

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/meditation/queries", () => ({
  useMeditationProgramState: () => ({
    data: { currentStage: 3 },
    isFetched: true,
    isError: false,
  }),
  useSaveMeditationSession: () => ({
    mutateAsync: jest.fn().mockResolvedValue({
      id: "sit-1",
      userId: "user-1",
      stageAtSession: 3,
      durationMinutes: 12,
      completedAt: "2026-08-11T10:12:00Z",
      completedOffsetMinutes: null,
      dayKey: "2026-08-11",
      createdAt: "2026-08-11T10:12:00Z",
      mindWanderingEpisodes: null,
      dullnessLevel: null,
      distractionLevel: null,
      obstacleTags: [],
      reflection: "",
      moodAfter: null,
      techniqueUsed: null,
    }),
    isPending: false,
  }),
  useUpdateMeditationSessionReflection: () => ({
    mutateAsync: jest.fn().mockResolvedValue(undefined),
    isPending: false,
  }),
}));

const mockPreferences: { data: { bellVolume?: number } | undefined } = { data: undefined };
jest.mock("@/src/features/settings/queries", () => ({
  ...jest.requireActual("@/src/features/settings/queries"),
  useUserPreferences: () => mockPreferences,
}));

jest.mock("@/src/lib/color-scheme", () => ({ useColorSchemeName: () => "light" }));

jest.mock("@/src/stores/toast-store", () => ({
  useToastStore: (selector: (s: { showToast: () => void }) => unknown) =>
    selector({ showToast: jest.fn() }),
}));

const bellSound = require("@/assets/sounds/meditation-bell.m4a") as number;
const intervalSound = require("@/assets/sounds/interval-temple-block.m4a") as number;

const START_AT = new Date("2026-08-11T10:00:00.000Z");

beforeEach(() => {
  jest.useFakeTimers({ now: START_AT });
  resetFakeAudio();
  mockParams.duration = "12";
  mockParams.bell = "5";
  mockPreferences.data = { bellVolume: 0.4 };
});

afterEach(() => {
  jest.useRealTimers();
});

const advance = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

/** Let a prepared bell's `await` on the audio-mode setup settle; no clock moves. */
const settle = () => act(async () => {});

const firstCall = (mock: jest.Mock) => mock.mock.invocationCallOrder[0]!;

describe("Meditation bells, loaded ahead (#1744)", () => {
  it("builds no bell and never configures the audio session while the bells are at 0", async () => {
    // Runs FIRST (see the file comment): a latched session would make the second
    // assertion vacuous.
    mockPreferences.data = { bellVolume: 0 };
    renderWithProviders(<MeditationSitScreen />);
    await settle();
    await advance(5 * 60_000 + 250);
    await advance(7 * 60_000 + 250);

    expect(mockCreateAudioPlayer).not.toHaveBeenCalled();
    expect(setAudioModeAsync).not.toHaveBeenCalled();
    expect(screen.getByText("Save reflection")).toBeTruthy();
  });

  it("loads the bells and configures the session on mount, ahead of the start; the start only plays", async () => {
    renderWithProviders(<MeditationSitScreen />);
    await settle();

    // Everything the sit will ring, in one tick: opening, end, interval.
    expect(mockCreateAudioPlayer.mock.calls).toEqual([[bellSound], [bellSound], [intervalSound]]);
    expect(setAudioModeAsync).toHaveBeenCalledTimes(1);

    // The opening bell rang from the first player, at the stored volume...
    expect(players[0]!.play).toHaveBeenCalledTimes(1);
    expect(players[0]!.volume).toBe(0.4);
    expect(players[1]!.play).not.toHaveBeenCalled();
    expect(players[2]!.play).not.toHaveBeenCalled();
    // ...and both costs were paid before it asked to play. Nothing was built at
    // the moment: the three players above are still the only three.
    expect(firstCall(setAudioModeAsync)).toBeLessThan(firstCall(players[0]!.play));
    expect(firstCall(mockCreateAudioPlayer)).toBeLessThan(firstCall(players[0]!.play));
    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(3);
  });

  it("loads the interval bell only when a spacing is set", async () => {
    mockParams.bell = "0";
    renderWithProviders(<MeditationSitScreen />);
    await settle();

    expect(mockCreateAudioPlayer.mock.calls).toEqual([[bellSound], [bellSound]]);
  });

  it("rings the end bell from the player loaded at mount, and each interval bell from one loaded behind the last", async () => {
    renderWithProviders(<MeditationSitScreen />);
    await settle();

    await advance(5 * 60_000 + 250);
    expect(players[2]!.play).toHaveBeenCalledTimes(1);
    expect(players[2]!.volume).toBe(0.4);
    // The next interval bell is due a spacing from now: loaded behind this one.
    expect(mockCreateAudioPlayer.mock.calls[3]).toEqual([intervalSound]);

    await advance(5 * 60_000);
    expect(players[3]!.play).toHaveBeenCalledTimes(1);
    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(5);

    await advance(2 * 60_000 + 250);
    expect(players[1]!.play).toHaveBeenCalledTimes(1);
    expect(players[1]!.volume).toBe(0.4);
    // The end bell built nothing at its moment.
    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(5);
    expect(screen.getByText("Save reflection")).toBeTruthy();
  });

  it("leaving lets go of every bell still waiting, and none that rang", async () => {
    const { unmount } = renderWithProviders(<MeditationSitScreen />);
    await settle();
    unmount();

    // The opening bell rang: its self-release listener owns it now.
    expect(players[0]!.remove).not.toHaveBeenCalled();
    // The end and interval bells never rang: released with the screen.
    expect(players[1]!.remove).toHaveBeenCalledTimes(1);
    expect(players[2]!.remove).toHaveBeenCalledTimes(1);
  });

  it("lets go of the bells that never rang once the sit is recorded", async () => {
    // A sit finished early leaves the end bell unrung; the reflection that
    // follows is not a sit, and holds no player.
    mockParams.bell = "0";
    renderWithProviders(<MeditationSitScreen />);
    await settle();
    await advance(60_000);

    fireEvent.press(screen.getByText("Finish early"));
    await settle();
    expect(screen.getByText("Save reflection")).toBeTruthy();
    expect(players[1]!.play).not.toHaveBeenCalled();
    expect(players[1]!.remove).toHaveBeenCalledTimes(1);
    expect(players[0]!.remove).not.toHaveBeenCalled();
  });
});
