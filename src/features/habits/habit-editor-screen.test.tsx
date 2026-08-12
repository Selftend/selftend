import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Text as mockText } from "react-native";
import type { ReactNode } from "react";

import { HabitEditorScreen } from "@/src/features/habits/habit-editor-screen";
import { useHabit, useHabits, useSaveHabit } from "@/src/features/habits/queries";
import type { Habit } from "@/src/features/habits/types";
import { renderWithProviders } from "@/test/render-with-providers";
import { expectNeutralRoom } from "@/test/room-pour";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => false),
  },
  usePathname: () => "/tools/habits/new",
}));

jest.mock("@/src/components/react-native-reusables/label", () => {
  const Text = mockText;

  return {
    Label: ({ children, onPress }: { children?: ReactNode; onPress?: () => void }) => (
      <Text onPress={onPress}>{children}</Text>
    ),
  };
});

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("@/src/features/habits/queries", () => ({
  useHabit: jest.fn(),
  useHabits: jest.fn(),
  useSaveHabit: jest.fn(),
}));

const mockUseHabit = useHabit as jest.MockedFunction<typeof useHabit>;
const mockUseHabits = useHabits as jest.MockedFunction<typeof useHabits>;
const mockUseSaveHabit = useSaveHabit as jest.MockedFunction<typeof useSaveHabit>;

const existingHabit: Habit = {
  id: "h-9",
  userId: "user-1",
  name: "Morning walk",
  kind: "build",
  identity: "",
  cuePlan: "",
  stackAfter: "",
  cravingPairing: "",
  twoMinuteVersion: "",
  rewardNote: "",
  cadence: "daily",
  customDays: [],
  color: "primary",
  archivedAt: null,
  createdAt: "2026-05-01T08:00:00.000Z",
  updatedAt: "2026-05-01T08:00:00.000Z",
};

