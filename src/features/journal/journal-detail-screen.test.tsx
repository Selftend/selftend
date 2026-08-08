import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import JournalDetailScreen from "@/src/features/journal/journal-detail-screen";
import {
  useDeleteJournalEntry,
  useJournalEntries,
  useJournalEntry,
} from "@/src/features/journal/queries";
import { renderWithProviders } from "@/test/render-with-providers";
import { expectNeutralRoom } from "@/test/room-pour";

jest.mock("expo-router", () => ({
  router: {
    canGoBack: jest.fn(() => false),
    push: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({ id: "j-1" })),
  usePathname: () => "/tools/journal/j-1",
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("@/src/features/journal/queries", () => ({
  useDeleteJournalEntry: jest.fn(),
  useJournalEntries: jest.fn(),
  useJournalEntry: jest.fn(),
}));

const mockUseJournalEntries = useJournalEntries as jest.MockedFunction<typeof useJournalEntries>;
const mockUseJournalEntry = useJournalEntry as jest.MockedFunction<typeof useJournalEntry>;
const mockUseDeleteJournalEntry = useDeleteJournalEntry as jest.MockedFunction<
  typeof useDeleteJournalEntry
>;
const mockRouter = jest.mocked(router);

const entry = {
  id: "j-1",
  userId: "user-1",
  title: "Quiet morning",
  body: "Walked outside before work.",
  createdAt: "2026-05-24T08:00:00.000Z",
  updatedAt: "2026-05-24T08:00:00.000Z",
};

describe("JournalDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseJournalEntries.mockReturnValue({
      data: [entry],
    } as unknown as ReturnType<typeof useJournalEntries>);
    mockUseJournalEntry.mockReturnValue({
      data: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useJournalEntry>);
    mockUseDeleteJournalEntry.mockReturnValue({
      isPending: false,
      mutateAsync: jest.fn(),
    } as unknown as ReturnType<typeof useDeleteJournalEntry>);
  });

  it("renders the loaded entry inside the ink room", () => {
    const { UNSAFE_getByType } = renderWithProviders(<JournalDetailScreen />);

    expect(screen.getByText("Quiet morning")).toBeTruthy();
    expect(screen.getByText("Walked outside before work.")).toBeTruthy();
    expect(screen.getByText("When")).toBeTruthy();
    // The root carries the ink room re-pour; a wrong or missing room fails here.
    expectNeutralRoom(UNSAFE_getByType(SafeAreaView));
  });

  it("routes to the edit screen", () => {
    renderWithProviders(<JournalDetailScreen />);

    fireEvent.press(screen.getByText("Edit"));

    expect(mockRouter.push).toHaveBeenCalledWith("/tools/journal/j-1/edit");
  });

  it("deletes the entry and returns to the list after confirming", async () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    mockUseDeleteJournalEntry.mockReturnValue({
      isPending: false,
      mutateAsync,
    } as unknown as ReturnType<typeof useDeleteJournalEntry>);

    renderWithProviders(<JournalDetailScreen />);

    fireEvent.press(screen.getByText("Delete"));
    fireEvent.press(screen.getByTestId("confirm-dialog-confirm"));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith("j-1"));
    expect(mockRouter.replace).toHaveBeenCalledWith("/tools/journal");
  });

  it("shows the not-found state on the room pour when the entry is missing", () => {
    mockUseJournalEntries.mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof useJournalEntries
    >);

    const { UNSAFE_getByType } = renderWithProviders(<JournalDetailScreen />);

    expect(screen.getByText("We couldn't find that journal entry.")).toBeTruthy();
    expectNeutralRoom(UNSAFE_getByType(SafeAreaView));
  });

  it("shows the loading state on the room pour while fetching", () => {
    mockUseJournalEntries.mockReturnValue({ data: undefined } as unknown as ReturnType<
      typeof useJournalEntries
    >);
    mockUseJournalEntry.mockReturnValue({
      data: null,
      isLoading: true,
    } as unknown as ReturnType<typeof useJournalEntry>);

    const { UNSAFE_getByType } = renderWithProviders(<JournalDetailScreen />);

    expectNeutralRoom(UNSAFE_getByType(SafeAreaView));
  });
});
