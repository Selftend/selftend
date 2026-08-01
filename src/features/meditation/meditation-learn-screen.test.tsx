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

  // INVERTED by #588, and these two used to be a matched pair: one asserted the
  // attention callout wore the room's iris, the other that the `be` and `act`
  // cards beside it stayed their own colours as "untouched guests". Both encoded
  // the same idea - that a card's tint says which module it belongs to - which is
  // the case the ruling replaces with icon and label (#558).
  //
  // Fails on the old behaviour on every line: all three tints were present.
  it("carries no module tint on any card", () => {
    renderWithProviders(<MeditationLearnScreen />);

    expect(viewClassNames().filter((c) => c.includes("var(--iris)"))).toEqual([]);
    expect(viewClassNames().filter((c) => c.includes("bg-be/5") || c.includes("bg-act/5"))).toEqual(
      [],
    );
    expect(viewClassNames().filter((c) => c.includes("border-be/30"))).toEqual([]);
  });
});
