import { screen } from "@testing-library/react-native";
import { FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import MeditationSessionsScreen from "@/src/features/meditation/meditation-sessions-screen";
import { useMeditationSessions } from "@/src/features/meditation/queries";
import { renderWithProviders } from "@/test/render-with-providers";
import { expectNeutralRoom } from "@/test/room-pour";
import { useThemeStore } from "@/src/stores/theme-store";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), canGoBack: jest.fn(() => false) },
  usePathname: () => "/tools/meditation/sessions",
}));

// The room reads the scheme through the house reader (useColorSchemeName, #344),
// which resolves the theme store's preference against the OS - so the scheme is
// driven from both ends here rather than by stubbing nativewind's hook.
// nativewind itself stays real: the whole screen renders through its className
// interop, and roomVariables builds the pour through its vars().
// Matches the idiom in src/lib/use-room-style.test.ts.
const mockUseColorScheme = jest.spyOn(require("react-native"), "useColorScheme");

/** Drive the scheme the way the app does: preference "system", OS decides. */
const setOsScheme = (scheme: "light" | "dark") => {
  useThemeStore.setState({ preference: "system", hydrated: true });
  mockUseColorScheme.mockReturnValue(scheme);
};

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/meditation/queries", () => ({
  useMeditationSessions: jest.fn(),
}));

const mockUseMeditationSessions = useMeditationSessions as jest.MockedFunction<
  typeof useMeditationSessions
>;

const session = (overrides: Record<string, unknown> = {}) => ({
  id: "s1",
  userId: "user-1",
  durationMinutes: 20,
  stageAtSession: 2,
  completedAt: "2026-05-28T10:00:00Z",
  createdAt: "2026-05-28T10:00:00Z",
  reflection: null,
  ...overrides,
});

const setSessions = (data: unknown) =>
  mockUseMeditationSessions.mockReturnValue({ data } as unknown as ReturnType<
    typeof useMeditationSessions
  >);

describe("MeditationSessionsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setOsScheme("light");
    setSessions(undefined);
  });

  afterEach(() => {
    // This drives the real store, so put it back rather than leaving the next
    // test to depend on its own setOsScheme call running first.
    useThemeStore.setState({ preference: "system", hydrated: false });
  });

  afterAll(() => {
    mockUseColorScheme.mockRestore();
  });

  it("renders the history header and the empty state", () => {
    setSessions([]);

    renderWithProviders(<MeditationSessionsScreen />);

    expect(screen.getByRole("heading", { name: "Session history" })).toBeTruthy();
    expect(screen.getByText("Private record of every sit.")).toBeTruthy();
    expect(screen.getByText("No sessions yet.")).toBeTruthy();
  });

  it("renders a row per session", () => {
    setSessions([
      session(),
      session({ id: "s2", durationMinutes: 10, reflection: "Steadier today." }),
    ]);

    renderWithProviders(<MeditationSessionsScreen />);

    expect(screen.getByText("20 min")).toBeTruthy();
    expect(screen.getByText("10 min")).toBeTruthy();
    expect(screen.getByText("Steadier today.")).toBeTruthy();
  });

  it("renders the iris room pour on the root", () => {
    setSessions([session()]);

    renderWithProviders(<MeditationSessionsScreen />);

    // The root carries the iris room re-pour; a wrong or missing room fails here.
    expectNeutralRoom(screen.UNSAFE_getByType(SafeAreaView));
  });

  it("pours the dark iris room when the scheme is dark", () => {
    setSessions([session()]);
    setOsScheme("dark");

    renderWithProviders(<MeditationSessionsScreen />);

    // Asserting the dark triples by value is its own guard against a scheme read
    // that never moved: the light pour carries different values and fails here.
    expectNeutralRoom(screen.UNSAFE_getByType(SafeAreaView));
  });

  it("keeps the FlatList as the scroll root", () => {
    setSessions([session()]);

    renderWithProviders(<MeditationSessionsScreen />);

    // The pour rides the SafeAreaView itself, so the only host element between
    // the list and the root is that safe-area view - no wrapper. Wrapping the
    // list in a `<View style={roomStyle}>` would still look poured while
    // costing the rows their recycling (#97), and passes a mere "a FlatList
    // exists" check; this is what rules it out.
    const root = screen.UNSAFE_getByType(SafeAreaView);
    const hostsBetween = [];
    for (let node = screen.UNSAFE_getByType(FlatList).parent; node && node !== root;) {
      if (typeof node.type === "string") hostsBetween.push(node.type);
      node = node.parent;
    }
    expect(hostsBetween).toHaveLength(1);
  });

  // INVERTED by #588: the badge wore the module's iris; a stage badge is chrome.
  it("wears no module hue on the stage badge", () => {
    setSessions([session()]);

    renderWithProviders(<MeditationSessionsScreen />);

    const badge = screen.getByText("Stage 2");
    // The fill converts with the ink - a half-reverted badge fails here, which
    // is the same guard the hue version carried, pointed the other way.
    const ancestorClasses = [];
    for (let node = badge.parent; node; node = node.parent) {
      if (typeof node.props?.className === "string") ancestorClasses.push(node.props.className);
    }
    expect(ancestorClasses.some((c) => c.includes("bg-iris/10"))).toBe(false);
    expect(ancestorClasses.some((c) => c.includes("bg-muted"))).toBe(true);
  });
});
