import { screen } from "@testing-library/react-native";
import { FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import MeditationSessionsScreen from "@/src/features/meditation/meditation-sessions-screen";
import { useMeditationSessions } from "@/src/features/meditation/queries";
import { renderWithProviders } from "@/test/render-with-providers";
import { roomPour } from "@/test/room-pour";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), canGoBack: jest.fn(() => false) },
  usePathname: () => "/tools/meditation/sessions",
}));

// Only the scheme read is faked - the rest of nativewind (vars, the className
// interop the whole screen renders through) stays real.
// `mock`-prefixed so babel-plugin-jest-hoist allows the factory to close over it.
let mockScheme: "light" | "dark" = "light";
jest.mock("nativewind", () => ({
  ...jest.requireActual("nativewind"),
  useColorScheme: () => ({ colorScheme: mockScheme }),
}));

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
    mockScheme = "light";
    setSessions(undefined);
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

    // The root carries the iris room re-pour; a wrong or missing room fails here
    // (see test/room-pour.ts for why this is identity, not deep equality).
    expect(screen.UNSAFE_getByType(SafeAreaView).props.style).toBe(roomPour("iris"));
  });

  it("pours the dark iris room when the scheme is dark", () => {
    setSessions([session()]);
    const lightPour = roomPour("iris");
    mockScheme = "dark";
    const darkPour = roomPour("iris");
    // Guards the assertion below against a scheme read that never moved.
    expect(darkPour).not.toBe(lightPour);

    renderWithProviders(<MeditationSessionsScreen />);

    expect(screen.UNSAFE_getByType(SafeAreaView).props.style).toBe(darkPour);
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

  it("wears iris on the stage badge", () => {
    setSessions([session()]);

    renderWithProviders(<MeditationSessionsScreen />);

    // Room accents follow the module hue; `primary` stays reserved for
    // interactive control states.
    const badge = screen.getByText("Stage 2");
    expect(badge.props.className).toContain("text-iris");
    // The fill converts with the ink - a half-reverted badge fails here.
    const ancestorClasses = [];
    for (let node = badge.parent; node; node = node.parent) {
      if (typeof node.props?.className === "string") ancestorClasses.push(node.props.className);
    }
    expect(ancestorClasses.some((c) => c.includes("bg-iris/10"))).toBe(true);
  });
});
