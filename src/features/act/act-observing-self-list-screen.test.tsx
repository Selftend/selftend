import { fireEvent, screen } from "@testing-library/react-native";

import ActObservingSelfListScreen from "@/src/features/act/act-observing-self-list-screen";
import { useObservingSelfSessionPages } from "@/src/features/act/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), canGoBack: jest.fn(() => false) },
  usePathname: () => "/modules/act/observing-self",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/act/queries", () => ({
  useObservingSelfSessionPages: jest.fn(),
}));

const mockPages = useObservingSelfSessionPages as jest.MockedFunction<
  typeof useObservingSelfSessionPages
>;

function pages(over: Record<string, unknown> = {}) {
  mockPages.mockReturnValue({
    data: undefined,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isError: false,
    isFetchingNextPage: false,
    isPending: false,
    refetch: jest.fn(),
    ...over,
  } as unknown as ReturnType<typeof useObservingSelfSessionPages>);
}

const session = (over: Record<string, unknown> = {}) => ({
  id: "session-1",
  userId: "user-1",
  techniqueUsed: "tenDeepBreaths",
  whatWasObserved: "an observation",
  durationMinutes: null,
  moodAfter: null,
  notes: "",
  createdAt: "2026-05-24T09:00:00.000Z",
  updatedAt: "2026-05-24T09:00:00.000Z",
  ...over,
});

describe("ActObservingSelfListScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pages();
  });

  /**
   * ☠️ **The inverse of the test it replaces.** The old assertion pinned the day filter
   * #1517 removes — see the defusion screen's test for the full reasoning.
   */
  it("renders sessions written on other days, not just today's", () => {
    pages({
      data: {
        pages: [
          [
            session({ id: "today", whatWasObserved: "today observation" }),
            session({
              id: "old",
              whatWasObserved: "old observation",
              createdAt: "2026-05-20T09:00:00.000Z",
            }),
          ],
        ],
        pageParams: [null],
      },
    });

    renderWithProviders(<ActObservingSelfListScreen />);

    expect(screen.getByText("today observation")).toBeTruthy();
    expect(screen.getByText("old observation")).toBeTruthy();
  });

  it("flattens every loaded page", () => {
    pages({
      data: {
        pages: [
          [session({ id: "p1", whatWasObserved: "page one observation" })],
          [session({ id: "p2", whatWasObserved: "page two observation" })],
        ],
        pageParams: [null, { timestamp: "2026-05-24T09:00:00.000Z", id: "p1" }],
      },
    });

    renderWithProviders(<ActObservingSelfListScreen />);

    expect(screen.getByText("page one observation")).toBeTruthy();
    expect(screen.getByText("page two observation")).toBeTruthy();
  });

  /** ☠️ A failed read must not read as an empty history — see the defusion screen's test. */
  it("tells a failed read apart from an empty one", () => {
    pages({ isError: true });

    renderWithProviders(<ActObservingSelfListScreen />);

    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(
      screen.queryByText(
        'No sessions yet. Try "Ten Deep Breaths" to step into the Observing Self.',
      ),
    ).toBeNull();
  });

  // The header help door (#1543): the label `HelpButton` composes is what pins
  // this door to the `observingSelf` key, and the sheet's own rendering is
  // pinned in `help-sheet.test.tsx`.
  it("opens the observing self help sheet from the header", () => {
    pages({ data: { pages: [[]], pageParams: [null] } });

    renderWithProviders(<ActObservingSelfListScreen />);

    fireEvent.press(screen.getByLabelText("Help: Observing Self"));

    expect(screen.getByTestId("help-sheet-content")).toBeTruthy();
  });
});
