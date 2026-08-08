import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { SectionList } from "react-native";

import MoodHistoryScreen from "@/src/features/mood/mood-history-screen";
import { useMoodHistoryPages } from "@/src/features/mood/queries";
import type { MoodLog } from "@/src/features/mood/types";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  usePathname: () => "/tools/check-in/history",
}));

jest.mock("@/src/components/app/screen-breadcrumb", () => ({ ScreenBreadcrumb: () => null }));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/mood/emotion-preferences-queries", () => ({
  useEmotionPreferences: () => ({ data: [], isLoading: false }),
}));

jest.mock("@/src/features/mood/queries", () => ({
  useMoodHistoryPages: jest.fn(),
}));

const mockUseMoodHistoryPages = useMoodHistoryPages as jest.MockedFunction<
  typeof useMoodHistoryPages
>;
const mockRouter = jest.mocked(router);

function log(dayKey: string, overrides: Partial<MoodLog> = {}): MoodLog {
  const loggedAt = `${dayKey}T16:50:00Z`;
  return {
    id: `log-${dayKey}`,
    userId: "user-1",
    moodScore: 4,
    emotions: [],
    notes: "",
    linkedStrategy: null,
    loggedAt,
    loggedOffsetMinutes: 0,
    dayKey,
    createdAt: loggedAt,
    situation: "",
    thoughts: "",
    behaviours: "",
    bodilySensations: "",
    ...overrides,
  };
}

interface PagesState {
  pages?: MoodLog[][];
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  isPending?: boolean;
}

const fetchNextPage = jest.fn();

function mockPages({
  pages,
  hasNextPage = false,
  isFetchingNextPage = false,
  isPending = false,
}: PagesState) {
  mockUseMoodHistoryPages.mockReturnValue({
    data: pages ? { pages, pageParams: pages.map((_, i) => i * 50) } : undefined,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } as unknown as ReturnType<typeof useMoodHistoryPages>);
}

// Today's day key, so grouping lands the fixture under "Today" whatever day the
// suite runs on. The row's `when` is still fixed, because the entry carries a
// captured offset of 0 and is rendered in that frame.
function todayKey() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

describe("MoodHistoryScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the screen header and its own description", () => {
    mockPages({ pages: [[]] });

    renderWithProviders(<MoodHistoryScreen />);

    expect(screen.getByRole("heading", { name: "All history" })).toBeTruthy();
    expect(screen.getByText("Every check-in you have logged, newest first.")).toBeTruthy();
  });

  it("renders a row per entry under its section heading, with no group average", () => {
    mockPages({ pages: [[log(todayKey(), { emotions: ["anxious", "sad"] })]] });

    renderWithProviders(<MoodHistoryScreen />);

    expect(screen.getByText("Today")).toBeTruthy();
    expect(screen.getByText("Good · 4")).toBeTruthy();
    // Emotions are dot-separated text, not Badge chips.
    expect(screen.getByText("Anxious · Sad")).toBeTruthy();
    // The `when` disambiguates within the group - a day label would read "Today"
    // on every row under a heading that already says Today.
    expect(screen.getByText("4:50 PM")).toBeTruthy();
    // Averages are the defect #705 filed: under paging they cover only the rows
    // that happen to be loaded.
    expect(screen.queryByText(/^avg /)).toBeNull();
  });

  it("shows a note preview only when the entry has a note", () => {
    const key = todayKey();
    mockPages({
      pages: [
        [
          log(key, { id: "with-note", notes: "  Walked before the light went.  " }),
          log(key, { id: "without-note", notes: "   " }),
        ],
      ],
    });

    renderWithProviders(<MoodHistoryScreen />);

    expect(screen.getByText("Walked before the light went.")).toBeTruthy();
    expect(screen.getAllByText("Good · 4")).toHaveLength(2);
  });

  it("names only the first three emotions and collapses the rest", () => {
    mockPages({
      pages: [[log(todayKey(), { emotions: ["anxious", "sad", "lonely", "numb", "hopeless"] })]],
    });

    renderWithProviders(<MoodHistoryScreen />);

    expect(screen.getByText("Anxious · Sad · Lonely · +2")).toBeTruthy();
  });

  it("opens the entry when a row is pressed", () => {
    const key = todayKey();
    mockPages({ pages: [[log(key)]] });

    renderWithProviders(<MoodHistoryScreen />);

    fireEvent.press(screen.getByLabelText("View Good check-in from 4:50 PM"));

    expect(mockRouter.push).toHaveBeenCalledWith(`/tools/check-in/log-${key}`);
  });

  it("fetches the next page when the list reaches its end", () => {
    mockPages({ pages: [[log(todayKey())]], hasNextPage: true });

    renderWithProviders(<MoodHistoryScreen />);
    screen.UNSAFE_getByType(SectionList).props.onEndReached();

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("does not queue a second page while one is already in flight", () => {
    // onEndReached fires repeatedly while a drag continues; without this guard
    // each firing would start another request.
    mockPages({ pages: [[log(todayKey())]], hasNextPage: true, isFetchingNextPage: true });

    renderWithProviders(<MoodHistoryScreen />);
    screen.UNSAFE_getByType(SectionList).props.onEndReached();

    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it("stops asking once the last page has arrived", () => {
    mockPages({ pages: [[log(todayKey())]], hasNextPage: false });

    renderWithProviders(<MoodHistoryScreen />);
    screen.UNSAFE_getByType(SectionList).props.onEndReached();

    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it("shows the empty state once a loaded history turns out to be empty", () => {
    mockPages({ pages: [[]] });

    renderWithProviders(<MoodHistoryScreen />);

    expect(screen.getByText("Nothing here yet")).toBeTruthy();
    expect(screen.getByText("Your check-ins will collect here as you log them.")).toBeTruthy();
  });

  it("stays silent while the first page is still loading", () => {
    // Claiming "nothing here yet" during the initial fetch tells a returning
    // user their history is gone.
    mockPages({ isPending: true });

    renderWithProviders(<MoodHistoryScreen />);

    expect(screen.queryByText("Nothing here yet")).toBeNull();
  });

  it("keeps the reading column and padding on contentContainerStyle", () => {
    // NativeWind does not cssInterop SectionList, so `contentContainerClassName`
    // is silently dropped - and a centred wrapper would un-virtualize the list.
    mockPages({ pages: [[]] });

    renderWithProviders(<MoodHistoryScreen />);

    const list = screen.UNSAFE_getByType(SectionList);

    expect(list.props.contentContainerStyle).toEqual({
      flexGrow: 1,
      padding: 16,
      width: "100%",
      maxWidth: 620,
      alignSelf: "center",
    });
    expect(list.props.contentContainerClassName).toBeUndefined();
  });
});
