import { screen } from "@testing-library/react-native";
import { useWindowDimensions } from "react-native";

import { SettingsHero } from "@/src/features/settings/components/settings-hero";
import { WIDE_WIDTH } from "@/src/features/settings/use-wide-frame";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("react-native/Libraries/Utilities/useWindowDimensions", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockDimensions = useWindowDimensions as jest.MockedFunction<typeof useWindowDimensions>;

function renderAt(width: number) {
  mockDimensions.mockReturnValue({ width, height: 800, scale: 2, fontScale: 1 });

  return renderWithProviders(<SettingsHero />);
}

const INTRO = "Quiet defaults, and control over your account and data.";

const classesOf = (text: string): string[] =>
  String(screen.getByText(text).props.className ?? "")
    .split(/\s+/)
    .filter(Boolean);

describe("SettingsHero", () => {
  beforeEach(() => jest.clearAllMocks());

  it("steps the intro down on the phone frame", () => {
    const wide = renderAt(WIDE_WIDTH);
    expect(classesOf(INTRO)).toContain("text-[15px]");
    wide.unmount();

    renderAt(WIDE_WIDTH - 1);
    expect(classesOf(INTRO)).toContain("text-[13.5px]");
  });

  /**
   * ☠️ The two things #1830 must NOT touch, asserted at BOTH widths.
   *
   * The h1: `14a` draws 32 and steps it to 27, but #1788 ruled the shipped
   * 36/800 against the design system's own kit and the drawing's numbers as the
   * hand-rolled ones — so the base the drawing steps down from is not this
   * page's base, and #1830's acceptance criteria say the h1 is untouched.
   *
   * The eyebrow: this is `variant="eyebrow"` doing the PAGE-eyebrow job, which
   * D7 explicitly must not reach. #1828 gave the group labels their own
   * component precisely so this one could stay at 700 / 0.14em.
   */
  it("leaves the h1 and the page eyebrow alone at every width", () => {
    for (const width of [WIDE_WIDTH, WIDE_WIDTH - 1, 320]) {
      const view = renderAt(width);

      const h1 = classesOf("Settings");
      expect(h1).toContain("text-[36px]");
      expect(h1).toContain("font-extrabold");
      expect(h1).not.toContain("text-[27px]");
      expect(h1).not.toContain("text-[32px]");

      const eyebrow = classesOf("Account");
      expect(eyebrow).toContain("font-bold");
      expect(eyebrow).toContain("tracking-[0.14em]");
      expect(eyebrow).not.toContain("font-semibold");

      view.unmount();
    }
  });
});
