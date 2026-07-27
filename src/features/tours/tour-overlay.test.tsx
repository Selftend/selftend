/**
 * The tour card's surface follows the colour scheme.
 *
 * This is the one site in the #344 sweep where the two read idioms disagreed.
 * It used to write `POPOVER_COLOR[colorScheme ?? "dark"]` against NativeWind's
 * `string | undefined` hook, so before the driver's effect had run — or on any
 * frame NativeWind reported nothing — a light-mode user got the DARK popover
 * surface. The house reader is never undefined, so that fallback is gone and an
 * unknown scheme now resolves to light like everywhere else in the app.
 *
 * Pinning both schemes here so the surface can't drift back.
 */

import { screen } from "@testing-library/react-native";

import { TourOverlay } from "@/src/features/tours/tour-overlay";
import { useThemeStore } from "@/src/stores/theme-store";
import { POPOVER_COLOR } from "@/lib/theme";
import { renderWithProviders } from "@/test/render-with-providers";

const mockUseColorScheme = jest.spyOn(require("react-native"), "useColorScheme");

// The overlay renders through a Portal, so it needs the PortalHost that
// renderWithProviders mirrors from the app root.
const renderOverlay = () =>
  renderWithProviders(
    <TourOverlay
      targetRect={{ x: 40, y: 80, width: 120, height: 44 }}
      description="Tap here to log how you feel."
      dismissLabel="Got it"
      skipAllLabel="Skip all"
      isPending={false}
      onDismiss={jest.fn()}
      onDismissAll={jest.fn()}
    />,
  );

const cardBackground = async () => {
  const style = (await screen.findByTestId("tour-tooltip-card")).props.style;
  return (Array.isArray(style) ? Object.assign({}, ...style) : style).backgroundColor;
};

afterEach(() => {
  useThemeStore.setState({ preference: "system", hydrated: false });
});

afterAll(() => {
  mockUseColorScheme.mockRestore();
});

describe("TourOverlay card surface", () => {
  it("uses the light popover surface in light mode", async () => {
    useThemeStore.setState({ preference: "light", hydrated: true });

    renderOverlay();

    expect(await cardBackground()).toBe(POPOVER_COLOR.light);
  });

  it("uses the dark popover surface in dark mode", async () => {
    useThemeStore.setState({ preference: "dark", hydrated: true });

    renderOverlay();

    expect(await cardBackground()).toBe(POPOVER_COLOR.dark);
  });

  it("resolves an unknown OS scheme to light, not dark", async () => {
    // The behaviour that changed in #344: the old `?? "dark"` made this dark.
    useThemeStore.setState({ preference: "system", hydrated: true });
    mockUseColorScheme.mockReturnValue(null);

    renderOverlay();

    expect(await cardBackground()).toBe(POPOVER_COLOR.light);
  });
});
