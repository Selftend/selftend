import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import JournalListScreen from "@/src/features/journal/journal-list-screen";
import { useJournalEntries, useJournalWordTotal } from "@/src/features/journal/queries";
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

jest.mock("@/src/components/app/add-to-home-button", () => ({
  AddToHomeButton: () => null,
}));

jest.mock("@/src/features/settings/queries", () => ({
  useUserPreferences: () => ({ data: undefined }),
  useUpdateShownButtonTours: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("@/src/features/journal/queries", () => ({
  useJournalEntries: jest.fn(),
  useJournalEntryCount: jest.fn(() => ({ data: undefined })),
  useJournalWordTotal: jest.fn(() => ({ data: undefined })),
}));

// Pin "now" so groupByPeriod buckets are deterministic.
const FIXED_NOW = new Date("2026-05-28T12:00:00.000Z");
beforeAll(() => {
  jest.useFakeTimers({ now: FIXED_NOW });
});
afterAll(() => {
  jest.useRealTimers();
});

const mockUseJournalEntries = useJournalEntries as jest.MockedFunction<typeof useJournalEntries>;
const mockUseJournalWordTotal = useJournalWordTotal as jest.MockedFunction<
  typeof useJournalWordTotal
>;
const mockRouter = jest.mocked(router);

function mockWordTotal(data: number | undefined) {
  mockUseJournalWordTotal.mockReturnValue({ data } as unknown as ReturnType<
    typeof useJournalWordTotal
  >);
}

describe("JournalListScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWordTotal(undefined);
  });

  it("renders the empty state when there are no entries", () => {
    mockUseJournalEntries.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useJournalEntries>);

    renderWithProviders(<JournalListScreen />);

    // ModuleHomeHeader renders the title as an h1 heading.
    expect(screen.getByRole("heading", { name: "Journal" })).toBeTruthy();
    expect(screen.getByText("Nothing here yet")).toBeTruthy();
    expect(screen.getByText("Start writing")).toBeTruthy();
    // A loaded, empty history may claim the never state.
    expect(screen.getByText("Nothing journaled yet")).toBeTruthy();
  });

  it("omits the subline until the entries query has actually loaded", () => {
    // `data === undefined` means still loading, or a failed fetch with no cache -
    // claiming "never" there would erase a returning user's real history.
    mockUseJournalEntries.mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useJournalEntries>);

    renderWithProviders(<JournalListScreen />);

    expect(screen.queryByText("Nothing journaled yet")).toBeNull();
    expect(screen.queryByText(/^last journaled /)).toBeNull();
  });

  it("renders entries with title and preview", () => {
    mockUseJournalEntries.mockReturnValue({
      data: [
        {
          id: "j-1",
          userId: "user-1",
          title: "Quiet morning",
          body: "Walked outside\nFelt better after coffee.",
          // 4 days before FIXED_NOW → "earlier this week" section
          createdAt: "2026-05-24T08:00:00.000Z",
          updatedAt: "2026-05-24T08:00:00.000Z",
        },
      ],
    } as unknown as ReturnType<typeof useJournalEntries>);

    renderWithProviders(<JournalListScreen />);

    expect(screen.getByText("Quiet morning")).toBeTruthy();
    expect(screen.getByText("Walked outside")).toBeTruthy();
    // The entry is not on the selected day (today), so it appears under History.
    expect(screen.getByText("History")).toBeTruthy();
  });

  it("lists all entries under a single History section", () => {
    mockUseJournalEntries.mockReturnValue({
      data: [
        {
          id: "j-today",
          userId: "user-1",
          title: "Morning pages",
          body: "Just writing.",
          createdAt: "2026-05-28T08:00:00.000Z",
          updatedAt: "2026-05-28T08:00:00.000Z",
        },
        {
          id: "j-earlier",
          userId: "user-1",
          title: "Quiet afternoon",
          body: "Felt calm.",
          createdAt: "2026-05-25T15:00:00.000Z",
          updatedAt: "2026-05-25T15:00:00.000Z",
        },
        {
          id: "j-older",
          userId: "user-1",
          title: "Old entry",
          body: "From a while ago.",
          createdAt: "2026-05-01T10:00:00.000Z",
          updatedAt: "2026-05-01T10:00:00.000Z",
        },
      ],
    } as unknown as ReturnType<typeof useJournalEntries>);

    renderWithProviders(<JournalListScreen />);

    // Heading from ModuleHomeHeader
    expect(screen.getByRole("heading", { name: "Journal" })).toBeTruthy();
    // Single "History" section header (replaces the old Today/Earlier/Older grouping).
    expect(screen.getByText("History")).toBeTruthy();
    // History lists every entry (the day card may also surface the selected day's
    // entry - that exact duplication is covered deterministically in the day-card
    // unit test; here we only assert each entry is present at least once).
    expect(screen.getAllByText("Morning pages").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Quiet afternoon")).toBeTruthy();
    expect(screen.getByText("Old entry")).toBeTruthy();
  });

  it("falls back to 'Untitled' when title is empty", () => {
    mockUseJournalEntries.mockReturnValue({
      data: [
        {
          id: "j-2",
          userId: "user-1",
          title: "",
          body: "Just a quick thought.",
          createdAt: "2026-05-28T09:00:00.000Z",
          updatedAt: "2026-05-28T09:00:00.000Z",
        },
      ],
    } as unknown as ReturnType<typeof useJournalEntries>);

    renderWithProviders(<JournalListScreen />);

    expect(screen.getAllByText("Untitled").length).toBeGreaterThan(0);
  });

  it("derives the 'Last' hero stat from the most recent updatedAt, not the newest-by-date entry", () => {
    // The list is ordered by created_at desc, but created_at is user-backdatable.
    // The index-0 entry has the newest civil date yet an old updatedAt; a different
    // entry was genuinely authored most recently. "Last" must reflect that activity.
    mockUseJournalEntries.mockReturnValue({
      data: [
        {
          id: "j-backdated",
          userId: "user-1",
          title: "Backdated forward",
          body: "Dated yesterday.",
          createdAt: "2026-05-27T08:00:00.000Z",
          updatedAt: "2026-05-22T08:00:00.000Z",
        },
        {
          id: "j-recent",
          userId: "user-1",
          title: "Just written",
          body: "Authored moments ago.",
          createdAt: "2026-05-10T08:00:00.000Z",
          updatedAt: "2026-05-28T11:00:00.000Z",
        },
      ],
    } as unknown as ReturnType<typeof useJournalEntries>);

    renderWithProviders(<JournalListScreen />);

    // updatedAt max is today (2026-05-28); the index-0 created_at is yesterday.
    expect(screen.getByText("last journaled Today")).toBeTruthy();
    expect(screen.queryByText("last journaled Yesterday")).toBeNull();
  });

  it("renders the ink field header with both stats and the subline on the room pour", () => {
    mockUseJournalEntries.mockReturnValue({
      data: [
        {
          id: "j-1",
          userId: "user-1",
          title: "Quiet morning",
          body: "Five words of journal body.",
          createdAt: "2026-05-24T08:00:00.000Z",
          updatedAt: "2026-05-28T11:00:00.000Z",
        },
      ],
    } as unknown as ReturnType<typeof useJournalEntries>);

    renderWithProviders(<JournalListScreen />);

    // The root carries the ink room re-pour; a wrong or missing room fails here.
    expectNeutralRoom(screen.UNSAFE_getByType(SafeAreaView));
    // The existing two stats + the subline ride on-field unchanged. Counts
    // also appear in the history divider / entry cards, hence getAllByText.
    expect(screen.getAllByText("1 entry").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("5 words").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("last journaled Today")).toBeTruthy();
  });

  it("shows the exact lifetime word total, not the sum over the capped list", () => {
    // The list query is capped at 50 entries, so its word sum silently becomes a
    // "recent 50" figure for heavy writers (#293). The hero must show the server total.
    mockWordTotal(421);
    mockUseJournalEntries.mockReturnValue({
      data: [
        {
          id: "j-1",
          userId: "user-1",
          title: "Quiet morning",
          body: "Five words of journal body.",
          createdAt: "2026-05-24T08:00:00.000Z",
          updatedAt: "2026-05-24T08:00:00.000Z",
        },
        {
          id: "j-2",
          userId: "user-1",
          title: "Quiet evening",
          body: "Five more words in here.",
          createdAt: "2026-05-23T08:00:00.000Z",
          updatedAt: "2026-05-23T08:00:00.000Z",
        },
      ],
    } as unknown as ReturnType<typeof useJournalEntries>);

    renderWithProviders(<JournalListScreen />);

    expect(screen.getByText("421 words")).toBeTruthy();
    // 10 = the capped-list sum; it must not reach the hero.
    expect(screen.queryByText("10 words")).toBeNull();
  });

  it("falls back to the loaded-entries word sum until the lifetime total arrives", () => {
    mockWordTotal(undefined);
    mockUseJournalEntries.mockReturnValue({
      data: [
        {
          id: "j-1",
          userId: "user-1",
          title: "Quiet morning",
          body: "Five words of journal body.",
          createdAt: "2026-05-24T08:00:00.000Z",
          updatedAt: "2026-05-24T08:00:00.000Z",
        },
      ],
    } as unknown as ReturnType<typeof useJournalEntries>);

    renderWithProviders(<JournalListScreen />);

    expect(screen.getAllByText("5 words").length).toBeGreaterThanOrEqual(1);
  });

  it("routes to /tools/journal/new when the CTA is pressed", () => {
    mockUseJournalEntries.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useJournalEntries>);

    renderWithProviders(<JournalListScreen />);

    fireEvent.press(screen.getByText("New entry"));

    expect(mockRouter.push).toHaveBeenCalledWith("/tools/journal/new");
  });
});