describe("HabitEditorScreen", () => {
  const saveHabit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHabits.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useHabits>);
    mockUseHabit.mockReturnValue({ data: null, isLoading: false } as unknown as ReturnType<
      typeof useHabit
    >);
    mockUseSaveHabit.mockReturnValue({
      mutateAsync: saveHabit,
      isPending: false,
    } as unknown as ReturnType<typeof useSaveHabit>);
    saveHabit.mockResolvedValue({ id: "h-1" });
  });

  it("create mode renders the top bar on the room pour", () => {
    renderWithProviders(<HabitEditorScreen fallbackHref="/tools/habits" mode="create" />);

    expect(screen.getByText("New habit")).toBeTruthy();
    // The wrapper carries the act room re-pour; a wrong or missing room fails here.
    expectNeutralRoom(screen.getByTestId("habit-editor-room"));
  });

  it("edit mode renders the top bar on the room pour too", () => {
    mockUseHabits.mockReturnValue({ data: [existingHabit] } as unknown as ReturnType<
      typeof useHabits
    >);

    renderWithProviders(
      <HabitEditorScreen fallbackHref="/tools/habits" mode="edit" habitId="h-9" />,
    );

    expect(screen.getByText("Edit habit")).toBeTruthy();
    expectNeutralRoom(screen.getByTestId("habit-editor-room"));
    expect(screen.getByDisplayValue("Morning walk")).toBeTruthy();
  });

  it("creates a habit and routes to its detail page", async () => {
    renderWithProviders(<HabitEditorScreen fallbackHref="/tools/habits" mode="create" />);

    fireEvent.changeText(screen.getByLabelText("Habit name"), "Morning walk");
    fireEvent.press(screen.getByText("Save"));

    await waitFor(() =>
      expect(saveHabit).toHaveBeenCalledWith({
        input: expect.objectContaining({ name: "Morning walk", cadence: "daily" }),
        habitId: undefined,
      }),
    );
  });

  it("saves exactly once when Save is pressed twice rapidly", async () => {
    renderWithProviders(<HabitEditorScreen fallbackHref="/tools/habits" mode="create" />);

    fireEvent.changeText(screen.getByLabelText("Habit name"), "Morning walk");
    // isPending has not re-rendered between the two presses, so only the
    // single-flight guard stands between the double-press and two inserts.
    fireEvent.press(screen.getByText("Save"));
    fireEvent.press(screen.getByText("Save"));

    await waitFor(() => expect(saveHabit).toHaveBeenCalled());
    expect(saveHabit).toHaveBeenCalledTimes(1);
  });

  it("shows an inline error next to the name field and does not save when the name is empty", async () => {
    renderWithProviders(<HabitEditorScreen fallbackHref="/tools/habits" mode="create" />);

    fireEvent.press(screen.getByText("Save"));

    expect(await screen.findByText("Give the habit a short name.")).toBeTruthy();
    expect(saveHabit).not.toHaveBeenCalled();
  });

  it("exposes the kind chips as radios with a checked state", () => {
    renderWithProviders(<HabitEditorScreen fallbackHref="/tools/habits" mode="create" />);

    // `kind` moved to the head of the disclosure (#760), so it is behind the
    // trigger rather than on the first screenful.
    fireEvent.press(screen.getByTestId("habit-details-disclosure"));

    expect(screen.getByRole("radio", { name: "Build", checked: true })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Break", checked: false })).toBeTruthy();

    fireEvent.press(screen.getByRole("radio", { name: "Break" }));

    expect(screen.getByRole("radio", { name: "Break", checked: true })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Build", checked: false })).toBeTruthy();
  });

  /**
   * Four prompts become three, and the refinements fold away (#760).
   */
  describe("the details disclosure", () => {
    it("keeps identity and kind out of the first screenful, and opens them on demand", () => {
      renderWithProviders(<HabitEditorScreen fallbackHref="/tools/habits" mode="create" />);

      // Above the fold: name, the two-minute version, cadence, colour.
      expect(screen.getByLabelText("Habit name")).toBeTruthy();
      expect(screen.getByLabelText("Two-minute version (Make It Easy)")).toBeTruthy();
      expect(screen.queryByLabelText("Identity (optional)")).toBeNull();
      expect(screen.queryByRole("radio", { name: "Build" })).toBeNull();

      fireEvent.press(screen.getByTestId("habit-details-disclosure"));

      expect(screen.getByLabelText("Identity (optional)")).toBeTruthy();
      expect(screen.getByRole("radio", { name: "Build" })).toBeTruthy();
    });

    it("asks for the two-minute version once, not once above the fold and again as Response", () => {
      renderWithProviders(<HabitEditorScreen fallbackHref="/tools/habits" mode="create" />);
      fireEvent.press(screen.getByTestId("habit-details-disclosure"));

      // Response IS the two-minute version; the form used to be able to ask for
      // both. Three prompts remain inside: cue, pairing, reward.
      expect(screen.getAllByLabelText("Two-minute version (Make It Easy)")).toHaveLength(1);
      expect(screen.getByLabelText("Cue plan (Make It Obvious)")).toBeTruthy();
      expect(screen.getByLabelText("Pairing (Make It Attractive)")).toBeTruthy();
      expect(screen.getByLabelText("Reward (Make It Satisfying)")).toBeTruthy();
    });

    it("labels itself differently for a build habit and a break habit", () => {
      renderWithProviders(<HabitEditorScreen fallbackHref="/tools/habits" mode="create" />);

      expect(screen.getByText("More options for building this")).toBeTruthy();

      fireEvent.press(screen.getByTestId("habit-details-disclosure"));
      fireEvent.press(screen.getByRole("radio", { name: "Break" }));

      expect(screen.getByText("More options for breaking this")).toBeTruthy();
      expect(screen.queryByText("More options for building this")).toBeNull();
    });

    it("auto-expands in edit for a break habit, whose whole form is relabelled", () => {
      mockUseHabits.mockReturnValue({
        data: [{ ...existingHabit, kind: "break" }],
      } as unknown as ReturnType<typeof useHabits>);

      renderWithProviders(
        <HabitEditorScreen fallbackHref="/tools/habits" mode="edit" habitId="h-9" />,
      );

      // Opening folded would show "Friction" where the user expects
      // "Two-minute version", with nothing on screen explaining why.
      expect(screen.getByRole("radio", { name: "Break", checked: true })).toBeTruthy();
      expect(screen.getByLabelText("Friction (Make It Difficult)")).toBeTruthy();
    });

    it("lets the user fold an auto-expanded section back up and keeps it folded", () => {
      mockUseHabits.mockReturnValue({
        data: [{ ...existingHabit, kind: "break" }],
      } as unknown as ReturnType<typeof useHabits>);

      renderWithProviders(
        <HabitEditorScreen fallbackHref="/tools/habits" mode="edit" habitId="h-9" />,
      );

      fireEvent.press(screen.getByTestId("habit-details-disclosure"));

      // The auto-expand is a default, not a lock: the user's own toggle
      // outranks it, and a later refetch may not re-open the section.
      expect(screen.queryByRole("radio", { name: "Break" })).toBeNull();
    });

    it("stays folded in edit for a build habit", () => {
      mockUseHabits.mockReturnValue({ data: [existingHabit] } as unknown as ReturnType<
        typeof useHabits
      >);

      renderWithProviders(
        <HabitEditorScreen fallbackHref="/tools/habits" mode="edit" habitId="h-9" />,
      );

      expect(screen.queryByRole("radio", { name: "Build" })).toBeNull();
    });
  });

  describe("stack_after", () => {
    it("is absent from the create form entirely", () => {
      renderWithProviders(<HabitEditorScreen fallbackHref="/tools/habits" mode="create" />);
      fireEvent.press(screen.getByTestId("habit-details-disclosure"));

      // It is the one prompt that asks a brand-new user to name a habit they
      // have not entered yet.
      expect(screen.queryByLabelText("Stack after (Make It Obvious)")).toBeNull();
    });

    it("is absent in edit when the habit does not hold one", () => {
      mockUseHabits.mockReturnValue({ data: [existingHabit] } as unknown as ReturnType<
        typeof useHabits
      >);

      renderWithProviders(
        <HabitEditorScreen fallbackHref="/tools/habits" mode="edit" habitId="h-9" />,
      );
      fireEvent.press(screen.getByTestId("habit-details-disclosure"));

      expect(screen.queryByLabelText("Stack after (Make It Obvious)")).toBeNull();
    });

    it("survives in edit where the habit already holds one, and stays after it is cleared", () => {
      mockUseHabits.mockReturnValue({
        data: [{ ...existingHabit, stackAfter: "After coffee" }],
      } as unknown as ReturnType<typeof useHabits>);

      renderWithProviders(
        <HabitEditorScreen fallbackHref="/tools/habits" mode="edit" habitId="h-9" />,
      );
      fireEvent.press(screen.getByTestId("habit-details-disclosure"));

      const field = screen.getByLabelText("Stack after (Make It Obvious)");
      expect(field.props.value).toBe("After coffee");

      // Keyed on the stored value, so clearing it cannot make the field vanish
      // and strand the user with no way to type the text back.
      fireEvent.changeText(field, "");
      expect(screen.getByLabelText("Stack after (Make It Obvious)")).toBeTruthy();
    });
  });

  describe("field caps", () => {
    it("enforces every cap in the form rather than failing at save (#722)", () => {
      renderWithProviders(<HabitEditorScreen fallbackHref="/tools/habits" mode="create" />);
      fireEvent.press(screen.getByTestId("habit-details-disclosure"));

      expect(screen.getByLabelText("Habit name").props.maxLength).toBe(120);
      expect(screen.getByLabelText("Identity (optional)").props.maxLength).toBe(200);
      expect(screen.getByLabelText("Two-minute version (Make It Easy)").props.maxLength).toBe(200);
      expect(screen.getByLabelText("Cue plan (Make It Obvious)").props.maxLength).toBe(240);
      expect(screen.getByLabelText("Pairing (Make It Attractive)").props.maxLength).toBe(240);
      expect(screen.getByLabelText("Reward (Make It Satisfying)").props.maxLength).toBe(200);
    });
  });

  it("keeps three-letter weekday labels, which single letters cannot carry in English", () => {
    renderWithProviders(<HabitEditorScreen fallbackHref="/tools/habits" mode="create" />);

    fireEvent.press(screen.getByRole("radio", { name: "Custom" }));

    // Two S and two T: single letters stop being distinguishable.
    for (const day of ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]) {
      expect(screen.getByText(day)).toBeTruthy();
    }
  });

  describe("the day picker", () => {
    it("stays visible under every cadence, unchecked while another cadence holds", () => {
      renderWithProviders(<HabitEditorScreen fallbackHref="/tools/habits" mode="create" />);

      // Cadence is daily; the stored default [Mon..Fri] must not show through
      // as five phantom selections.
      expect(screen.getByRole("checkbox", { name: "Mon", checked: false })).toBeTruthy();
      expect(screen.getByRole("checkbox", { name: "Sat", checked: false })).toBeTruthy();
    });

    it("switches the cadence to custom when a day is tapped (design 9b)", () => {
      renderWithProviders(<HabitEditorScreen fallbackHref="/tools/habits" mode="create" />);

      fireEvent.press(screen.getByRole("checkbox", { name: "Sat" }));

      expect(screen.getByRole("radio", { name: "Custom", checked: true })).toBeTruthy();
      expect(screen.getByRole("checkbox", { name: "Sat", checked: true })).toBeTruthy();
      // The default weekday set survives the switch alongside the tapped day.
      expect(screen.getByRole("checkbox", { name: "Mon", checked: true })).toBeTruthy();
    });

    it("selects a day the latent set already holds instead of toggling it away", () => {
      renderWithProviders(<HabitEditorScreen fallbackHref="/tools/habits" mode="create" />);

      // Monday is in the stored [Mon..Fri] default while cadence is daily, but
      // renders unchecked - the first press must check it, not remove it and
      // activate a Tue-Fri schedule.
      fireEvent.press(screen.getByRole("checkbox", { name: "Mon" }));

      expect(screen.getByRole("radio", { name: "Custom", checked: true })).toBeTruthy();
      expect(screen.getByRole("checkbox", { name: "Mon", checked: true })).toBeTruthy();
    });
  });

  /**
   * The offered palette (#764). Six colours, and the three retired ones stay reachable
   * for a habit that already stores them.
   */
  describe("the colour picker", () => {
    it("offers six colours, and none of the retired ones, for a new habit", () => {
      renderWithProviders(<HabitEditorScreen fallbackHref="/tools/habits" mode="create" />);

      expect(
        screen.getAllByRole("radio", { name: /Green|Clay|Indigo|Aqua|Pink|Violet/ }),
      ).toHaveLength(6);
      expect(screen.queryByRole("radio", { name: "Purple" })).toBeNull();
      expect(screen.queryByRole("radio", { name: "Amber" })).toBeNull();
      expect(screen.queryByRole("radio", { name: "Teal" })).toBeNull();
    });

    it("gives a new habit the first colour nothing else is using", () => {
      mockUseHabits.mockReturnValue({
        data: [{ ...existingHabit, color: "act" }],
      } as unknown as ReturnType<typeof useHabits>);

      renderWithProviders(<HabitEditorScreen fallbackHref="/tools/habits" mode="create" />);

      // 'act' (Green) is taken, so the next offered colour is 'rose' (Clay).
      expect(screen.getByRole("radio", { name: "Clay", checked: true })).toBeTruthy();
    });

    /**
     * ⚠️ undefined is the query still in flight, not an empty list. Saving while it is
     * pending would commit the head of the palette even though an existing habit may
     * already hold it.
     */
    it("does not let a cold-opened create form save before the habit list resolves", () => {
      mockUseHabits.mockReturnValue({ data: undefined } as unknown as ReturnType<typeof useHabits>);

      renderWithProviders(<HabitEditorScreen fallbackHref="/tools/habits" mode="create" />);
      fireEvent.changeText(screen.getByLabelText("Habit name"), "Morning walk");
      fireEvent.press(screen.getByText("Save"));

      expect(saveHabit).not.toHaveBeenCalled();
    });

    it("keeps a stored retired colour reachable after switching away from it", () => {
      mockUseHabits.mockReturnValue({ data: [existingHabit] } as unknown as ReturnType<
        typeof useHabits
      >);

      renderWithProviders(
        <HabitEditorScreen fallbackHref="/tools/habits" mode="edit" habitId="h-9" />,
      );

      // The habit stores 'primary' (Purple), which is retired but still offered to it.
      expect(screen.getByRole("radio", { name: "Purple", checked: true })).toBeTruthy();

      fireEvent.press(screen.getByRole("radio", { name: "Green" }));

      // An accidental tap must be undoable without leaving the form.
      expect(screen.getByRole("radio", { name: "Purple", checked: false })).toBeTruthy();
    });
  });
});
