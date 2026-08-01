import { fireEvent, render, screen } from "@testing-library/react-native";

import { StylePicker } from "@/src/components/app/style-picker";
import { THEME_HEXES } from "@/lib/theme";
import { DEFAULT_STYLE, STYLE_LABELS, STYLE_NAMES } from "@/src/lib/theme/styles";
import { useStyleStore } from "@/src/stores/style-store";

jest.mock("@/src/lib/color-scheme", () => ({ useColorSchemeName: () => "light" }));

describe("StylePicker", () => {
  beforeEach(() => {
    useStyleStore.setState({ style: DEFAULT_STYLE, hydrated: true });
  });

  it("offers every palette", () => {
    render(<StylePicker />);

    for (const style of STYLE_NAMES) {
      expect(screen.getByTestId(`style-card-${style}`)).toBeTruthy();
    }
  });

  it("selects a palette when its card is pressed", () => {
    render(<StylePicker />);

    fireEvent.press(screen.getByTestId("style-card-deep-field"));

    expect(useStyleStore.getState().style).toBe("deep-field");
  });

  it("marks the active palette as checked, and only that one", () => {
    useStyleStore.setState({ style: "glacier", hydrated: true });
    render(<StylePicker />);

    // React Native folds `aria-checked` into `accessibilityState` before it
    // reaches the host node, so read whichever survived.
    const isChecked = (style: (typeof STYLE_NAMES)[number]) => {
      const { props } = screen.getByTestId(`style-card-${style}`);
      return Boolean(props.accessibilityState?.checked ?? props["aria-checked"]);
    };
    const checked = STYLE_NAMES.filter(isChecked);

    expect(checked).toEqual(["glacier"]);
  });

  // The guarantee that gives the grid its point: a card cannot advertise a
  // colour the app does not paint, because the chips are read back off the
  // RESOLVED tokens rather than off a palette's authored hexes. quiet-lilac is
  // the case that proves it — it is hand-authored as twenty tokens and has no
  // core hexes to read.
  it.each(STYLE_NAMES)("%s's chips are the palette's own resolved page/ink/accent", (style) => {
    render(<StylePicker />);
    const hexes = THEME_HEXES[style].light;

    const chips = [0, 1, 2].map(
      (index) => screen.getByTestId(`style-chip-${style}-${index}`).props.style.backgroundColor,
    );

    expect(chips).toEqual([hexes["--background"], hexes["--foreground"], hexes["--primary"]]);
  });

  it("no two palettes show the same three chips", () => {
    render(<StylePicker />);

    const swatches = STYLE_NAMES.map((style) =>
      [0, 1, 2]
        .map(
          (index) => screen.getByTestId(`style-chip-${style}-${index}`).props.style.backgroundColor,
        )
        .join(),
    );

    expect(new Set(swatches).size).toBe(STYLE_NAMES.length);
  });

  // Palette names are proper nouns and are deliberately NOT run through i18n;
  // the chrome around them is. A label rendered through `t()` would come back as
  // the key here, since the test renders without translations loaded.
  it.each(STYLE_NAMES)("shows %s's name untranslated", (style) => {
    render(<StylePicker />);

    expect(screen.getAllByText(STYLE_LABELS[style]).length).toBeGreaterThan(0);
  });
});
