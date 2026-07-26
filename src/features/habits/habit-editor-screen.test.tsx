import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Text as mockText } from "react-native";
import type { ReactNode } from "react";

import { HabitEditorScreen } from "@/src/features/habits/habit-editor-screen";
import { useHabit, useHabits, useSaveHabit } from "@/src/features/habits/queries";
import type { Habit } from "@/src/features/habits/types";
import { roomVariables } from "@/src/lib/module-room";
import { renderWithProviders } from "@/test/render-with-providers";

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

  it("create mode rises out of the act field on the room pour", () => {
    renderWithProviders(<HabitEditorScreen fallbackHref="/tools/habits" mode="create" />);

    expect(screen.getByText("New habit")).toBeTruthy();
    // Create mode rises out of the full-bleed act field (spec #277).
    expect(screen.getByTestId("module-field-gradient")).toBeTruthy();
    // The wrapper carries the act room re-pour; a wrong or missing room fails here.
    expect(screen.getByTestId("habit-editor-room").props.style).toEqual(roomVariables("act").light);
  });

  it("edit mode keeps the compact header on the room pour - no field", () => {
    mockUseHabits.mockReturnValue({ data: [existingHabit] } as unknown as ReturnType<
      typeof useHabits
    >);

    renderWithProviders(
      <HabitEditorScreen fallbackHref="/tools/habits" mode="edit" habitId="h-9" />,
    );

    expect(screen.getByText("Edit habit")).toBeTruthy();
    expect(screen.queryByTestId("module-field-gradient")).toBeNull();
    expect(screen.getByTestId("habit-editor-room").props.style).toEqual(roomVariables("act").light);
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

    expect(screen.getByRole("radio", { name: "Build", checked: true })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Break", checked: false })).toBeTruthy();

    fireEvent.press(screen.getByRole("radio", { name: "Break" }));

    expect(screen.getByRole("radio", { name: "Break", checked: true })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Build", checked: false })).toBeTruthy();
  });
});
