import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import JournalListScreen from "@/src/features/journal/journal-list-screen";
import { useJournalEntries } from "@/src/features/journal/queries";
import { renderWithProviders } from "@/test/render-with-providers";

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
const mockRouter = jest.mocked(router);

describe("JournalListScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it("routes to /tools/journal/new when the CTA is pressed", () => {
    mockUseJournalEntries.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useJournalEntries>);

    renderWithProviders(<JournalListScreen />);

    fireEvent.press(screen.getByText("New entry"));

    expect(mockRouter.push).toHaveBeenCalledWith("/tools/journal/new");
  });
});
