import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import JournalListScreen from "@/src/features/journal/journal-list-screen";
import {
  useJournalEntries,
  useJournalWritingBuckets,
  useJournalWordTotal,
} from "@/src/features/journal/queries";
import type { JournalEntry } from "@/src/features/journal/types";
import { lastNDayKeys } from "@/src/utils/date";
import { renderWithProviders } from "@/test/render-with-providers";
import { expectNeutralRoom } from "@/test/room-pour";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    canGoBack: jest.fn(() => false),
  },
  usePathname: () => "/tools/journal",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/components/app/screen-breadcrumb", () => ({ ScreenBreadcrumb: () => null }));
jest.mock("@/src/components/app/notification-settings-modal", () => ({
  NotificationSettingsModal: () => null,
}));
jest.mock("@/src/components/app/add-to-home-button", () => ({ AddToHomeButton: () => null }));
jest.mock("@/src/features/settings/queries", () => ({
  useUserPreferences: () => ({ data: undefined }),
  useUpdateShownButtonTours: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));
jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));
jest.mock("@/src/features/journal/queries", () => ({
  useJournalEntries: jest.fn(),
  useJournalEntryCount: jest.fn(() => ({ data: undefined })),
  useJournalWritingBuckets: jest.fn(() => ({ data: [] })),
  useJournalWordTotal: jest.fn(() => ({ data: undefined })),
}));

const FIXED_NOW = new Date("2026-05-28T12:00:00.000Z");
beforeAll(() => jest.useFakeTimers({ now: FIXED_NOW }));
afterAll(() => jest.useRealTimers());

const mockUseJournalEntries = jest.mocked(useJournalEntries);
const mockUseJournalWordTotal = jest.mocked(useJournalWordTotal);
const mockUseJournalWritingBuckets = jest.mocked(useJournalWritingBuckets);
const mockRouter = jest.mocked(router);

function journalEntry(
  id: string,
  dayKey: string,
  overrides: Partial<JournalEntry> = {},
): JournalEntry {
  const occurredAt = `${dayKey}T08:00:00.000Z`;
  return {
    id,
    userId: "user-1",
    title: "Entry",
    body: "Just writing.",
    occurredAt,
    occurredOffsetMinutes: 0,
    dayKey,
    createdAt: occurredAt,
    updatedAt: occurredAt,
    ...overrides,
  };
}

function mockEntries(data: JournalEntry[] | undefined) {
  mockUseJournalEntries.mockReturnValue({ data } as unknown as ReturnType<
    typeof useJournalEntries
  >);
}

