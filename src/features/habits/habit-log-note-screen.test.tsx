import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Text as mockText } from "react-native";
import type { ReactNode } from "react";

import { router } from "expo-router";

import { HabitLogNoteScreen } from "@/src/features/habits/habit-log-note-screen";
import { useHabit, useHabitLogs, useUpsertHabitLogNote } from "@/src/features/habits/queries";
import { currentDateKey } from "@/src/features/habits/scheduling";
import type { HabitLog } from "@/src/features/habits/types";
import { renderWithProviders } from "@/test/render-with-providers";
import { expectNeutralRoom } from "@/test/room-pour";

jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    push: jest.fn(),
    replace: jest.fn(),
  },
  usePathname: () => "/tools/habits/h-1/log",
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
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/habits/queries", () => ({
  useHabit: jest.fn(),
  useHabitLogs: jest.fn(),
  useUpsertHabitLogNote: jest.fn(),
}));

const mockUseHabit = useHabit as jest.MockedFunction<typeof useHabit>;
const mockUseHabitLogs = useHabitLogs as jest.MockedFunction<typeof useHabitLogs>;
const mockUseUpsertHabitLogNote = useUpsertHabitLogNote as jest.MockedFunction<
  typeof useUpsertHabitLogNote
>;

const upsertMutateAsync = jest.fn();

function habitLog(overrides: Partial<HabitLog> = {}): HabitLog {
  return {
    id: "log-1",
    userId: "user-1",
    habitId: "h-1",
    loggedOn: currentDateKey(),
    note: "",
    createdAt: "2026-05-01T08:00:00.000Z",
    updatedAt: "2026-05-01T08:00:00.000Z",
    ...overrides,
  };
}

function mockDefaults() {
  mockUseHabit.mockReturnValue({
    data: { id: "h-1", name: "Read" },
    isLoading: false,
  } as unknown as ReturnType<typeof useHabit>);
  mockUseHabitLogs.mockReturnValue({
    data: [],
  } as unknown as ReturnType<typeof useHabitLogs>);
  mockUseUpsertHabitLogNote.mockReturnValue({
    isPending: false,
    mutateAsync: upsertMutateAsync.mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof useUpsertHabitLogNote>);
}

describe("HabitLogNoteScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDefaults();
  });

  it("renders inside the act room - no field gradient", () => {
    renderWithProviders(<HabitLogNoteScreen habitId="h-1" />);

    expect(screen.getByRole("heading", { name: "Add a note" })).toBeTruthy();
    // A translated day, not the raw `YYYY-MM-DD` key this used to print in both
    // locales (#726) - now reachable for past days, since habit detail's notes
    // section is the first thing in the app to pass `?date=`.
    expect(screen.queryByText(`Read · ${currentDateKey()}`)).toBeNull();
    expect(screen.getByText("Read · Today")).toBeTruthy();
    // The wrapper carries the act room re-pour; a wrong or missing room fails here.
    expectNeutralRoom(screen.getByTestId("habit-log-note-room"));
  });

  it("asks for the one day, closed at both ends, so an older note is never missed", () => {
    renderWithProviders(<HabitLogNoteScreen habitId="h-1" dateOverride="2026-06-14" />);

    // ⚠️ It asked `{ sinceDate, limit: 5 }`, and rows come back newest-first -
    // so a day with more than five newer ticks was simply absent from the
    // answer, the field hydrated blank, and saving overwrote the saved note.
    expect(mockUseHabitLogs).toHaveBeenCalledWith("user-1", {
      habitId: "h-1",
      sinceDate: "2026-06-14",
      untilDate: "2026-06-14",
    });
  });

  it("keeps the editor unusable until the day answers", () => {
    // ⚠️ `undefined` is the query in flight, not a day with no note. An enabled
    // field is one hydration is about to overwrite, and an enabled Save upserts
    // the initial empty string over a note that is already stored - which only
    // costs something now that a notes row can open a day that HAS one.
    mockUseHabitLogs.mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useHabitLogs>);

    renderWithProviders(<HabitLogNoteScreen habitId="h-1" dateOverride="2026-06-14" />);

    expect(screen.getByLabelText("Add a note").props.editable).toBe(false);
    fireEvent.press(screen.getByText("Save"));
    expect(upsertMutateAsync).not.toHaveBeenCalled();
  });

  it("hydrates the field from the saved note for the day", () => {
    mockUseHabitLogs.mockReturnValue({
      data: [habitLog({ note: "Ten pages before bed" })],
    } as unknown as ReturnType<typeof useHabitLogs>);

    renderWithProviders(<HabitLogNoteScreen habitId="h-1" />);

    expect(screen.getByDisplayValue("Ten pages before bed")).toBeTruthy();
  });

  it("saves the note and navigates back", async () => {
    renderWithProviders(<HabitLogNoteScreen habitId="h-1" />);

    fireEvent.changeText(screen.getByLabelText("Add a note"), "Felt easy today");
    fireEvent.press(screen.getByText("Save"));

    await waitFor(() => {
      expect(upsertMutateAsync).toHaveBeenCalledWith({
        habitId: "h-1",
        loggedOn: currentDateKey(),
        note: "Felt easy today",
      });
    });
    expect(router.back).toHaveBeenCalled();
  });

  it("saves against the date override when one is provided", async () => {
    renderWithProviders(<HabitLogNoteScreen habitId="h-1" dateOverride="2026-07-20" />);

    fireEvent.press(screen.getByText("Save"));

    await waitFor(() => {
      expect(upsertMutateAsync).toHaveBeenCalledWith({
        habitId: "h-1",
        loggedOn: "2026-07-20",
        note: "",
      });
    });
  });
});
