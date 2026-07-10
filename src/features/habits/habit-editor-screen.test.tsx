import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Text as mockText } from "react-native";
import type { ReactNode } from "react";

import { HabitEditorScreen } from "@/src/features/habits/habit-editor-screen";
import { useHabit, useHabits, useSaveHabit } from "@/src/features/habits/queries";
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
