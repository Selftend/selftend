import { fireEvent, screen } from "@testing-library/react-native";

import { SchemePicker } from "@/src/components/app/scheme-picker";
import { SEGMENTED_RAISED_CLASS } from "@/src/components/app/segmented-control";
import { setPlatformOS } from "@/test/modal-marker-mock";
import { renderWithProviders } from "@/test/render-with-providers";
import { useThemeStore, type ThemePreference } from "@/src/stores/theme-store";

// jest-expo loads with `defaultPlatform: "ios"`, so this is the value to put
// back after a test moves the platform - not a captured original.
const JEST_DEFAULT_OS = "ios" as const;

const LABELS: Record<ThemePreference, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

describe("SchemePicker", () => {
  beforeEach(() => {
    useThemeStore.setState({ preference: "system", hydrated: true });
  });

  afterEach(() => {
    setPlatformOS(JEST_DEFAULT_OS);
  });

  // Order is the one place the drawing loses (#1781): `14a` draws
  // Light / Dark / System, and this ships system-first because "the default is
  // to follow your device" is what belongs at the head of the track.
  it("offers system, light and dark in that order", () => {
    renderWithProviders(<SchemePicker />);

    expect(screen.getAllByRole("radio").map((radio) => radio.props.accessibilityLabel)).toEqual([
      "System",
      "Light",
      "Dark",
    ]);
  });

  // `user-menu.test.tsx:215` reaches the group through this exact label, and so
  // does the settings page's second radiogroup check - the group is never left
  // unnamed, whatever the visible caption does.
  it("is a radiogroup named by the theme toggle's own string", () => {
    renderWithProviders(<SchemePicker />);

    expect(screen.getByLabelText("Switch theme").props.accessibilityRole).toBe("radiogroup");
  });

  // The other half of "segmented": one track, and the chosen option RAISED out
  // of it. Asserted through the shared class rather than a literal, so the two
  // components that draw this track cannot drift apart silently.
  it("raises the chosen option out of the track, and only that one", () => {
    useThemeStore.setState({ preference: "light", hydrated: true });
    renderWithProviders(<SchemePicker />);

    const raised = (["system", "light", "dark"] as const).filter((value) =>
      String(screen.getByTestId(`scheme-option-${value}`).props.className).includes(
        SEGMENTED_RAISED_CLASS,
      ),
    );

    expect(raised).toEqual(["light"]);
  });

  it("checks the active preference, and only that one", () => {
    useThemeStore.setState({ preference: "dark", hydrated: true });
    renderWithProviders(<SchemePicker />);

    expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Light" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "System" })).not.toBeChecked();
  });

  it.each(["light", "dark", "system"] as const)("stores %s when its option is pressed", (value) => {
    useThemeStore.setState({ preference: value === "dark" ? "light" : "dark", hydrated: true });
    renderWithProviders(<SchemePicker />);

    fireEvent.press(screen.getByRole("radio", { name: LABELS[value] }));

    expect(useThemeStore.getState().preference).toBe(value);
  });

  // The caption is load-bearing, not decoration: `settings-preferences.e2e.test.ts`
  // asserts "Switch theme" VISIBLE three times, through the menu. It is a prop so
  // settings can suppress it under its own `Appearance` eyebrow - never dropped to
  // match a drawing that has no label at all.
  describe("the visible caption", () => {
    it("ships by default, which is what the menu mount takes", () => {
      renderWithProviders(<SchemePicker />);

      expect(screen.getByText("Switch theme")).toBeTruthy();
    });

    it("is suppressed on request, leaving the group still named", () => {
      renderWithProviders(<SchemePicker showLabel={false} />);

      expect(screen.queryByText("Switch theme")).toBeNull();
      expect(screen.getByLabelText("Switch theme")).toBeTruthy();
    });
  });

  // The property #1827 calls a regression if lost: three tab stops instead of
  // one. Web-only, because `useRovingFocus` is `{}` everywhere else.
  describe("keyboard, on web", () => {
    it("is one tab stop, parked on the active option", () => {
      setPlatformOS("web");
      useThemeStore.setState({ preference: "light", hydrated: true });
      renderWithProviders(<SchemePicker />);

      expect(screen.getAllByRole("radio").map((radio) => radio.props.tabIndex)).toEqual([
        -1, 0, -1,
      ]);
    });

    it("moves focus and selection together on an arrow key", () => {
      setPlatformOS("web");
      renderWithProviders(<SchemePicker />);

      fireEvent(screen.getByRole("radio", { name: "System" }), "keyDown", {
        key: "ArrowRight",
        repeat: false,
        preventDefault: () => {},
      });

      expect(useThemeStore.getState().preference).toBe("light");
    });
  });
});
