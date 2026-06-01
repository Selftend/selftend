import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { JournalWeekWidget } from "@/src/features/home/widgets/journal-week-widget";
import { useJournalEntries } from "@/src/features/journal/queries";
import { currentDateKey, useSelectedDate } from "@/src/stores/selected-date-store";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

jest.mock("@/src/features/journal/queries", () => ({
  useJournalEntries: jest.fn(),
}));

jest.mock("@/src/stores/selected-date-store", () => {
  const actual = jest.requireActual("@/src/stores/selected-date-store");
  return { ...actual, useSelectedDate: jest.fn() };
});

const mockRouter = jest.mocked(router);
const mockUseJournalEntries = useJournalEntries as jest.MockedFunction<typeof useJournalEntries>;
const mockUseSelectedDate = useSelectedDate as jest.MockedFunction<typeof useSelectedDate>;

function entry(createdAt: string, body: string) {
  return {
    id: `e-${createdAt}`,
    userId: "user-1",
    title: "",
    body,
    createdAt,
    updatedAt: createdAt,
  };
}

describe("JournalWeekWidget", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelectedDate.mockReturnValue({ selectedDate: currentDateKey(), isToday: true });
  });

  it("renders the Journal header", () => {
    mockUseJournalEntries.mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof useJournalEntries
    >);

    renderWithProviders(<JournalWeekWidget userId="user-1" />);

    expect(screen.getByText("Journal")).toBeTruthy();
  });

  it("shows all-time totals, not just the last 7 days", () => {
    mockUseJournalEntries.mockReturnValue({
      data: [
        entry("2026-04-01T12:00:00.000Z", "alpha beta"),
        entry(new Date().toISOString(), "gamma"),
      ],
    } as unknown as ReturnType<typeof useJournalEntries>);

    renderWithProviders(<JournalWeekWidget userId="user-1" />);

    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("shows a '{n} today' badge when entries exist for today", () => {
    mockUseJournalEntries.mockReturnValue({
      data: [entry(new Date().toISOString(), "one two"), entry(new Date().toISOString(), "three")],
    } as unknown as ReturnType<typeof useJournalEntries>);

    renderWithProviders(<JournalWeekWidget userId="user-1" />);

    expect(screen.getByText("2 today")).toBeTruthy();
  });

  it("shows a '{n} on {date}' badge for a past selected day", () => {
    mockUseSelectedDate.mockReturnValue({ selectedDate: "2026-05-30", isToday: false });
    mockUseJournalEntries.mockReturnValue({
      data: [entry("2026-05-30T12:00:00.000Z", "past entry")],
    } as unknown as ReturnType<typeof useJournalEntries>);

    renderWithProviders(<JournalWeekWidget userId="user-1" />);

    expect(screen.getByText("1 on May 30")).toBeTruthy();
  });

  it("hides the badge when the selected day has no entries", () => {
    mockUseJournalEntries.mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof useJournalEntries
    >);

    renderWithProviders(<JournalWeekWidget userId="user-1" />);

    expect(screen.queryByText(/today/)).toBeNull();
    expect(screen.queryByText(/ on /)).toBeNull();
  });

  it("routes Write and Open", () => {
    mockUseJournalEntries.mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof useJournalEntries
    >);

    renderWithProviders(<JournalWeekWidget userId="user-1" />);

    fireEvent.press(screen.getByText("Write"));
    expect(mockRouter.push).toHaveBeenCalledWith("/tools/journal/new");
    fireEvent.press(screen.getByText("Open"));
    expect(mockRouter.push).toHaveBeenCalledWith("/tools/journal");
  });
});
