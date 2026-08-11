import { act, fireEvent, screen } from "@testing-library/react-native";

import { MeditationSitScreen } from "@/src/features/meditation/meditation-sit-screen";
import type { MeditationSessionInput } from "@/src/features/meditation/types";
import { renderWithProviders } from "@/test/render-with-providers";

// Route params, mutable per test - deep links can supply anything.
const mockParams: { duration?: string; bell?: string } = {};

// beforeRemove listeners the screen registers on the (mocked) navigator, so a
// test can play the OS back gesture / web back button mid-sit.
const beforeRemoveListeners: ((event: {
  preventDefault: () => void;
  data: { action: unknown };
}) => void)[] = [];
const mockNavigation = {
  addListener: (type: string, listener: (event: never) => void) => {
    if (type === "beforeRemove") beforeRemoveListeners.push(listener as never);
    return () => {
      const index = beforeRemoveListeners.indexOf(listener as never);
      if (index >= 0) beforeRemoveListeners.splice(index, 1);
    };
  },
  dispatch: jest.fn(),
};

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual<typeof import("react")>("react");
  return {
    router: { replace: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => false) },
    useLocalSearchParams: () => mockParams,
    usePathname: () => "/tools/meditation/session",
    // Actually runs its callback, as focus does: the clock starts there, and
    // under a no-op mock the screen would never begin the sit.
    useFocusEffect: (callback: () => void) => useEffect(callback, [callback]),
    useNavigation: () => mockNavigation,
  };
});

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

// The save resolves to the row the server would hand back - the After screen
// titles itself from the RECORDED minutes, not the requested ones.
const mockSaveMutateAsync = jest.fn();
const mockUpdateMutateAsync = jest.fn().mockResolvedValue(undefined);
jest.mock("@/src/features/meditation/queries", () => ({
  useMeditationProgramState: () => ({ data: { currentStage: 3 } }),
  useSaveMeditationSession: () => ({ mutateAsync: mockSaveMutateAsync, isPending: false }),
  useUpdateMeditationSessionReflection: () => ({
    mutateAsync: mockUpdateMutateAsync,
    isPending: false,
  }),
}));

const mockPlayOneShot = jest.fn();
jest.mock("@/src/lib/native-audio", () => ({
  playOneShot: (asset: number, volume: number) => mockPlayOneShot(asset, volume),
}));

jest.mock("@/src/lib/color-scheme", () => ({ useColorSchemeName: () => "light" }));

jest.mock("@/src/stores/toast-store", () => ({
  useToastStore: (selector: (s: { showToast: () => void }) => unknown) =>
    selector({ showToast: jest.fn() }),
}));

const { router } = jest.requireMock<{ router: { replace: jest.Mock } }>("expo-router");

const START_AT = new Date("2026-08-11T10:00:00.000Z");

beforeEach(() => {
  jest.useFakeTimers({ now: START_AT });
  mockParams.duration = "12";
  mockParams.bell = "5";
  beforeRemoveListeners.length = 0;
  router.replace.mockClear();
  mockPlayOneShot.mockClear();
  mockUpdateMutateAsync.mockClear();
  mockSaveMutateAsync.mockReset().mockImplementation(async (input: MeditationSessionInput) => ({
    id: "sit-1",
    userId: "user-1",
    stageAtSession: input.stageAtSession,
    durationMinutes: input.durationMinutes,
    completedAt: input.occurredAt?.occurredAt ?? "",
    completedOffsetMinutes: input.occurredAt?.occurredOffsetMinutes ?? null,
    dayKey: "2026-08-11",
    createdAt: "2026-08-11T10:00:00Z",
    mindWanderingEpisodes: null,
    dullnessLevel: null,
    distractionLevel: null,
    obstacleTags: [],
    reflection: "",
    moodAfter: null,
    techniqueUsed: null,
  }));
});

afterEach(() => {
  jest.useRealTimers();
});

const advance = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

