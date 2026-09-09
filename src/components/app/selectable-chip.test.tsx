import { fireEvent, screen } from "@testing-library/react-native";
import { View } from "react-native";

import { ChipRun, SelectableChip } from "@/src/components/app/selectable-chip";
import { setPlatformOS } from "@/test/modal-marker-mock";
import { renderWithProviders } from "@/test/render-with-providers";

afterEach(() => {
  setPlatformOS("ios");
});

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

/**
 * #1725: the same chip as ONE OF a set rather than any of a set. The chip does
 * not draw the `radiogroup` - the caller owns the group, its roving focus and
 * which chip is checked - so the tests wrap it the way a caller would.
 */
describe("SelectableChip as a radio", () => {
  it("announces itself as a radio whose checked state follows `selected`", () => {
    renderWithProviders(
      <View accessibilityLabel="What is it about?" accessibilityRole="radiogroup" role="radiogroup">
        <SelectableChip role="radio" label="Bug" selected={false} onToggle={jest.fn()} />
        <SelectableChip role="radio" label="Idea" selected onToggle={jest.fn()} />
      </View>,
    );

    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.getByRole("radio", { name: "Idea", checked: true })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Bug", checked: false })).toBeTruthy();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("stays a checkbox when no role is asked for", () => {
    renderWithProviders(<SelectableChip label="Calm" selected onToggle={jest.fn()} />);

    expect(screen.getByRole("checkbox", { name: "Calm", checked: true })).toBeTruthy();
    expect(screen.queryByRole("radio")).toBeNull();
  });

  /**
   * ☠️ The RNW Space-activation trap, in its roving form. The caller's
   * `useRovingFocus().getItemProps(index, onToggle)` already owns `onKeyDown`
   * (arrows move, Space selects); if the chip kept its own Space handler
   * underneath, whichever spread came last would clobber the other - and a
   * merge of the two would fire the selection twice per Space.
   */
  it("takes the caller's roving-focus props in place of its own Space handler", () => {
    setPlatformOS("web");
    const onKeyDown = jest.fn();
    renderWithProviders(
      <SelectableChip
        role="radio"
        label="Bug"
        selected={false}
        onToggle={jest.fn()}
        rovingProps={{ tabIndex: -1, onKeyDown }}
      />,
    );

    const chip = screen.getByRole("radio", { name: "Bug" });
    expect(chip.props.onKeyDown).toBe(onKeyDown);
    expect(chip.props.tabIndex).toBe(-1);
  });

  it("without roving props, a radio chip still selects on Space on web - RNW never does that for it", () => {
    setPlatformOS("web");
    const onToggle = jest.fn();
    renderWithProviders(
      <SelectableChip role="radio" label="Bug" selected={false} onToggle={onToggle} />,
    );

    const chip = screen.getByRole("radio", { name: "Bug" });
    chip.props.onKeyDown({ key: " ", repeat: false, preventDefault: jest.fn() });
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

/**
 * The wrap is `ChipRun`'s whole reason to exist: a run too wide for its column
 * has to take another row, because the alternative is a clipped chip nobody can
 * press. The support page's e2e used to prove this incidentally, by measuring
 * that its four chips landed on two rows at 360dp - but that row count came from
 * the form card's `px-6`, and it stopped being true when the card went (#1778).
 * Pinned here instead, where it belongs and cannot drift with a caller's width.
 */
describe("ChipRun", () => {
  it("wraps its chips rather than letting them overflow one row", () => {
    renderWithProviders(
      <ChipRun className="mt-2">
        <SelectableChip label="Bug" selected={false} onToggle={jest.fn()} />
      </ChipRun>,
    );

    // Walked from the chip rather than matched by testID: the wrap lives on
    // ChipRun's own View, and this stays true however the chip is nested.
    let node = screen.getByLabelText("Bug").parent;
    const classNames: string[] = [];
    while (node) {
      if (typeof node.props?.className === "string") classNames.push(node.props.className);
      node = node.parent;
    }

    const run = classNames.find((name) => name.includes("flex-wrap"));
    expect(run).toBeDefined();
    expect(run).toContain("flex-row");
    // The caller's own class lands on that same View, so the run stays composable.
    expect(run).toContain("mt-2");
  });
});
