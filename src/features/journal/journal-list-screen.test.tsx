import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import JournalListScreen from "@/src/features/journal/journal-list-screen";
import {
  useJournalEntries,
  useJournalWritingBuckets,
  useJournalWordTotal,
} from "@/src/features/journal/queries";
import type { JournalEntry } from "@/src/features/journal/types";
import { lastNDayKeys } from "@/src/utils/date";
import { renderWithProviders } from "@/test/render-with-providers";
import { setPlatformOS } from "@/test/modal-marker-mock";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    canGoBack: jest.fn(() => false),
  },
  usePathname: () => "/tools/journal",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/components/app/screen-breadcrumb", () => ({ ScreenBreadcrumb: () => null }));
jest.mock("@/src/features/settings/queries", () => ({
  useUserPreferences: () => ({ data: undefined }),
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
    expect(screen.getByText("nothing journaled yet")).toBeTruthy();

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

  /**
   * The control for the pair below: with nothing read there is nothing to keep,
   * and the error line plus its retry is the honest answer.
   */
  it("says the writing chart could not be read when nothing has been read", () => {
    mockEntries([journalEntry("today", "2026-05-28")]);
    mockUseJournalWritingBuckets.mockReturnValue({
      data: undefined,
      isError: true,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useJournalWritingBuckets>);

    renderWithProviders(<JournalListScreen />);

    expect(screen.getByText("Couldn't load the writing chart.")).toBeTruthy();
    expect(screen.getByText("Retry")).toBeTruthy();
  });

  /**
   * ☠️☠️ **A failed refetch is not a failed read.** `isError` is the query's
   * status, and query-core sets it on any failed fetch whether or not `data` is
   * already there - which is why TanStack derives `isRefetchError` from
   * `isError && hasData` at all. `journalKeys.all` is invalidated on every entry
   * save, so a failed post-save re-read, or an ordinary refetch past the 60s
   * `staleTime`, replaced a drawn chart with an error line. The buckets are in
   * the cache and on the server. Same predicate mistake as #2253's.
   */
  it("keeps the drawn writing chart when a refetch over it fails", () => {
    mockEntries([journalEntry("today", "2026-05-28")]);
    mockUseJournalWritingBuckets.mockReturnValue({
      data: [
        {
          startDayKey: "2026-05-28",
          endDayKey: "2026-05-28",
          wordCount: 120,
          unit: "day" as const,
          rangeStartDayKey: "2026-05-28",
          rangeEndDayKey: "2026-05-28",
        },
      ],
      isError: true,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useJournalWritingBuckets>);

    renderWithProviders(<JournalListScreen />);

    expect(screen.getAllByTestId("bar-chart-bar")).toHaveLength(1);
    expect(screen.queryByText("Couldn't load the writing chart.")).toBeNull();
  });

  /**
   * ☠️☠️ **An offline arrival is a read that never started, not one still
   * running.** `networkMode: "online"` means the query never fires, never errors
   * and sits at `isPending` true / `isPaused` true, so "no data and no error"
   * parked it on a spinner forever with the retry beside it in a branch that
   * never rendered - on a screen whose other content comes from the cache, so
   * the section read as broken rather than as offline. #2237's conjunct.
   */
  it("offers the retry instead of an endless spinner when the read never started", () => {
    mockEntries([journalEntry("today", "2026-05-28")]);
    mockUseJournalWritingBuckets.mockReturnValue({
      data: undefined,
      isPending: true,
      isPaused: true,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useJournalWritingBuckets>);

    renderWithProviders(<JournalListScreen />);

    expect(screen.getByText("Couldn't load the writing chart.")).toBeTruthy();
    expect(screen.getByText("Retry")).toBeTruthy();
    expect(screen.queryByTestId("journal-writing-loading")).toBeNull();
  });

  /**
   * The other side of the conjunct: an ordinary online first load is still a
   * spinner, not an error about a connection that is fine.
   */
  it("still spins while a read that did start is in flight", () => {
    mockEntries([journalEntry("today", "2026-05-28")]);
    mockUseJournalWritingBuckets.mockReturnValue({
      data: undefined,
      isPending: true,
      isPaused: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useJournalWritingBuckets>);

    renderWithProviders(<JournalListScreen />);

    expect(screen.getByTestId("journal-writing-loading")).toBeTruthy();
    expect(screen.queryByText("Couldn't load the writing chart.")).toBeNull();
  });

  /**
   * ADR-0009 clause 2. What stood here was that spinner in a `py-8` box, shorter than the
   * chart it stood in for, so the entries list below - every card a tap target - rose
   * while the buckets were in flight and dropped back as they landed.
   *
   * ⚠️ jest cannot see the height: NativeWind resolves no padding or width into
   * `props.style`, so an assertion about the reserved size would be vacuously green
   * (`item-card.tsx`, and ADR-0009's Enforcement section). What it CAN see is that the
   * space is held by the chart's own columns rather than by a spinner alone, that the
   * columns are the ones the selected range will land, and that none of it is drawn or
   * read out. The columns-per-range half is `journal-writing-chart.test.tsx`'s.
   */
  it("holds the chart's space while the read is in flight, rather than collapsing it", () => {
    mockEntries([journalEntry("today", "2026-05-28")]);
    mockUseJournalWritingBuckets.mockReturnValue({
      data: undefined,
      isPending: true,
      isPaused: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useJournalWritingBuckets>);

    renderWithProviders(<JournalListScreen />);

    expect(screen.getByTestId("journal-writing-reservation")).toBeTruthy();
    // The default range's thirty columns, held and hidden: nothing visible, nothing
    // announced, and no claim that thirty days of writing are on their way.
    expect(screen.getAllByTestId("bar-chart-bar", { includeHiddenElements: true })).toHaveLength(
      30,
    );
    expect(screen.queryByText("Words written per day.")).toBeNull();
    expect(screen.queryByText("No writing in this range.")).toBeNull();
    // And the list the reservation exists for is still under it.
    expect(screen.getByText("Entries")).toBeTruthy();
  });

  /**
   * The other half of the same rule: the reservation belongs to the PENDING state, not to
   * the slot (ADR-0009, edge 1). A read that failed, or never started, has its answer
   * already - the error line and its retry - and holding a chart's height above it would
   * be reserving for something that is not coming.
   */
  it("reserves nothing once the read has failed or never started", () => {
    mockEntries([journalEntry("today", "2026-05-28")]);
    for (const query of [
      { data: undefined, isError: true },
      { data: undefined, isPending: true, isPaused: true },
    ]) {
      mockUseJournalWritingBuckets.mockReturnValue({
        ...query,
        refetch: jest.fn(),
      } as unknown as ReturnType<typeof useJournalWritingBuckets>);

      const tree = renderWithProviders(<JournalListScreen />);

      expect(screen.getByText("Couldn't load the writing chart.")).toBeTruthy();
      expect(screen.queryByTestId("journal-writing-reservation")).toBeNull();
      expect(
        screen.queryAllByTestId("bar-chart-bar", { includeHiddenElements: true }),
      ).toHaveLength(0);
      tree.unmount();
    }
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

  /**
   * react-native-web hands a `link`'s Enter to the browser, expecting a native
   * anchor - and this href-less Pressable is a `<div role="link">` the browser
   * does nothing with, so Tab reached the all-entries link and Enter opened nothing (#1735).
   * The link brings its own Enter handler: once per press, never on auto-repeat,
   * never on Space (a link does not activate on Space) - and never on a button,
   * which react-native-web activates itself; a second handler there would fire
   * the press twice.
   *
   * ⚠️ jest can only prove the handler is there. The browser half - a real Enter
   * on a real `<div role="link">` - is proven once for the helper itself, on the
   * support page's Show-all door, in `test/e2e/support-page.e2e.test.ts`.
   */
  describe("the all-entries link on web", () => {
    beforeEach(() => {
      setPlatformOS("web");
    });

    afterEach(() => {
      setPlatformOS("ios");
    });

    it("activates on Enter, once, and not on a held key or on Space; no button brings a handler", () => {
      mockEntries([journalEntry("today", "2026-05-28")]);

      renderWithProviders(<JournalListScreen />);

      const door = screen.getByRole("link", { name: "Show all entries" });
      const preventDefault = jest.fn();
      door.props.onKeyDown({ key: "Enter", repeat: false, preventDefault });
      expect(mockRouter.push).toHaveBeenCalledTimes(1);
      expect(mockRouter.push).toHaveBeenCalledWith("/tools/journal/entries");
      expect(preventDefault).toHaveBeenCalledTimes(1);

      door.props.onKeyDown({ key: "Enter", repeat: true, preventDefault });
      door.props.onKeyDown({ key: " ", repeat: false, preventDefault });
      expect(mockRouter.push).toHaveBeenCalledTimes(1);

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
      for (const button of buttons) {
        expect(button.props.onKeyDown).toBeUndefined();
      }
    });
  });
});