const fireBack = () => {
  const event = { preventDefault: jest.fn(), data: { action: {} } };
  act(() => {
    for (const listener of [...beforeRemoveListeners]) listener(event);
  });
  return event;
};

describe("Meditation sitting (7b)", () => {
  it("renders on the focus shell with the ring, the countdown and the bell line", () => {
    renderWithProviders(<MeditationSitScreen />);

    // The wash is decorative and accessibility-hidden, so it only answers
    // hidden-inclusive queries - same as the breathing runner's assertion.
    expect(screen.getByTestId("focus-surface-wash", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText("Sitting · stage 3")).toBeTruthy();
    expect(screen.getByTestId("sit-ring")).toBeTruthy();
    expect(screen.getByText("12:00")).toBeTruthy();
    expect(screen.getByText("of 12 min · bell at 5")).toBeTruthy();
    expect(screen.getByText("Pause")).toBeTruthy();
    expect(screen.getByText("Finish early")).toBeTruthy();
  });

  it("omits the bell read-out when the bell is off", () => {
    mockParams.bell = "0";
    renderWithProviders(<MeditationSitScreen />);

    expect(screen.getByText("of 12 min")).toBeTruthy();
    expect(screen.queryByText(/bell at/)).toBeNull();
  });

  it("falls back to a sensible sit for garbage deep-link params", () => {
    mockParams.duration = "-3";
    mockParams.bell = "banana";
    renderWithProviders(<MeditationSitScreen />);

    expect(screen.getByText("12:00")).toBeTruthy();
    expect(screen.queryByText(/bell at/)).toBeNull();
  });

  it("counts down on the wall clock", async () => {
    renderWithProviders(<MeditationSitScreen />);

    await advance(61_000);

    expect(screen.getByText("10:59")).toBeTruthy();
  });

  it("stays accurate when the interval was suspended for minutes (backgrounding)", async () => {
    renderWithProviders(<MeditationSitScreen />);
    await advance(61_000);

    // The app goes to the background: the clock advances but no tick runs.
    act(() => {
      jest.setSystemTime(new Date(Date.now() + 9 * 60_000));
    });
    // Foreground: the first tick recomputes from the wall clock, not from the
    // number of intervals that fired.
    await advance(250);

    expect(screen.getByText("1:59")).toBeTruthy();
  });

  it("rings the interval bell at a crossed boundary, but never replays a missed stack", async () => {
    renderWithProviders(<MeditationSitScreen />);
    mockPlayOneShot.mockClear(); // drop the start bell

    await advance(5 * 60_000 + 250);
    expect(mockPlayOneShot).toHaveBeenCalledTimes(1);

    // Suspended over the 10-minute boundary and reopened 90 seconds past it:
    // that bell's moment has passed, and a late catch-up bell on foreground is
    // noise, not timekeeping.
    act(() => {
      jest.setSystemTime(new Date(Date.now() + 6 * 60_000));
    });
    await advance(250);
    expect(mockPlayOneShot).toHaveBeenCalledTimes(1);
  });

  it("records the sit at completion, before the reflection is offered", async () => {
    renderWithProviders(<MeditationSitScreen />);

    await advance(12 * 60_000 + 250);

    expect(mockSaveMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockSaveMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        stageAtSession: 3,
        durationMinutes: 12,
        reflection: "",
        obstacleTags: [],
        occurredAt: expect.objectContaining({ occurredAt: "2026-08-11T10:12:00.000Z" }),
      }),
    );
    expect(screen.getByText("That's 12 minutes.")).toBeTruthy();
    // Load-bearing guardrail copy, shipped verbatim (#786).
    expect(screen.getByText("Saved already — the rest is only if it's useful.")).toBeTruthy();
  });

  it("dates a sit that ran out in the background by its true end, not the reopen", async () => {
    renderWithProviders(<MeditationSitScreen />);

    // Backgrounded for the whole sit and then some; the first tick on
    // foreground notices the sit is over.
    act(() => {
      jest.setSystemTime(new Date(START_AT.getTime() + 40 * 60_000));
    });
    await advance(250);

    expect(mockSaveMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        durationMinutes: 12,
        occurredAt: expect.objectContaining({ occurredAt: "2026-08-11T10:12:00.000Z" }),
      }),
    );
  });

  it("finish early records the elapsed minutes and still offers the reflection", async () => {
    renderWithProviders(<MeditationSitScreen />);
    await advance(5 * 60_000);

    fireEvent.press(screen.getByText("Finish early"));
    await act(async () => {});

    expect(mockSaveMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ durationMinutes: 5 }),
    );
    expect(screen.getByText("That's 5 minutes.")).toBeTruthy();
  });

  it("pauses the clock and resumes where it stopped", async () => {
    renderWithProviders(<MeditationSitScreen />);
    await advance(60_000);

    fireEvent.press(screen.getByText("Pause"));
    expect(screen.getByText("Paused")).toBeTruthy();
    await advance(60_000);
    expect(screen.getByText("11:00")).toBeTruthy();

    fireEvent.press(screen.getByText("Resume"));
    await advance(1_000);
    expect(screen.getByText("10:59")).toBeTruthy();
  });

  it("pauses and asks on the back gesture; confirming saves and leaves", async () => {
    renderWithProviders(<MeditationSitScreen />);
    await advance(4 * 60_000);

    const event = fireBack();
    expect(event.preventDefault).toHaveBeenCalled();
    expect(screen.getByText("Finish this sit?")).toBeTruthy();

    fireEvent.press(screen.getByText("Finish sit"));
    await act(async () => {});

    expect(mockSaveMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ durationMinutes: 4 }),
    );
    // The user asked to leave: the recorded sit is honoured with an exit, not a
    // detour through the reflection they were leaving.
    expect(router.replace).toHaveBeenCalledWith("/tools/meditation");
  });

  it("keeps sitting when the back-gesture dialog is cancelled", async () => {
    renderWithProviders(<MeditationSitScreen />);
    await advance(60_000);

    fireBack();
    await advance(30_000); // paused behind the dialog - the clock must not run
    fireEvent.press(screen.getByText("Keep sitting"));
    await advance(1_000);

    expect(mockSaveMutateAsync).not.toHaveBeenCalled();
    expect(screen.getByText("10:59")).toBeTruthy();
  });
});

