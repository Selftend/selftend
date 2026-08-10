import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { SectionList } from "react-native";

import JournalHistoryScreen from "@/src/features/journal/journal-history-screen";
import { useJournalEntryPages } from "@/src/features/journal/queries";
import type { JournalEntry } from "@/src/features/journal/types";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  usePathname: () => "/tools/journal/entries",
}));
jest.mock("@/src/components/app/screen-breadcrumb", () => ({ ScreenBreadcrumb: () => null }));
jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));
jest.mock("@/src/features/journal/queries", () => ({ useJournalEntryPages: jest.fn() }));

const mockUseJournalEntryPages = jest.mocked(useJournalEntryPages);
const fetchNextPage = jest.fn();
const refetch = jest.fn();

function entry(dayKey: string, id = dayKey): JournalEntry {
  const occurredAt = `${dayKey}T16:50:00.000Z`;
  return {
    id,
    userId: "user-1",
    title: `Entry ${id}`,
    body: "A few private words.",
    occurredAt,
    occurredOffsetMinutes: 0,
    dayKey,
    createdAt: occurredAt,
    updatedAt: occurredAt,
  };
}

interface PagesState {
  pages?: JournalEntry[][];
  hasNextPage?: boolean;
  isError?: boolean;
  isFetchingNextPage?: boolean;
  isPending?: boolean;
}

function mockPages({
  pages,
  hasNextPage = false,
  isError = false,
  isFetchingNextPage = false,
  isPending = false,
}: PagesState) {
  mockUseJournalEntryPages.mockReturnValue({
    data: pages ? { pages, pageParams: pages.map((_, index) => index * 50) } : undefined,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isPending,
    refetch,
  } as unknown as ReturnType<typeof useJournalEntryPages>);
}

describe("JournalHistoryScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders every loaded page in calendar groups with no aggregate", () => {
    mockPages({
      pages: [[entry("2026-05-28", "first")], [entry("2026-04-20", "second")]],
    });

    renderWithProviders(<JournalHistoryScreen />);

    expect(screen.getByRole("heading", { name: "All entries" })).toBeTruthy();
    expect(screen.getByText("Entry first")).toBeTruthy();
    expect(screen.getByText("Entry second")).toBeTruthy();
    expect(screen.getByText("April 2026")).toBeTruthy();
    expect(screen.queryByText(/entries ·/)).toBeNull();
  });

  it("opens an entry and pages when the list reaches its end", () => {
    mockPages({ pages: [[entry("2026-05-28", "first")]], hasNextPage: true });
    renderWithProviders(<JournalHistoryScreen />);

    fireEvent.press(screen.getByText("Entry first"));
    expect(jest.mocked(router).push).toHaveBeenCalledWith("/tools/journal/first");

    screen.UNSAFE_getByType(SectionList).props.onEndReached();
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("does not queue another page while one is loading", () => {
    mockPages({
      pages: [[entry("2026-05-28")]],
      hasNextPage: true,
      isFetchingNextPage: true,
    });
    renderWithProviders(<JournalHistoryScreen />);

    screen.UNSAFE_getByType(SectionList).props.onEndReached();
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it("only claims emptiness after an empty response", () => {
    mockPages({ isPending: true });
    const pending = renderWithProviders(<JournalHistoryScreen />);
    expect(screen.queryByText("Nothing here yet")).toBeNull();
    pending.unmount();

    mockPages({ pages: [[]] });
    renderWithProviders(<JournalHistoryScreen />);
    expect(screen.getByText("Nothing here yet")).toBeTruthy();
  });

  it("shows a retryable error only when there are no cached pages", () => {
    mockPages({ isError: true });
    const failed = renderWithProviders(<JournalHistoryScreen />);
    expect(screen.getByText("Couldn't load your entries")).toBeTruthy();
    fireEvent.press(screen.getByText("Retry"));
    expect(refetch).toHaveBeenCalledTimes(1);
    failed.unmount();

    mockPages({ pages: [[entry("2026-05-28")]], isError: true });
    renderWithProviders(<JournalHistoryScreen />);
    expect(screen.getByText("Entry 2026-05-28")).toBeTruthy();
    expect(screen.queryByText("Couldn't load your entries")).toBeNull();
  });

  it("keeps the virtualized reading column on contentContainerStyle", () => {
    mockPages({ pages: [[]] });
    renderWithProviders(<JournalHistoryScreen />);

    expect(screen.UNSAFE_getByType(SectionList).props.contentContainerStyle).toEqual({
      flexGrow: 1,
      padding: 16,
      width: "100%",
      maxWidth: 620,
      alignSelf: "center",
    });
  });
});
