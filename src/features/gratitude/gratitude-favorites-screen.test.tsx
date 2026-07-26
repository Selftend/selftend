import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import GratitudeFavoritesScreen from "@/src/features/gratitude/gratitude-favorites-screen";
import { useFavoriteGratitudeEntries } from "@/src/features/gratitude/queries";
import type { GratitudeEntry } from "@/src/features/gratitude/types";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    canGoBack: jest.fn(() => false),
    push: jest.fn(),
  },
  usePathname: () => "/tools/gratitude-log/favorites",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/components/app/screen-breadcrumb", () => ({ ScreenBreadcrumb: () => null }));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("@/src/features/gratitude/queries", () => ({
  useFavoriteGratitudeEntries: jest.fn(),
}));

const mockUseFavoriteGratitudeEntries = useFavoriteGratitudeEntries as jest.MockedFunction<
  typeof useFavoriteGratitudeEntries
>;
const mockRouter = jest.mocked(router);

function favoriteEntry(overrides: Partial<GratitudeEntry> = {}): GratitudeEntry {
  return {
    id: "g-1",
    userId: "user-1",
    level: 3,
    items: ["Morning walk"],
    note: "",
    loggedAt: "2026-07-20T09:00:00.000Z",
    createdAt: "2026-07-20T09:00:00.000Z",
    updatedAt: "2026-07-20T09:00:00.000Z",
    events: [],
    goodMoment: "",
    missIfGone: "",
    hiddenGood: "",
    lifeItems: [],
    starred: true,
    ...overrides,
  };
}

describe("GratitudeFavoritesScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the empty state on the room pour - no field gradient", () => {
    mockUseFavoriteGratitudeEntries.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useFavoriteGratitudeEntries>);

    renderWithProviders(<GratitudeFavoritesScreen />);

    expect(screen.getByRole("heading", { name: "Favorite moments" })).toBeTruthy();
    expect(screen.queryByTestId("module-field-gradient")).toBeNull();
  });

  it("routes to the entry detail when a favorite row is pressed", () => {
    mockUseFavoriteGratitudeEntries.mockReturnValue({
      data: [favoriteEntry()],
    } as unknown as ReturnType<typeof useFavoriteGratitudeEntries>);

    renderWithProviders(<GratitudeFavoritesScreen />);

    fireEvent.press(screen.getByText("Morning walk"));

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: "/tools/gratitude-log/[id]",
      params: { id: "g-1" },
    });
  });
});