describe("Meditation reflection (7b, after)", () => {
  const completeSit = async () => {
    renderWithProviders(<MeditationSitScreen />);
    await advance(12 * 60_000 + 250);
  };

  it("Skip leaves the recorded sit intact and writes nothing else", async () => {
    await completeSit();

    fireEvent.press(screen.getByText("Skip"));

    expect(mockSaveMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockUpdateMutateAsync).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith("/tools/meditation");
  });

  it("saves the reflection as an update of the already-recorded row", async () => {
    await completeSit();

    fireEvent.press(screen.getByTestId("sit-pull-resistance"));
    fireEvent.press(screen.getByTestId("sit-pull-mindWandering"));
    fireEvent.changeText(
      screen.getByPlaceholderText("Anything worth noting?"),
      "Settled after the first bell.",
    );
    fireEvent.press(screen.getByText("Save reflection"));
    await act(async () => {});

    expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
      sessionId: "sit-1",
      patch: {
        obstacleTags: ["resistance", "mindWandering"],
        reflection: "Settled after the first bell.",
      },
    });
    expect(router.replace).toHaveBeenCalledWith("/tools/meditation");
  });

  it("offers exactly the five drawn pulls, as accent-ink chips", async () => {
    await completeSit();

    for (const label of ["Resistance", "Fatigue", "Impatience", "Boredom", "Mind-wandering"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    fireEvent.press(screen.getByTestId("sit-pull-boredom"));
    // `text-primary-ink` on the tint, never a hue on a hue tint (#368).
    expect(screen.getByText("Boredom").props.className).toContain("text-primary-ink");
  });

  it("lets the back gesture through once the sit is recorded", async () => {
    await completeSit();

    const event = fireBack();

    // Backing out of the reflection is just skipping it - the sit is saved.
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
