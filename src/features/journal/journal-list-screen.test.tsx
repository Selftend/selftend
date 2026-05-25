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

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("@/src/features/journal/queries", () => ({
  useJournalEntries: jest.fn(),
}));

jest.mock("@/src/stores/selected-date-store", () => ({
  useSelectedDate: jest.fn(() => ({ selectedDate: "2026-05-24", isToday: true })),
  toLocalDateKey: (iso: string) => iso.slice(0, 10),
}));

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

    expect(screen.getByText("Journal")).toBeTruthy();
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
          createdAt: "2026-05-24T08:00:00.000Z",
          updatedAt: "2026-05-24T08:00:00.000Z",
        },
      ],
    } as unknown as ReturnType<typeof useJournalEntries>);

    renderWithProviders(<JournalListScreen />);

    expect(screen.getByText("Quiet morning")).toBeTruthy();
    expect(screen.getByText("Walked outside")).toBeTruthy();
    expect(screen.getByText("Recent entries")).toBeTruthy();
  });

  it("falls back to 'Untitled' when title is empty", () => {
    mockUseJournalEntries.mockReturnValue({
      data: [
        {
          id: "j-2",
          userId: "user-1",
          title: "",
          body: "Just a quick thought.",
          createdAt: "2026-05-24T09:00:00.000Z",
          updatedAt: "2026-05-24T09:00:00.000Z",
        },
      ],
    } as unknown as ReturnType<typeof useJournalEntries>);

    renderWithProviders(<JournalListScreen />);

    expect(screen.getByText("Untitled")).toBeTruthy();
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
