import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import ActUrgeSurfScreen from "@/src/features/act/act-urge-surf-screen";
import { useUrgeSurfLogPages } from "@/src/features/act/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), canGoBack: jest.fn(() => false), back: jest.fn() },
  usePathname: () => "/modules/act/expansion/urge-surfing",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/stores/selected-date-store", () => ({
  useSelectedDate: () => ({ selectedDate: "2026-05-24" }),
  loggedAtForSelectedDate: () => "2026-05-24T09:00:00.000Z",
}));

jest.mock("@/src/features/act/queries", () => ({
  useUrgeSurfLogPages: jest.fn(),
  useSaveUrgeSurfLog: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

const mockPages = useUrgeSurfLogPages as jest.MockedFunction<typeof useUrgeSurfLogPages>;

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
  } as unknown as ReturnType<typeof useUrgeSurfLogPages>);
}

const log = (over: Record<string, unknown> = {}) => ({
  id: "log-1",
  userId: "user-1",
  urgeDescription: "an urge",
  trigger: "",
  peakIntensity: null,
  surfingNotes: "",
  urgeActedOn: false,
  completedAt: "2026-05-24T09:04:00.000Z",
  createdAt: "2026-05-24T09:00:00.000Z",
  updatedAt: "2026-05-24T09:00:00.000Z",
  ...over,
});

describe("ActUrgeSurfScreen - list mode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pages();
  });

  /**
   * ☠️ **The reachability defect #1517 fixes.** The list read was a hard
   * `useUrgeSurfLogs(user, 5)` on the tool screen, and there was no list route and no
   * `[id]` route anywhere under `app/(app)/modules/act/` — so a sixth entry was
   * unreachable by EVERY path, id included. It was the only ACT feed in that position.
   */
  it("renders more than the five entries the old hard limit allowed", () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      log({ id: `log-${i}`, urgeDescription: `urge ${i}` }),
    );
    pages({ data: { pages: [many], pageParams: [null] } });

    renderWithProviders(<ActUrgeSurfScreen />);

    expect(screen.getByText("urge 0")).toBeTruthy();
    expect(screen.getByText("urge 5")).toBeTruthy();
    expect(screen.getByText("urge 7")).toBeTruthy();
  });

  /** Rows open the detail route, which is what makes the other four fields readable. */
  it("opens an entry's detail route when its row is pressed", () => {
    pages({
      data: { pages: [[log({ id: "log-1", urgeDescription: "an urge" })]], pageParams: [null] },
    });

    renderWithProviders(<ActUrgeSurfScreen />);

    fireEvent.press(screen.getByText("an urge"));

    expect(router.push as jest.Mock).toHaveBeenCalledWith({
      pathname: "/modules/act/expansion/urge-surfing/[id]",
      params: { id: "log-1" },
    });
  });

  /**
   * ☠️ #1515: this route is the tool's front door as well as its archive, so the control
   * that starts a new surf has to stay above the entries.
   */
  it("keeps the start control on screen alongside the archive", () => {
    pages({ data: { pages: [[log({ urgeDescription: "an entry" })]], pageParams: [null] } });

    renderWithProviders(<ActUrgeSurfScreen />);

    expect(screen.getAllByText("Surf an urge").length).toBeGreaterThan(0);
    expect(screen.getByText("an entry")).toBeTruthy();
  });

  /** ☠️ A failed read must not read as an empty history — see the defusion screen's test. */
  it("tells a failed read apart from an empty one", () => {
    pages({ isError: true });

    renderWithProviders(<ActUrgeSurfScreen />);

    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(
      screen.queryByText("No urge surfing entries yet. Try it when an urge or craving shows up."),
    ).toBeNull();
  });
});
