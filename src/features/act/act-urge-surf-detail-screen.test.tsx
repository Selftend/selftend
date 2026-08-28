import { screen } from "@testing-library/react-native";

import ActUrgeSurfDetailScreen from "@/src/features/act/act-urge-surf-detail-screen";
import { useUrgeSurfLog, useUrgeSurfLogPages } from "@/src/features/act/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), canGoBack: jest.fn(() => true), back: jest.fn() },
  useLocalSearchParams: () => ({ id: "log-1" }),
  usePathname: () => "/modules/act/expansion/urge-surfing/log-1",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/act/queries", () => ({
  useUrgeSurfLog: jest.fn(),
  useUrgeSurfLogPages: jest.fn(),
}));

const mockLog = useUrgeSurfLog as jest.MockedFunction<typeof useUrgeSurfLog>;
const mockPages = useUrgeSurfLogPages as jest.MockedFunction<typeof useUrgeSurfLogPages>;

const log = (over: Record<string, unknown> = {}) => ({
  id: "log-1",
  userId: "user-1",
  urgeDescription: "to check my phone",
  trigger: "boredom in a meeting",
  peakIntensity: 70,
  surfingNotes: "it peaked and fell in about four minutes",
  urgeActedOn: false,
  completedAt: "2026-05-24T09:04:00.000Z",
  createdAt: "2026-05-24T09:00:00.000Z",
  updatedAt: "2026-05-24T09:00:00.000Z",
  ...over,
});

function fetched(value: unknown, isLoading = false) {
  mockLog.mockReturnValue({ data: value, isLoading } as unknown as ReturnType<
    typeof useUrgeSurfLog
  >);
}

function cachedPages(items: unknown[] | undefined) {
  mockPages.mockReturnValue({
    data: items ? { pages: [items], pageParams: [null] } : undefined,
  } as unknown as ReturnType<typeof useUrgeSurfLogPages>);
}

describe("ActUrgeSurfDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cachedPages(undefined);
    fetched(null);
  });

  /**
   * ☠️ **The defect this route exists to fix.** Urge surfing's four-step form writes six
   * fields; before #1517 the only surface that rendered any of them showed two — the
   * description and a timestamp. `trigger`, `peakIntensity`, `urgeActedOn` and
   * `surfingNotes` were captured on every entry and readable by nobody, at any depth,
   * ever. This asserts all four are on the screen.
   */
  it("shows every captured field, including the four no surface used to render", () => {
    fetched(log());

    renderWithProviders(<ActUrgeSurfDetailScreen />);

    expect(screen.getByText("to check my phone")).toBeTruthy();
    expect(screen.getByText("boredom in a meeting")).toBeTruthy();
    expect(screen.getByText("70 / 100")).toBeTruthy();
    expect(screen.getByText("No")).toBeTruthy();
    expect(screen.getByText("it peaked and fell in about four minutes")).toBeTruthy();
  });

  /**
   * ☠️ `urgeActedOn: false` is an ANSWER, not an absence — and it is the answer a user
   * most wants to read back, because it is the entry where surfing worked. Gating this
   * card on truthiness (as the optional text fields are gated) would hide exactly those.
   */
  it("renders the acted-on answer when it is No, not only when it is Yes", () => {
    fetched(log({ urgeActedOn: false }));
    renderWithProviders(<ActUrgeSurfDetailScreen />);
    expect(screen.getByText("No")).toBeTruthy();

    fetched(log({ urgeActedOn: true }));
    renderWithProviders(<ActUrgeSurfDetailScreen />);
    expect(screen.getByText("Yes")).toBeTruthy();
  });

  /** A zero peak is a rating, not a missing one. */
  it("renders a peak intensity of 0", () => {
    fetched(log({ peakIntensity: 0 }));

    renderWithProviders(<ActUrgeSurfDetailScreen />);

    expect(screen.getByText("0 / 100")).toBeTruthy();
  });

  /**
   * Tapping a row from the archive paints from the pages already loaded rather than
   * refetching — and the single-row read must then be disabled, or every tap costs a
   * round trip for a row the client already holds.
   */
  it("reads a tapped row out of the loaded pages instead of fetching it again", () => {
    cachedPages([log({ urgeDescription: "from the cache" })]);

    renderWithProviders(<ActUrgeSurfDetailScreen />);

    expect(screen.getByText("from the cache")).toBeTruthy();
    expect(mockLog).toHaveBeenCalledWith(null, null);
  });

  it("says not-found rather than rendering an empty shell", () => {
    fetched(null);

    renderWithProviders(<ActUrgeSurfDetailScreen />);

    expect(
      screen.getByText("No urge surfing entries yet. Try it when an urge or craving shows up."),
    ).toBeTruthy();
  });
});
