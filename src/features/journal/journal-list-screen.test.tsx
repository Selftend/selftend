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
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("@/src/features/journal/queries", () => ({
  useJournalEntries: jest.fn(),
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
