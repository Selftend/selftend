import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { Icon } from "@/src/components/react-native-reusables/icon";
import GratitudeHomeScreen from "@/src/features/gratitude/gratitude-home-screen";
import {
  useFavoriteGratitudeEntryCount,
  useFavoriteGratitudeEntries,
  useGratitudeEntries,
  useGratitudeEntryCount,
  useGratitudeEntryCountSinceDayKey,
} from "@/src/features/gratitude/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    canGoBack: jest.fn(() => false),
    push: jest.fn(),
  },
  usePathname: () => "/tools/gratitude-log",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/components/app/screen-breadcrumb", () => ({ ScreenBreadcrumb: () => null }));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("@/src/features/gratitude/queries", () => ({
  ...jest.requireActual("@/src/features/gratitude/queries"),
  useGratitudeEntries: jest.fn(),
  useGratitudeEntryCount: jest.fn(),
  useFavoriteGratitudeEntryCount: jest.fn(),
  useFavoriteGratitudeEntries: jest.fn(),
  useGratitudeEntryCountSinceDayKey: jest.fn(),
}));

const mockUseGratitudeEntries = useGratitudeEntries as jest.MockedFunction<
  typeof useGratitudeEntries
>;
const mockUseGratitudeEntryCount = useGratitudeEntryCount as jest.MockedFunction<
  typeof useGratitudeEntryCount
>;
const mockUseFavoriteGratitudeEntryCount = useFavoriteGratitudeEntryCount as jest.MockedFunction<
  typeof useFavoriteGratitudeEntryCount
>;
const mockUseFavoriteGratitudeEntries = useFavoriteGratitudeEntries as jest.MockedFunction<
  typeof useFavoriteGratitudeEntries
>;
const mockUseGratitudeEntryCountSinceDayKey =
  useGratitudeEntryCountSinceDayKey as jest.MockedFunction<
    typeof useGratitudeEntryCountSinceDayKey
  >;
const mockRouter = jest.mocked(router);

function gratitudeEntry(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "g-1",
    userId: "user-1",
    level: "quick",
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
    starred: false,
    ...overrides,
  };
}

describe("GratitudeHomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGratitudeEntries.mockReturnValue({ data: [] } as never);
    mockUseGratitudeEntryCount.mockReturnValue({ data: 18 } as never);
    mockUseFavoriteGratitudeEntryCount.mockReturnValue({ data: 3 } as never);
    mockUseFavoriteGratitudeEntries.mockReturnValue({ data: [] } as never);
    mockUseGratitudeEntryCountSinceDayKey.mockReturnValue({ data: 4 } as never);
  });

  it("renders the approved header, exact stats, and non-punitive empty state", () => {
    renderWithProviders(<GratitudeHomeScreen />);

    expect(screen.getByRole("heading", { name: "Gratitude log" })).toBeTruthy();
    expect(screen.getByText("Three good things from today is enough.")).toBeTruthy();
    expect(screen.getByText("18 entries")).toBeTruthy();
    expect(screen.getByText("4 this week")).toBeTruthy();
    expect(screen.getByText("3 favourites")).toBeTruthy();
    expect(screen.getByText("Add one small thing you appreciated today.")).toBeTruthy();
  });

  it("renders thirty bars and keeps zero days at a two-pixel stub", () => {
    renderWithProviders(<GratitudeHomeScreen />);

    const bars = screen.getAllByTestId("bar-chart-bar");
    expect(bars).toHaveLength(30);
    expect(bars[0]).toHaveStyle({ height: 2 });
  });

  it("darkens the favorites star to accent ink, which think needs even as an icon", () => {
    mockUseGratitudeEntries.mockReturnValue({
      data: [gratitudeEntry({ starred: true })],
    } as unknown as ReturnType<typeof useGratitudeEntries>);

    renderWithProviders(<GratitudeHomeScreen />);

    // Published `text-think` is 1.88:1 on the think/0.12 tile behind this glyph -
    // under even 1.4.11's 3:1 for non-text, which the other seven hues clear. The
    // room's accent ink is the same hue at 5.47:1 (#368, #403).
    const stars = screen.UNSAFE_getAllByType(Icon).filter((icon) => icon.props.name === "star");
    expect(stars).toHaveLength(1);
    expect(String(stars[0]?.props.className).split(/\s+/)).toContain("text-primary-ink");
  });

  it("uses the dedicated favorites query instead of the capped recent list", () => {
    mockUseGratitudeEntries.mockReturnValue({ data: [gratitudeEntry()] } as never);
    mockUseFavoriteGratitudeEntries.mockReturnValue({
      data: [gratitudeEntry({ id: "old-favorite", items: ["Older favorite"], starred: true })],
    } as never);
    renderWithProviders(<GratitudeHomeScreen />);

    fireEvent.press(screen.getByText("Favourites"));

    expect(screen.getByText("Older favorite")).toBeTruthy();
    expect(screen.queryByText("Morning walk")).toBeNull();
  });

  it("routes to the new entry screen from the CTA", () => {
    mockUseGratitudeEntries.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useGratitudeEntries>);

    renderWithProviders(<GratitudeHomeScreen />);

    fireEvent.press(screen.getByText("New entry"));

    expect(mockRouter.push).toHaveBeenCalledWith("/tools/gratitude-log/new");
  });
});
