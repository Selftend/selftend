import { fireEvent, screen } from "@testing-library/react-native";

import { ChipRun, SelectableChip } from "@/src/components/app/selectable-chip";
import { renderWithProviders } from "@/test/render-with-providers";

describe("SelectableChip", () => {
  it("announces itself as a checkbox carrying its selected state", () => {
    renderWithProviders(
      <ChipRun>
        <SelectableChip label="Anxious" selected={false} onToggle={jest.fn()} />
        <SelectableChip label="Calm" selected onToggle={jest.fn()} />
      </ChipRun>,
    );

    expect(screen.getByLabelText("Anxious").props.accessibilityRole).toBe("checkbox");
    // `aria-checked`, not `accessibilityState` - react-native-web drops the
    // latter, and the eslint gate forbids it.
    expect(screen.UNSAFE_queryAllByProps({ "aria-checked": true })).toHaveLength(1);
  });

  it("toggles on press", () => {
    const onToggle = jest.fn();
    renderWithProviders(<SelectableChip label="Anxious" selected={false} onToggle={onToggle} />);

    fireEvent.press(screen.getByLabelText("Anxious"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  /**
   * The live AA failure this component exists to end: `text-primary` on
   * `bg-primary/10` is the pattern #691 named a regression and #368 measured at
   * 3.81:1, under AA for 13px text. Fails on the old `EmotionGrid`, which had
   * exactly that pair.
   */
  it("paints a selected chip with primary-ink, never bare primary", () => {
    renderWithProviders(<SelectableChip label="Anxious" selected onToggle={jest.fn()} />);

    const tokens = String(screen.getByText("Anxious").props.className).split(/\s+/);
    expect(tokens).toContain("text-primary-ink");
    // Token-wise, not substring-wise: "text-primary-ink" contains "text-primary".
    expect(tokens).not.toContain("text-primary");
  });

  // Selection is never colour alone: the fill is a 10% tint, so weight and
  // border have to move with it (#691's constraint applies to any two-state
  // control, not just the ramp).
  it("shifts weight and border with selection, not only fill", () => {
    const { rerender } = renderWithProviders(
      <SelectableChip label="Anxious" selected={false} onToggle={jest.fn()} />,
    );
    const unselectedText = String(screen.getByText("Anxious").props.className);
    const unselectedChip = String(screen.getByLabelText("Anxious").props.className);

    rerender(<SelectableChip label="Anxious" selected onToggle={jest.fn()} />);
    const selectedText = String(screen.getByText("Anxious").props.className);
    const selectedChip = String(screen.getByLabelText("Anxious").props.className);

    expect(unselectedText).not.toContain("font-semibold");
    expect(selectedText).toContain("font-semibold");
    expect(unselectedChip).toContain("border-border");
    expect(selectedChip).toContain("border-primary");
  });

  // An inline glyph, not a tile — and not announced, or a screen reader reads
  // the emotion twice.
  it("renders an optional emoji inline and hides it from the reader", () => {
    renderWithProviders(
      <SelectableChip emoji="😰" label="Anxious" selected={false} onToggle={jest.fn()} />,
    );

    // Not reachable by a text query at all: it is `aria-hidden`, so a screen
    // reader announces "Anxious" once rather than the glyph and then the word.
    expect(screen.queryByText("😰")).toBeNull();

    const glyph = screen.getByText("😰", { includeHiddenElements: true });
    // Text-sized and inline, not the 24px stacked glyph of the tile it replaces
    // — the design's caption objects to emoji TILES, not to emoji.
    expect(String(glyph.props.className)).toContain("text-[14px]");
  });

  it("falls back to the label as the accessible name, or takes an override", () => {
    renderWithProviders(
      <>
        <SelectableChip label="Anxious" selected={false} onToggle={jest.fn()} />
        <SelectableChip
          accessibilityLabel="Overwhelmed, custom emotion"
          label="Overwhelmed"
          selected={false}
          onToggle={jest.fn()}
        />
      </>,
    );

    expect(screen.getByLabelText("Anxious")).toBeTruthy();
    expect(screen.getByLabelText("Overwhelmed, custom emotion")).toBeTruthy();
  });
});
