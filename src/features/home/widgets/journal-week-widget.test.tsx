import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { JournalWeekWidget } from "@/src/features/home/widgets/journal-week-widget";
import {
  useJournalEntries,
  useJournalEntryCount,
  useJournalWordTotal,
} from "@/src/features/journal/queries";
import { currentDateKey, useSelectedDate } from "@/src/stores/selected-date-store";
import { renderWithProviders } from "@/test/render-with-providers";
import { entryDayKey } from "@/src/lib/occurrence-time";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

jest.mock("@/src/features/journal/queries", () => ({
  useJournalEntries: jest.fn(),
  useJournalEntryCount: jest.fn(() => ({ data: undefined })),
  useJournalWordTotal: jest.fn(() => ({ data: undefined })),
}));

jest.mock("@/src/stores/selected-date-store", () => {
  const actual = jest.requireActual("@/src/stores/selected-date-store");
  return { ...actual, useSelectedDate: jest.fn() };
});

const mockRouter = jest.mocked(router);
const mockUseJournalEntries = useJournalEntries as jest.MockedFunction<typeof useJournalEntries>;
const mockUseJournalEntryCount = useJournalEntryCount as jest.MockedFunction<
  typeof useJournalEntryCount
>;
const mockUseJournalWordTotal = useJournalWordTotal as jest.MockedFunction<
  typeof useJournalWordTotal
>;
const mockUseSelectedDate = useSelectedDate as jest.MockedFunction<typeof useSelectedDate>;

function entry(createdAt: string, body: string) {
  return {
    id: `e-${createdAt}`,
    userId: "user-1",
    title: "",
    body,
    occurredAt: createdAt,
    occurredOffsetMinutes: null,
    dayKey: entryDayKey(createdAt, null),
    createdAt,
    updatedAt: createdAt,
  };
}

describe("JournalWeekWidget", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelectedDate.mockReturnValue({ selectedDate: currentDateKey() });
    mockUseJournalEntryCount.mockReturnValue({ data: undefined } as unknown as ReturnType<
      typeof useJournalEntryCount
    >);
    mockUseJournalWordTotal.mockReturnValue({ data: undefined } as unknown as ReturnType<
      typeof useJournalWordTotal
    >);
  });

  it("renders the Journal header", () => {
    mockUseJournalEntries.mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof useJournalEntries
    >);

    renderWithProviders(<JournalWeekWidget userId="user-1" />);

    expect(screen.getByText("Journal")).toBeTruthy();
  });

  it("falls back to the loaded entries until the server totals arrive", () => {
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

  it("shows the exact lifetime totals rather than the capped list's own figures", () => {
    // The list query is capped at 50, so a heavy writer's entry count and word sum both
    // freeze there; the server totals are the ones the journal hero shows (#323).
    mockUseJournalEntries.mockReturnValue({
      data: Array.from({ length: 50 }, (_, i) =>
        entry(`2026-04-${String((i % 28) + 1).padStart(2, "0")}T12:00:00.000Z`, "alpha beta"),
      ),
    } as unknown as ReturnType<typeof useJournalEntries>);
    mockUseJournalEntryCount.mockReturnValue({ data: 214 } as unknown as ReturnType<
      typeof useJournalEntryCount
    >);
    mockUseJournalWordTotal.mockReturnValue({ data: 9481 } as unknown as ReturnType<
      typeof useJournalWordTotal
    >);

    renderWithProviders(<JournalWeekWidget userId="user-1" />);

    expect(screen.getByText("214")).toBeTruthy();
    expect(screen.getByText("9481")).toBeTruthy();
    expect(screen.queryByText("50")).toBeNull();
    expect(screen.queryByText("100")).toBeNull();
  });

  it("keeps the day badge scoped to the selected day, not the lifetime total", () => {
    mockUseJournalEntries.mockReturnValue({
      data: [entry(new Date().toISOString(), "one two")],
    } as unknown as ReturnType<typeof useJournalEntries>);
    mockUseJournalEntryCount.mockReturnValue({ data: 214 } as unknown as ReturnType<
      typeof useJournalEntryCount
    >);

    renderWithProviders(<JournalWeekWidget userId="user-1" />);

    expect(screen.getByText("1 today")).toBeTruthy();
  });

  it("shows a '{n} today' badge when entries exist for today", () => {
    mockUseJournalEntries.mockReturnValue({
      data: [entry(new Date().toISOString(), "one two"), entry(new Date().toISOString(), "three")],
    } as unknown as ReturnType<typeof useJournalEntries>);

    renderWithProviders(<JournalWeekWidget userId="user-1" />);

    expect(screen.getByText("2 today")).toBeTruthy();
  });

  it("shows a '{n} on {date}' badge for a past selected day", () => {
    mockUseSelectedDate.mockReturnValue({ selectedDate: "2026-05-30" });
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
