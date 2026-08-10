import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { Icon } from "@/src/components/react-native-reusables/icon";
import GratitudeHomeScreen from "@/src/features/gratitude/gratitude-home-screen";
import { useGratitudeEntries, useGratitudeEntryCount } from "@/src/features/gratitude/queries";
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

jest.mock("@/src/components/app/notification-settings-modal", () => ({
  NotificationSettingsModal: () => null,
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("@/src/features/gratitude/queries", () => ({
  ...jest.requireActual("@/src/features/gratitude/queries"),
  useGratitudeEntries: jest.fn(),
  useGratitudeEntryCount: jest.fn(),
}));

const mockUseGratitudeEntries = useGratitudeEntries as jest.MockedFunction<
  typeof useGratitudeEntries
>;
const mockUseGratitudeEntryCount = useGratitudeEntryCount as jest.MockedFunction<
  typeof useGratitudeEntryCount
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
    mockUseGratitudeEntryCount.mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useGratitudeEntryCount>);
  });

  it("renders the think field header with title, stats, and empty-state subline", () => {
    mockUseGratitudeEntries.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useGratitudeEntries>);

    renderWithProviders(<GratitudeHomeScreen />);

    expect(screen.getByRole("heading", { name: "Gratitude log" })).toBeTruthy();
    // Calm muted subline when nothing is logged - never a shame state.
    expect(screen.getByText("nothing logged yet")).toBeTruthy();
  });

  it("shows the last-logged subline when an entry exists", () => {
    mockUseGratitudeEntries.mockReturnValue({
      data: [gratitudeEntry()],
    } as unknown as ReturnType<typeof useGratitudeEntries>);

    renderWithProviders(<GratitudeHomeScreen />);

    expect(screen.getByText(/^last logged /)).toBeTruthy();
    expect(screen.queryByText("nothing logged yet")).toBeNull();
  });

  it("omits the subline until the entries query has actually loaded", () => {
    // `data === undefined` means still loading, or a failed fetch with no cache -
    // claiming "nothing logged" there would erase a returning user's real history.
    mockUseGratitudeEntries.mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useGratitudeEntries>);

    renderWithProviders(<GratitudeHomeScreen />);

    expect(screen.queryByText("nothing logged yet")).toBeNull();
    expect(screen.queryByText(/^last logged /)).toBeNull();
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

  it("routes to the new entry screen from the CTA", () => {
    mockUseGratitudeEntries.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useGratitudeEntries>);

    renderWithProviders(<GratitudeHomeScreen />);

    fireEvent.press(screen.getByText("New entry"));

    expect(mockRouter.push).toHaveBeenCalledWith("/tools/gratitude-log/new");
  });
});
