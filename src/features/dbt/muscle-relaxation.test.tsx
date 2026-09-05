import { act, fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import DbtMuscleRelaxationScreen from "./dbt-muscle-relaxation-screen";
import {
  FULL_GROUPS,
  RELEASE_SECONDS,
  ROUNDS_PER_GROUP,
  SHORT_GROUPS,
  TENSE_SECONDS,
  buildSteps,
  groupStartSeconds,
  plannedSeconds,
  sessionStateAt,
} from "./muscle-relaxation-plan";
import { useSaveDbtSession } from "@/src/features/dbt/queries";
import enDbt from "@/src/i18n/locales/en/dbt.json";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  usePathname: () => "/modules/dbt/sessions/muscle-relaxation",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/dbt/queries", () => ({
  useSaveDbtSession: jest.fn(),
}));

const saveAsync = jest.fn().mockResolvedValue({});

beforeEach(() => {
  jest.clearAllMocks();
  (useSaveDbtSession as unknown as jest.Mock).mockReturnValue({
    mutateAsync: saveAsync,
    isPending: false,
  });
});

// ---------------------------------------------------------------------------
// The schedule, on its own. Pure, so it can be asked where the run is without
// mounting a clock - which is the reason it lives apart from the screen.
// ---------------------------------------------------------------------------
describe("the muscle relaxation schedule", () => {
  it("runs twelve groups for twelve minutes, and five for five", () => {
    expect(FULL_GROUPS).toHaveLength(12);
    expect(SHORT_GROUPS).toHaveLength(5);
    expect(plannedSeconds("full")).toBe(12 * 60);
    expect(plannedSeconds("short")).toBe(5 * 60);
  });

  it("tenses briefly and releases for far longer, twice per group", () => {
    const steps = buildSteps("short");
    expect(steps).toHaveLength(SHORT_GROUPS.length * ROUNDS_PER_GROUP * 2);
    expect(steps[0]).toMatchObject({ phase: "tense", round: 1, durationSeconds: TENSE_SECONDS });
    expect(steps[1]).toMatchObject({
      phase: "release",
      round: 1,
      durationSeconds: RELEASE_SECONDS,
    });
    // The letting go is the part that does the work, so it gets the time.
    expect(RELEASE_SECONDS).toBeGreaterThan(TENSE_SECONDS);
  });

  it("answers where the run is from elapsed seconds alone", () => {
    const steps = buildSteps("short");

    expect(sessionStateAt(steps, 0)).toMatchObject({
      done: false,
      groupNumber: 1,
      stepRemainingSeconds: TENSE_SECONDS,
    });
    // Four seconds in: still tensing, one second left of it.
    expect(sessionStateAt(steps, 4)).toMatchObject({ groupNumber: 1, stepRemainingSeconds: 1 });
    // Six seconds in: releasing.
    expect(sessionStateAt(steps, 6)?.step?.phase).toBe("release");
    // One group is sixty seconds, so sixty-one is the second group.
    expect(sessionStateAt(steps, 61).groupNumber).toBe(2);
  });

  /**
   * ☠️ A tick that arrives late - a backgrounded app, a slow frame - must land
   * on the right beat rather than advancing by one. That is the whole reason
   * the schedule takes elapsed time instead of counting steps.
   */
  it("lands on the right beat when time jumps rather than advancing by one", () => {
    const steps = buildSteps("full");
    const jumped = sessionStateAt(steps, 300);

    expect(jumped.groupNumber).toBe(6);
    expect(jumped.totalRemainingSeconds).toBe(12 * 60 - 300);
  });

  it("is done at the planned length, and stays done past it", () => {
    const steps = buildSteps("short");

    expect(sessionStateAt(steps, 300).done).toBe(true);
    expect(sessionStateAt(steps, 10_000).done).toBe(true);
    expect(sessionStateAt(steps, 10_000).totalRemainingSeconds).toBe(0);
  });

  it("knows where each group starts, which is what Back and Next hop to", () => {
    const steps = buildSteps("short");

    expect(groupStartSeconds(steps, 0)).toBe(0);
    expect(groupStartSeconds(steps, 1)).toBe(60);
    expect(groupStartSeconds(steps, 4)).toBe(240);
  });

  it("gives every group in both variants a name in the copy", () => {
    for (const group of [...FULL_GROUPS, ...SHORT_GROUPS]) {
      expect((enDbt.session.groups as Record<string, string>)[group]).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// The screen.
// ---------------------------------------------------------------------------
describe("the muscle relaxation session", () => {
  it("puts the caution above Start, always visible and never a question", () => {
    renderWithProviders(<DbtMuscleRelaxationScreen />);

    expect(screen.getByTestId("technique-caution")).toBeTruthy();
    expect(screen.getByText(/Tense gently, never to the point of pain/)).toBeTruthy();
    // ☠️ S5: caution copy tells. It never asks, gates, or records an answer.
    for (const line of enDbt.session.caution) {
      expect(line).not.toMatch(/\?/);
      expect(line).not.toMatch(/\bdo you\b|\bhave you\b|confirm|I understand/i);
    }
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("offers the two lengths and says what each costs", () => {
    renderWithProviders(<DbtMuscleRelaxationScreen />);

    expect(screen.getByText("Full")).toBeTruthy();
    expect(screen.getByText("Short")).toBeTruthy();
    expect(screen.getByText("12 groups, about 12 minutes.")).toBeTruthy();

    fireEvent.press(screen.getByText("Short"));
    expect(screen.getByText("5 groups, about 5 minutes.")).toBeTruthy();
  });

  it("carries the crisis bar on the intro and on the run", () => {
    renderWithProviders(<DbtMuscleRelaxationScreen />);
    expect(screen.getByLabelText("Not for emergencies · Crisis resources")).toBeTruthy();

    fireEvent.press(screen.getByText("Start"));
    expect(screen.getByLabelText("Not for emergencies · Crisis resources")).toBeTruthy();
  });

  it("opens on the first group, tensing", () => {
    renderWithProviders(<DbtMuscleRelaxationScreen />);
    fireEvent.press(screen.getByText("Start"));

    expect(screen.getByText("Hands")).toBeTruthy();
    expect(screen.getByText("Tense")).toBeTruthy();
    expect(screen.getByText("Group 1 of 12 · 12:00 left")).toBeTruthy();
  });

  /**
   * ☠️ **The departure from every other session in the app.** Grounding,
   * breathing and meditation save a partial row on Finish early and answer the
   * back gesture with a finish-or-continue dialog (#928). This one saves
   * NOTHING on Stop, asks nothing, and says so on screen before the press.
   */
  it("stops without saving, without a dialog, and says so before the press", () => {
    renderWithProviders(<DbtMuscleRelaxationScreen />);
    fireEvent.press(screen.getByText("Start"));

    expect(screen.getByText("Stop ends it now. Nothing is saved.")).toBeTruthy();

    fireEvent.press(screen.getByText("Stop"));

    expect(saveAsync).not.toHaveBeenCalled();
    expect(router.back).toHaveBeenCalled();
    expect(screen.queryByText(/are you sure|finish early|continue/i)).toBeNull();
  });

  it("pauses without saving either, and says that too", () => {
    renderWithProviders(<DbtMuscleRelaxationScreen />);
    fireEvent.press(screen.getByText("Start"));
    fireEvent.press(screen.getByText("Pause"));

    expect(screen.getByText("A paused clock saves nothing either.")).toBeTruthy();
    expect(screen.getByText("Resume")).toBeTruthy();
    expect(saveAsync).not.toHaveBeenCalled();
  });

  it("moves between groups with Back and Next, and cannot walk off either end", () => {
    renderWithProviders(<DbtMuscleRelaxationScreen />);
    fireEvent.press(screen.getByText("Start"));

    expect(screen.getByText("Back")).toBeDisabled();

    fireEvent.press(screen.getByText("Next"));
    expect(screen.getByText("Forearms")).toBeTruthy();
    expect(screen.getByText("Group 2 of 12 · 11:00 left")).toBeTruthy();

    fireEvent.press(screen.getByText("Back"));
    expect(screen.getByText("Hands")).toBeTruthy();
  });

  it("records the finished session once, on completion, with its captured offset", async () => {
    jest.useFakeTimers();
    try {
      renderWithProviders(<DbtMuscleRelaxationScreen />);
      fireEvent.press(screen.getByText("Short"));
      fireEvent.press(screen.getByText("Start"));

      await act(async () => {
        jest.advanceTimersByTime(5 * 60 * 1000 + 500);
      });

      expect(saveAsync).toHaveBeenCalledTimes(1);
      expect(saveAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionSlug: "muscle-relaxation",
          variant: "short",
          durationSeconds: 300,
          completedOffsetMinutes: expect.any(Number),
        }),
      );
      // No `stepsCompleted`: a row here means a finished session and nothing else.
      expect(saveAsync.mock.calls[0][0]).not.toHaveProperty("stepsCompleted");
      expect(screen.getByText("Muscle relaxation, 5 minutes")).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it("states the record on the done screen and asks for nothing else", async () => {
    jest.useFakeTimers();
    try {
      renderWithProviders(<DbtMuscleRelaxationScreen />);
      fireEvent.press(screen.getByText("Short"));
      fireEvent.press(screen.getByText("Start"));
      await act(async () => {
        jest.advanceTimersByTime(5 * 60 * 1000 + 500);
      });

      expect(screen.getByText("Done")).toBeTruthy();
      // No rating, no "how do you feel now" - the record is stated and that is all.
      expect(screen.queryByText(/how (do|did) you feel|rate|out of 10/i)).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });
});
