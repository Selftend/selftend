import { fireEvent, screen } from "@testing-library/react-native";

import { JournalWeekWidget } from "@/src/features/home/widgets/journal-week-widget";
import { useJournalEntries } from "@/src/features/journal/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

jest.mock("@/src/features/journal/queries", () => ({
  useJournalEntries: jest.fn(),
}));

const { router } = require("expo-router") as { router: { push: jest.Mock } };
const mockUseJournalEntries = useJournalEntries as jest.MockedFunction<typeof useJournalEntries>;

function entry(body: string) {
  return {
    id: `e-${body.length}`,
    userId: "user-1",
    title: "",
    body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("JournalWeekWidget", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the Journal header and this-week stats", () => {
    mockUseJournalEntries.mockReturnValue({
      data: [entry("one two three"), entry("four five")],
    } as unknown as ReturnType<typeof useJournalEntries>);

    renderWithProviders(<JournalWeekWidget userId="user-1" />);

    expect(screen.getByText("Journal")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy(); // entries
    expect(screen.getByText("5")).toBeTruthy(); // words (3 + 2)
  });

  it("shows zero stats when there are no entries", () => {
    mockUseJournalEntries.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useJournalEntries>);

    renderWithProviders(<JournalWeekWidget userId="user-1" />);

    expect(screen.getByText("Journal")).toBeTruthy();
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(2);
  });

  it("routes Write to the new-entry screen and Open to the journal list", () => {
    mockUseJournalEntries.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useJournalEntries>);

    renderWithProviders(<JournalWeekWidget userId="user-1" />);

    fireEvent.press(screen.getByText("Write"));
    expect(router.push).toHaveBeenCalledWith("/tools/journal/new");

    fireEvent.press(screen.getByText("Open"));
    expect(router.push).toHaveBeenCalledWith("/tools/journal");
  });
});
