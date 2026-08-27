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

// The focus lifecycle, held where a test can drive it: `focusHandle` lets a
// test play a TRANSIENT blur - a route pushed above a still-mounted screen -
// which is not the same event as an unmount.
const focusHandle: { callback: (() => void | (() => void)) | null; cleanup: (() => void) | null } =
  { callback: null, cleanup: null };
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual<typeof import("react")>("react");
  return {
    router: { replace: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => false) },
    useLocalSearchParams: () => mockParams,
    usePathname: () => "/tools/meditation/session",
    // Actually runs its callback, as focus does: the clock starts there, and
    // under a no-op mock the screen would never begin the sit.
    useFocusEffect: (callback: () => void | (() => void)) => {
      useEffect(() => {
        focusHandle.callback = callback;
        focusHandle.cleanup = (callback() as (() => void) | undefined) ?? null;
        return () => {
          focusHandle.cleanup?.();
          focusHandle.callback = null;
          focusHandle.cleanup = null;
        };
      }, [callback]);
    },
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
// Mutable so a test can hold the stage query unresolved and settle it later.
const mockProgramState: { data?: { currentStage: number }; isFetched: boolean; isError: boolean } =
  { data: { currentStage: 3 }, isFetched: true, isError: false };
jest.mock("@/src/features/meditation/queries", () => ({
  useMeditationProgramState: () => mockProgramState,
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

// Only the one hook is replaced - the rest of the module stays real, because
// other things in this screen's import graph use it.
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

const { router } = jest.requireMock<{ router: { replace: jest.Mock } }>("expo-router");

const START_AT = new Date("2026-08-11T10:00:00.000Z");

beforeEach(() => {
  jest.useFakeTimers({ now: START_AT });
  mockParams.duration = "12";
  mockParams.bell = "5";
  mockProgramState.data = { currentStage: 3 };
  mockProgramState.isFetched = true;
  mockProgramState.isError = false;
  beforeRemoveListeners.length = 0;
  router.replace.mockClear();
  mockPlayOneShot.mockClear();
  mockPreferences.data = undefined;
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
    // R1 (#1256): the shell hosts the Escape, so the sit carries exactly one.
    // Its announcement on this route is pinned end to end (real trail, real
    // bundles) in focus-session-shell.test.tsx.
    expect(screen.getAllByTestId("screen-escape")).toHaveLength(1);
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

  it("rings every bell at the stored volume, not at a hardcoded 1", async () => {
    // All three fired at 1 until #1188, which measured them as the loudest
    // sound in the app - louder than either breathing lane, both of which had a
    // slider. Start and interval are covered here; the end bell rides the same
    // ref.
    mockPreferences.data = { bellVolume: 0.4 };
    renderWithProviders(<MeditationSitScreen />);

    expect(mockPlayOneShot).toHaveBeenLastCalledWith(expect.anything(), 0.4);

    mockPlayOneShot.mockClear();
    await advance(5 * 60_000 + 250);
    expect(mockPlayOneShot).toHaveBeenLastCalledWith(expect.anything(), 0.4);
  });

  it("passes 0 through when the bells are off, rather than falling back to 1", async () => {
    // 0 is a real choice, not a missing value - a `?? 1` that treated it as
    // absent would turn the bells back on for the one user who muted them.
    mockPreferences.data = { bellVolume: 0 };
    renderWithProviders(<MeditationSitScreen />);

    expect(mockPlayOneShot).toHaveBeenLastCalledWith(expect.anything(), 0);
  });

  it("rings at full volume until the preference has loaded", async () => {
    // The query resolves after first paint, and the start bell does not wait.
    renderWithProviders(<MeditationSitScreen />);

    expect(mockPlayOneShot).toHaveBeenLastCalledWith(expect.anything(), 1);
  });

  it("rings half-time at the midpoint, at a minute no spacing list could hold", async () => {
    // 25-minute sit: half is 12.5 minutes = 750 seconds. This is the case that
    // made half-time a mode rather than a fifth entry in [0, 5, 10, 15] - the
    // integer route param would have dropped the .5 on the floor (#1189).
    mockParams.duration = "25";
    mockParams.bell = "half";
    renderWithProviders(<MeditationSitScreen />);
    mockPlayOneShot.mockClear(); // drop the start bell

    await advance(749_000);
    expect(mockPlayOneShot).not.toHaveBeenCalled();

    await advance(1_250);
    expect(mockPlayOneShot).toHaveBeenCalledTimes(1);
  });

  it("rings half-time exactly once, never again before the end", async () => {
    // "A single quiet chime" (meditation-tmi.md:472). The next boundary is the
    // sit's own end, where the end bell plays instead.
    mockParams.duration = "12";
    mockParams.bell = "half";
    renderWithProviders(<MeditationSitScreen />);
    mockPlayOneShot.mockClear();

    await advance(6 * 60_000 + 250);
    expect(mockPlayOneShot).toHaveBeenCalledTimes(1);

    await advance(5 * 60_000);
    expect(mockPlayOneShot).toHaveBeenCalledTimes(1);
  });

  it("says the bell is at half-time rather than naming a minute", async () => {
    mockParams.duration = "25";
    mockParams.bell = "half";
    renderWithProviders(<MeditationSitScreen />);

    expect(screen.getByText("of 25 min · bell at half-time")).toBeTruthy();
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

  it("holds a finished sit until the stage query settles, then saves the real stage", async () => {
    // Reopening the app onto a sit that ran out in the background races the
    // program-state query: the first tick notices the sit is over before the
    // stage has loaded, and saving at that instant would permanently record
    // stage 1 for a stage 2-10 user (Codex P2 on #850).
    mockProgramState.data = undefined;
    mockProgramState.isFetched = false;
    const view = renderWithProviders(<MeditationSitScreen />);

    act(() => {
      jest.setSystemTime(new Date(START_AT.getTime() + 40 * 60_000));
    });
    await advance(250);
    expect(mockSaveMutateAsync).not.toHaveBeenCalled();

    mockProgramState.data = { currentStage: 7 };
    mockProgramState.isFetched = true;
    view.rerender(<MeditationSitScreen />);
    await act(async () => {});

    expect(mockSaveMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ stageAtSession: 7, durationMinutes: 12 }),
    );
  });

  it("keeps counting after a transient blur and refocus", async () => {
    // A route pushed above this screen blurs it WITHOUT unmounting: the focus
    // cleanup stops the interval, and refocus must resubscribe it - phase and
    // paused are unchanged, so nothing else would (Codex P2 on #850). The sit
    // itself restarts: unsaved time is discarded on blur, as breathing decided.
    renderWithProviders(<MeditationSitScreen />);
    await advance(3 * 60_000);

    act(() => {
      focusHandle.cleanup?.();
    });
    act(() => {
      focusHandle.cleanup = (focusHandle.callback?.() as (() => void) | undefined) ?? null;
    });
    await advance(60_000);

    expect(screen.getByText("11:00")).toBeTruthy();
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
