import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import GratitudeListScreen from "@/src/features/gratitude/gratitude-list-screen";
import { useGratitudeEntries } from "@/src/features/gratitude/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    canGoBack: jest.fn(() => false),
  },
  usePathname: () => "/tools/gratitude-log",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("@/src/stores/selected-date-store", () => ({
  useSelectedDate: () => ({ selectedDate: "2026-05-24", isToday: true }),
}));

jest.mock("@/src/features/gratitude/queries", () => ({
  useGratitudeEntries: jest.fn(),
}));

const mockUseGratitudeEntries = useGratitudeEntries as jest.MockedFunction<
  typeof useGratitudeEntries
>;
const mockRouter = jest.mocked(router);

describe("GratitudeListScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the empty state when there are no entries", () => {
    mockUseGratitudeEntries.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useGratitudeEntries>);

    renderWithProviders(<GratitudeListScreen />);

    expect(screen.getByText("Gratitude")).toBeTruthy();
    expect(screen.getByText("Nothing here yet")).toBeTruthy();
    expect(screen.getByText("Notice something")).toBeTruthy();
  });

  it("renders entries with first item, count, and note", () => {
    mockUseGratitudeEntries.mockReturnValue({
      data: [
        {
          id: "g-1",
          userId: "user-1",
          level: 3,
          items: ["Warm coffee", "Sunlight"],
          events: [],
          goodMoment: "",
          missIfGone: "",
          hiddenGood: "",
          lifeItems: [],
          starred: false,
          note: "The morning felt steady.",
          loggedAt: "2026-05-24T08:00:00.000Z",
          createdAt: "2026-05-24T08:00:00.000Z",
          updatedAt: "2026-05-24T08:00:00.000Z",
        },
      ],
    } as unknown as ReturnType<typeof useGratitudeEntries>);

    renderWithProviders(<GratitudeListScreen />);

    expect(screen.getByText("Warm coffee")).toBeTruthy();
    expect(screen.getByText("2 things")).toBeTruthy();
    expect(screen.getByText("The morning felt steady.")).toBeTruthy();
    expect(screen.getByText("Recent entries")).toBeTruthy();
  });

  it("routes to /tools/gratitude-log/new when the CTA is pressed", () => {
    mockUseGratitudeEntries.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useGratitudeEntries>);

    renderWithProviders(<GratitudeListScreen />);

    fireEvent.press(screen.getByText("New entry"));

    expect(mockRouter.push).toHaveBeenCalledWith("/tools/gratitude-log/new");
  });
});
