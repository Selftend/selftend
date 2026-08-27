import { fireEvent, screen, waitFor, within } from "@testing-library/react-native";

import { BreathingExerciseEditorScreen } from "@/src/features/breathing/breathing-exercise-editor-screen";
import { BREATHING_EXERCISE_COLOR_CHOICES } from "@/src/features/breathing/exercise-types";
import { TIMING_SEGMENT_CLASSES } from "@/src/features/breathing/phase-timing-bar";
import { renderWithProviders } from "@/test/render-with-providers";

const mockSave = jest.fn().mockResolvedValue({ id: "e-1" });
const mockBack = jest.fn();

let mockList: unknown[] = [];
let mockExisting: unknown = null;

jest.mock("expo-router", () => ({
  router: { canGoBack: () => true, back: () => mockBack(), replace: jest.fn() },
  usePathname: () => "/tools/breathing/new",
}));
jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));
jest.mock("@/src/stores/toast-store", () => ({
  useToastStore: (selector: (s: { showToast: () => void }) => unknown) =>
    selector({ showToast: jest.fn() }),
}));
jest.mock("@/src/features/breathing/exercises-queries", () => ({
  useBreathingExercises: () => ({ data: mockList }),
  useBreathingExercise: () => ({ data: mockExisting, isLoading: false }),
  useSaveBreathingExercise: () => ({ mutateAsync: mockSave, isPending: false }),
  useDeleteBreathingExercise: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

function exercise(over: Record<string, unknown> = {}) {
  return {
    id: "e-1",
    userId: "user-1",
    name: "Evening wind-down",
    inhaleSeconds: 4,
    holdInSeconds: 4,
    exhaleSeconds: 4,
    holdOutSeconds: 4,
    cycles: 8,
    color: "aqua",
    createdAt: "2026-05-01T00:00:00Z",
    updatedAt: "2026-05-01T00:00:00Z",
    ...over,
  };
}

/** The accent swatches alone - the length buttons are radios too. */
function accentRadios() {
  return within(screen.getByTestId("breathing-accent-picker")).getAllByRole("radio");
}

/** The live "{n} per cycle" read-out on the timing label row. */
function cycleLength() {
  return screen.getByTestId("breathing-cycle-length").props.children;
}

describe("New breathing pattern (4d)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockList = [];
    mockExisting = null;
  });

  it("blocks save when the name is blank and shows an error", async () => {
    renderWithProviders(<BreathingExerciseEditorScreen exerciseId={null} />);
    fireEvent.press(screen.getByText("Save"));
    await waitFor(() => expect(screen.getByText("Give your exercise a name.")).toBeTruthy());
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("saves a named pattern with the default timing", async () => {
    renderWithProviders(<BreathingExerciseEditorScreen exerciseId={null} />);
    fireEvent.changeText(screen.getByLabelText("Name"), "Evening wind-down");
    fireEvent.press(screen.getByText("Save"));
    await waitFor(() => expect(mockSave).toHaveBeenCalled());
    expect(mockSave.mock.calls[0][0].input.name).toBe("Evening wind-down");
  });

  describe("the accent palette", () => {
    it("offers exactly the six measured colours, never eight", () => {
      renderWithProviders(<BreathingExerciseEditorScreen exerciseId={null} />);
      // Scoped to the picker: the length buttons are radios too, so an
      // unscoped getAllByRole would count eleven and pass for the wrong reason.
      expect(accentRadios()).toHaveLength(6);
      expect(BREATHING_EXERCISE_COLOR_CHOICES).toHaveLength(6);
    });

    it("never offers primary, the one hue that moves with the theme", () => {
      expect(BREATHING_EXERCISE_COLOR_CHOICES).not.toContain("primary");
    });

    it("keeps exactly one colour checked as the user picks", () => {
      renderWithProviders(<BreathingExerciseEditorScreen exerciseId={null} />);
      fireEvent.press(accentRadios()[2]);

      const checked = within(screen.getByTestId("breathing-accent-picker")).getAllByRole("radio", {
        checked: true,
      });
      expect(checked).toHaveLength(1);
      expect(checked[0]).toBe(accentRadios()[2]);
    });

    it("auto-assigns the first colour the user is not already using", async () => {
      // Two patterns already wear the first two choices, so a third is born the
      // third - not a fourth copy of one colour, which is what shipped before.
      mockList = [exercise({ id: "a", color: "act" }), exercise({ id: "b", color: "clay" })];
      renderWithProviders(<BreathingExerciseEditorScreen exerciseId={null} />);
      fireEvent.changeText(screen.getByLabelText("Name"), "Third");
      fireEvent.press(screen.getByText("Save"));

      await waitFor(() => expect(mockSave).toHaveBeenCalled());
      expect(mockSave.mock.calls[0][0].input.color).toBe(BREATHING_EXERCISE_COLOR_CHOICES[2]);
    });

    it("keeps an accent the user picked before the pattern list arrived", async () => {
      // The form is interactive while the list is in flight. A tap that lands
      // first must win: auto-assignment is a convenience, not an override.
      mockList = undefined as unknown as unknown[];
      const view = renderWithProviders(<BreathingExerciseEditorScreen exerciseId={null} />);
      fireEvent.press(accentRadios()[4]);
      const chosen = BREATHING_EXERCISE_COLOR_CHOICES[4];

      // The list resolves afterwards, and would otherwise seed over the choice.
      mockList = [];
      view.rerender(<BreathingExerciseEditorScreen exerciseId={null} />);

      fireEvent.changeText(screen.getByLabelText("Name"), "Mine");
      fireEvent.press(screen.getByText("Save"));
      await waitFor(() => expect(mockSave).toHaveBeenCalled());
      expect(mockSave.mock.calls[0][0].input.color).toBe(chosen);
    });

    it("grandfathers a retired colour as a seventh swatch, already selected", async () => {
      // `rose` is a legal stored value the picker no longer offers. Editing must
      // show it rather than silently reassign it on the next save.
      mockList = [exercise({ color: "rose" })];
      renderWithProviders(<BreathingExerciseEditorScreen exerciseId="e-1" />);

      expect(accentRadios()).toHaveLength(7);

      const checked = within(screen.getByTestId("breathing-accent-picker")).getAllByRole("radio", {
        checked: true,
      });
      expect(checked).toHaveLength(1);
      expect(checked[0]).toBe(accentRadios()[0]);

      fireEvent.press(screen.getByText("Save"));
      await waitFor(() => expect(mockSave).toHaveBeenCalled());
      expect(mockSave.mock.calls[0][0].input.color).toBe("rose");
    });
  });

  describe("the timing row", () => {
    it("collapses a zero-length phase out of the preview", () => {
      // Coherent breathing is 5.5 / 0 / 5.5 / 0 - two of its four phases do not
      // exist, so the bar must draw two segments, not four with two slivers.
      mockList = [
        exercise({ inhaleSeconds: 5.5, holdInSeconds: 0, exhaleSeconds: 5.5, holdOutSeconds: 0 }),
      ];
      renderWithProviders(<BreathingExerciseEditorScreen exerciseId="e-1" />);

      const bar = screen.getByTestId("breathing-timing-bar");
      expect(bar.props.children.filter(Boolean)).toHaveLength(2);
    });

    it("steps a phase in half-seconds and updates the cycle length live", () => {
      renderWithProviders(<BreathingExerciseEditorScreen exerciseId={null} />);
      // Default is 4/4/4/4: four equal steppers, 16s per cycle.
      expect(screen.getAllByText("4s")).toHaveLength(4);
      expect(cycleLength()).toBe("0:16 per cycle");

      // The stepper value is the assertion for the half-second increment;
      // `cycleLength` is whole seconds (formatClock rounds), so a 16.5s cycle
      // reads "0:17" and could not distinguish a half step from a whole one.
      fireEvent.press(screen.getByLabelText("Inhale +"));
      expect(screen.getByText("4.5s")).toBeTruthy();
      expect(cycleLength()).toBe("0:17 per cycle");

      fireEvent.press(screen.getByLabelText("Inhale −"));
      fireEvent.press(screen.getByLabelText("Inhale −"));
      expect(screen.getByText("3.5s")).toBeTruthy();
    });

    it("clamps a phase at zero rather than going negative", () => {
      mockList = [
        exercise({ inhaleSeconds: 0.5, holdInSeconds: 0, exhaleSeconds: 4, holdOutSeconds: 0 }),
      ];
      renderWithProviders(<BreathingExerciseEditorScreen exerciseId="e-1" />);

      fireEvent.press(screen.getByLabelText("Inhale −"));
      fireEvent.press(screen.getByLabelText("Inhale −"));
      expect(cycleLength()).toBe("0:04 per cycle");
    });

    it("does not silently rewrite a phase longer than the stepper's ceiling", () => {
      // Storage allows 60s; the stepper only steps up to 12. A pattern saved
      // with a 20s phase must not drop to 12 on one tap of `+`.
      mockList = [
        exercise({ inhaleSeconds: 20, holdInSeconds: 0, exhaleSeconds: 0, holdOutSeconds: 0 }),
      ];
      renderWithProviders(<BreathingExerciseEditorScreen exerciseId="e-1" />);

      expect(screen.getByText("20s")).toBeTruthy();
      // `+` is inert above the ceiling - it must not snap 20 down to 12.
      fireEvent.press(screen.getByLabelText("Inhale +"));
      expect(screen.getByText("20s")).toBeTruthy();
      // `−` still walks it back down.
      fireEvent.press(screen.getByLabelText("Inhale −"));
      expect(screen.getByText("19.5s")).toBeTruthy();
    });

    it("keeps each phase's own identity in the preview", () => {
      // PhaseTimingBar weights a segment by its label - inhale and exhale carry
      // the accent at two strengths, holds are neutral. Collapsing exhale to
      // "hold" would paint the authoring screen's exhale as a hold. Asserted on
      // className, because NativeWind classes never become styles under jest.
      mockList = [
        exercise({ inhaleSeconds: 4, holdInSeconds: 2, exhaleSeconds: 6, holdOutSeconds: 1 }),
      ];
      renderWithProviders(<BreathingExerciseEditorScreen exerciseId="e-1" />);

      const segments = screen
        .getByTestId("breathing-timing-bar")
        .props.children.filter(Boolean) as { props: { className?: string } }[];
      expect(segments).toHaveLength(4);

      const cls = (i: number) => segments[i].props.className;
      expect(cls(0)).toBe(TIMING_SEGMENT_CLASSES.strong);
      expect(cls(2)).toBe(TIMING_SEGMENT_CLASSES.soft);
      expect(cls(1)).toBe(TIMING_SEGMENT_CLASSES.neutral);
      expect(cls(3)).toBe(TIMING_SEGMENT_CLASSES.neutral);
    });

    it("populates all four phases from a preset, dropping zeros from its label", () => {
      renderWithProviders(<BreathingExerciseEditorScreen exerciseId={null} />);
      // Coherent's chip reads "5.5-5.5", not "5.5-0-5.5-0".
      fireEvent.press(screen.getByText("5.5-5.5"));
      expect(cycleLength()).toBe("0:11 per cycle");
    });
  });

  describe("default length", () => {
    it("derives the cycle count from the minute target and the pattern's cycle", () => {
      renderWithProviders(<BreathingExerciseEditorScreen exerciseId={null} />);
      // 4/4/4/4 = 16s per cycle; a 2-minute target is 120/16 ≈ 8 cycles.
      fireEvent.press(screen.getByLabelText("2 min"));
      expect(screen.getByText(/8 cycles/)).toBeTruthy();

      // Same target against a longer cycle gives fewer cycles, which is the
      // whole point of picking minutes rather than cycles.
      fireEvent.press(screen.getByText("4-7-8"));
      fireEvent.press(screen.getByLabelText("2 min"));
      expect(screen.getByText(/6 cycles/)).toBeTruthy();
    });

    it("says the length can be changed at the start of every session", () => {
      renderWithProviders(<BreathingExerciseEditorScreen exerciseId={null} />);
      expect(
        screen.getByText("You can change the length each time you start a session."),
      ).toBeTruthy();
    });
  });
});