describe("JournalListScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseJournalWordTotal.mockReturnValue({ data: undefined } as unknown as ReturnType<
      typeof useJournalWordTotal
    >);
    mockUseJournalWritingBuckets.mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof useJournalWritingBuckets
    >);
  });

  it("renders the empty state only after an empty history loads", () => {
    mockEntries([]);
    renderWithProviders(<JournalListScreen />);

    expect(screen.getByRole("heading", { name: "Journal" })).toBeTruthy();
    expect(screen.getByText("Nothing here yet")).toBeTruthy();
    expect(screen.getByText("Start writing")).toBeTruthy();
    expect(screen.getByText("Nothing journaled yet")).toBeTruthy();

    mockEntries(undefined);
    renderWithProviders(<JournalListScreen />);
    expect(screen.queryByText("Nothing here yet")).toBeNull();
    expect(screen.queryByText(/^last written /)).toBeNull();
  });

  it("shows only five recent entries in captured-day groups with no partial group totals", () => {
    mockEntries([
      journalEntry("today", "2026-05-28", { title: "Morning pages" }),
      journalEntry("week", "2026-05-25", { title: "Quiet afternoon" }),
      journalEntry("month-1", "2026-05-01", { title: "Old entry" }),
      journalEntry("month-2", "2026-04-20", { title: "Fourth entry" }),
      journalEntry("month-3", "2026-04-19", { title: "Fifth entry" }),
      journalEntry("omitted", "2026-03-01", { title: "Sixth entry" }),
    ]);

    renderWithProviders(<JournalListScreen />);

    expect(screen.getByText("Entries")).toBeTruthy();
    expect(screen.getByText("Today")).toBeTruthy();
    expect(screen.getByText("Earlier this week")).toBeTruthy();
    expect(screen.getByText("May 2026")).toBeTruthy();
    expect(screen.getByText("April 2026")).toBeTruthy();
    expect(screen.getByText("Morning pages")).toBeTruthy();
    expect(screen.getByText("Fifth entry")).toBeTruthy();
    expect(screen.queryByText("Sixth entry")).toBeNull();
    expect(screen.queryByText(/entries ·/)).toBeNull();
  });

  it("renders an untitled entry with a one-line preview", () => {
    mockEntries([
      journalEntry("untitled", "2026-05-28", {
        title: "",
        body: "Walked outside\nFelt better after coffee.",
      }),
    ]);

    renderWithProviders(<JournalListScreen />);

    expect(screen.getByText("Untitled")).toBeTruthy();
    expect(screen.getByText("Walked outside")).toBeTruthy();
  });

  it("splits stat values from labels and states the latest loaded activity with a time", () => {
    mockUseJournalWordTotal.mockReturnValue({ data: 421 } as unknown as ReturnType<
      typeof useJournalWordTotal
    >);
    mockEntries([
      journalEntry("backdated", "2026-05-27", {
        updatedAt: "2026-05-22T08:00:00.000Z",
      }),
      journalEntry("recent", "2026-05-10", {
        updatedAt: "2026-05-28T11:00:00.000Z",
      }),
    ]);

    renderWithProviders(<JournalListScreen />);

    expectNeutralRoom(screen.UNSAFE_getByType(SafeAreaView));
    const stats = screen.getAllByTestId("module-header-stat");
    expect(stats).toHaveLength(3);
    expect(screen.getByText("421 words")).toBeTruthy();
    expect(screen.getByText(/^last written Today, /)).toBeTruthy();
    expect(screen.queryByText(/^last written Yesterday, /)).toBeNull();
  });

  it("renders an exact thirty-day default chart with visible zero-day stubs", () => {
    mockEntries([journalEntry("today", "2026-05-28")]);
    const days = lastNDayKeys(30, FIXED_NOW).map((dayKey, index, all) => ({
      startDayKey: dayKey,
      endDayKey: dayKey,
      wordCount: index === 13 ? 120 : 0,
      unit: "day" as const,
      rangeStartDayKey: all[0]!,
      rangeEndDayKey: all[all.length - 1]!,
    }));
    mockUseJournalWritingBuckets.mockReturnValue({ data: days } as unknown as ReturnType<
      typeof useJournalWritingBuckets
    >);

    renderWithProviders(<JournalListScreen />);

    expect(screen.getByText("Writing")).toBeTruthy();
    expect(screen.getByText("Words written per day.")).toBeTruthy();
    expect(screen.getAllByTestId("bar-chart-bar")).toHaveLength(30);
    expect(screen.getAllByTestId("bar-chart-bar")[0]).toHaveStyle({ height: 2 });
    expect(screen.getByLabelText(/120 words/)).toBeTruthy();
  });

  it("offers four phone-safe ranges and leaves Custom out", () => {
    mockEntries([journalEntry("today", "2026-05-28")]);
    renderWithProviders(<JournalListScreen />);

    expect(screen.getByText("7d")).toBeTruthy();
    expect(screen.getByText("30d")).toBeTruthy();
    expect(screen.getByText("90d")).toBeTruthy();
    expect(screen.getByText("All time")).toBeTruthy();
    expect(screen.queryByText("Custom")).toBeNull();
  });

  it("keeps the writing section and its control when the selected range is empty", () => {
    mockEntries([journalEntry("old", "2025-01-01")]);
    mockUseJournalWritingBuckets.mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof useJournalWritingBuckets
    >);

    renderWithProviders(<JournalListScreen />);

    expect(screen.getByText("Writing")).toBeTruthy();
    expect(screen.getByText("No writing in this range.")).toBeTruthy();
    expect(screen.getByText("30d")).toBeTruthy();
  });

  it("routes the primary and all-entries actions", () => {
    mockEntries([journalEntry("today", "2026-05-28")]);
    renderWithProviders(<JournalListScreen />);

    fireEvent.press(screen.getByText("New entry"));
    expect(mockRouter.push).toHaveBeenCalledWith("/tools/journal/new");

    fireEvent.press(screen.getByText("Show all entries"));
    expect(mockRouter.push).toHaveBeenCalledWith("/tools/journal/entries");
  });
});
