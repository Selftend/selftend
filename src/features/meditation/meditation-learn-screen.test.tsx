import { screen } from "@testing-library/react-native";
import { useColorScheme } from "nativewind";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import MeditationLearnScreen from "@/src/features/meditation/meditation-learn-screen";
import { roomVariables } from "@/src/lib/module-room";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  usePathname: () => "/tools/meditation/learn",
}));

jest.mock("@/src/components/app/screen-breadcrumb", () => ({ ScreenBreadcrumb: () => null }));

// Everything else in nativewind stays real (the styling interop the whole
// render depends on); only the scheme read is steerable, so the pour can be
// asserted in dark as well as light.
jest.mock("nativewind", () => ({
  ...jest.requireActual("nativewind"),
  useColorScheme: jest.fn(() => ({ colorScheme: "light" })),
}));

const mockUseColorScheme = useColorScheme as jest.MockedFunction<typeof useColorScheme>;

const setScheme = (scheme: "light" | "dark") =>
  mockUseColorScheme.mockReturnValue({ colorScheme: scheme } as ReturnType<typeof useColorScheme>);

/** Every rendered view's class list, for asserting on tint utilities. */
const classNames = () =>
  screen
    .UNSAFE_getAllByType(View)
    .map((node) => String(node.props.className ?? ""))
    .filter(Boolean);

describe("MeditationLearnScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setScheme("light");
  });

  it("renders the three framework cards", () => {
    renderWithProviders(<MeditationLearnScreen />);

    expect(screen.getByRole("heading", { name: "Learn the framework" })).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Attention and peripheral awareness" }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: "The gardener's mindset" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "The path is not linear" })).toBeTruthy();
  });

  it("renders the iris room pour on its root", () => {
    renderWithProviders(<MeditationLearnScreen />);

    expect(screen.UNSAFE_getByType(SafeAreaView).props.style).toEqual(roomVariables("iris").light);
  });

  it("renders the dark iris pour when the scheme is dark", () => {
    setScheme("dark");

    renderWithProviders(<MeditationLearnScreen />);

    expect(screen.UNSAFE_getByType(SafeAreaView).props.style).toEqual(roomVariables("iris").dark);
  });

  it("tints the attention callout card with iris", () => {
    renderWithProviders(<MeditationLearnScreen />);

    // One card converts - the `primary`-tinted attention callout.
    expect(classNames().filter((c) => c.includes("hsl(var(--iris)/0.06)"))).toHaveLength(1);
    expect(classNames().some((c) => c.includes("bg-primary/5"))).toBe(false);
  });

  it("keeps the `be` and `act` cards as untouched guests", () => {
    renderWithProviders(<MeditationLearnScreen />);

    // Cross-module colour references. The room does not repaint a guest, the
    // same way grounding left its per-technique hues alone.
    expect(classNames().filter((c) => c.includes("border-be/30 bg-be/5"))).toHaveLength(1);
    expect(classNames().filter((c) => c.includes("border-act/30 bg-act/5"))).toHaveLength(1);
  });
});
