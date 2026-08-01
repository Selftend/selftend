import { screen } from "@testing-library/react-native";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import MeditationLearnScreen from "@/src/features/meditation/meditation-learn-screen";
import { expectNeutralRoom } from "@/test/room-pour";
import { setScheme } from "@/test/color-scheme-mock";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  usePathname: () => "/tools/meditation/learn",
}));

jest.mock("@/src/components/app/screen-breadcrumb", () => ({ ScreenBreadcrumb: () => null }));

/** Every rendered view's class list, for asserting on tint utilities. */
const viewClassNames = () =>
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

    expectNeutralRoom(screen.UNSAFE_getByType(SafeAreaView));
  });

  it("renders the dark iris pour when the scheme is dark", () => {
    setScheme("dark");

    renderWithProviders(<MeditationLearnScreen />);

    expectNeutralRoom(screen.UNSAFE_getByType(SafeAreaView));
  });

  it("tints the attention callout card with iris", () => {
    renderWithProviders(<MeditationLearnScreen />);

    // One card converts - the `primary`-tinted attention callout. Matched on
    // the hue variable rather than Card's exact alpha literals, so a tint
    // retune doesn't break the assertion.
    expect(viewClassNames().filter((c) => c.includes("var(--iris)"))).toHaveLength(1);
    // The callout's former `primary` tint is gone from the screen.
    expect(
      viewClassNames().some((c) => c.includes("bg-primary/5") || c.includes("border-primary/30")),
    ).toBe(false);
  });

  it("keeps the `be` and `act` cards as untouched guests", () => {
    renderWithProviders(<MeditationLearnScreen />);

    // Cross-module colour references. The room does not repaint a guest, the
    // same way grounding left its per-technique hues alone.
    expect(viewClassNames().filter((c) => c.includes("border-be/30 bg-be/5"))).toHaveLength(1);
    expect(viewClassNames().filter((c) => c.includes("border-act/30 bg-act/5"))).toHaveLength(1);
  });
});
