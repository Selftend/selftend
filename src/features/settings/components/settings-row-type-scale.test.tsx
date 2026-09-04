import { render, screen } from "@testing-library/react-native";
import { useWindowDimensions } from "react-native";

import { SettingsRow } from "@/src/features/settings/components/settings-row";
import { WIDE_WIDTH } from "@/src/features/settings/use-wide-frame";

jest.mock("react-native/Libraries/Utilities/useWindowDimensions", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockDimensions = useWindowDimensions as jest.MockedFunction<typeof useWindowDimensions>;

/**
 * The row's type scale, D6 + D9 (#1830).
 *
 * ⚠️ Jest reports a **750px** window by default and the e2e viewport is Desktop
 * Chrome, so both shipped test layers are blind to every `useWindowDimensions`
 * phone branch. Mocking the hook is the only way this file can see the
 * step-down at all.
 */
function renderAt(width: number, props?: { description?: string }) {
  mockDimensions.mockReturnValue({ width, height: 800, scale: 2, fontScale: 1 });

  return render(
    <SettingsRow
      icon="shield"
      label="Privacy"
      description={props?.description}
      trailing={{ kind: "chevron" }}
      onPress={() => {}}
      testID="row"
    />,
  );
}

const classesOf = (text: string): string[] =>
  String(screen.getByText(text).props.className ?? "")
    .split(/\s+/)
    .filter(Boolean);

describe("SettingsRow type scale", () => {
  beforeEach(() => jest.clearAllMocks());

  /**
   * ☠️ The literal, pinned. Every width below is written as 640 / 639 rather
   * than `WIDE_WIDTH ± 1` on purpose: a test phrased in terms of the constant
   * MOVES WITH IT, so changing 640 to anything else leaves the whole file green.
   * Confirmed by mutation — that version survived exactly this change.
   */
  it("steps at 640, the width the colophon already stepped at", () => {
    expect(WIDE_WIDTH).toBe(640);
  });

  it("uses the kit's sizes on the wide frame", () => {
    renderAt(640, { description: "What we store, and why." });

    expect(classesOf("Privacy")).toContain("text-[14.5px]");
    expect(classesOf("What we store, and why.")).toContain("text-[12.5px]");
  });

  it("steps label and description down below 640", () => {
    renderAt(639, { description: "What we store, and why." });

    expect(classesOf("Privacy")).toContain("text-[14px]");
    expect(classesOf("What we store, and why.")).toContain("text-[12px]");
  });

  /** The boundary itself is wide — `>= 640`, not `> 640`. */
  it("treats exactly 640 as the wide frame", () => {
    renderAt(640);

    expect(classesOf("Privacy")).toContain("text-[14.5px]");
  });

  it("steps the icons from 20px to 19px, marks included", () => {
    const wide = renderAt(640);
    const wideIcons = wide.UNSAFE_root.findAll((node) => typeof node.props?.name === "string").map(
      (node) => String(node.props.className ?? ""),
    );
    // Leading glyph + the chevron: both step, or the row mixes two scales.
    expect(wideIcons.filter((c) => c.includes("size-5")).length).toBeGreaterThanOrEqual(2);
    wide.unmount();

    const narrow = renderAt(639);
    const narrowIcons = narrow.UNSAFE_root.findAll(
      (node) => typeof node.props?.name === "string",
    ).map((node) => String(node.props.className ?? ""));
    expect(narrowIcons.filter((c) => c.includes("size-[19px]")).length).toBeGreaterThanOrEqual(2);
    expect(narrowIcons.some((c) => c.includes("size-5"))).toBe(false);
  });

  /**
   * ☠️ The rule this ticket exists to NOT break. `14a`'s 390px frame drops some
   * descriptions, but that frame is hand-tuning: `Delete my account` keeps the
   * page's longest description at full size on it. The a11y cost also runs
   * backwards — `description` is the `accessibilityHint`, which iOS and Android
   * announce and web never does, so a phone-only drop would remove it on
   * exactly the platforms that use it.
   */
  it("keeps the description, its hint and its wrapping at every width", () => {
    for (const width of [640, 639, 320]) {
      const view = renderAt(width, { description: "What we store, and why." });

      expect(screen.getByText("What we store, and why.")).toBeTruthy();
      expect(screen.getByTestId("row").props.accessibilityHint).toBe("What we store, and why.");
      // No truncation, at any width.
      expect(screen.getByText("What we store, and why.").props.numberOfLines).toBeUndefined();

      view.unmount();
    }
  });
});
