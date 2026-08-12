import { fireEvent, screen } from "@testing-library/react-native";

import enSleep from "@/src/i18n/locales/en/sleep.json";
import { QualityScale } from "@/src/features/sleep/quality-scale";
import { renderWithProviders } from "@/test/render-with-providers";

const WORDS = ["Very poor", "Poor", "Fair", "Good", "Excellent"];

describe("QualityScale", () => {
  it("renders the five named options in order", () => {
    renderWithProviders(<QualityScale value={null} onChange={() => {}} />);

    const group = screen.getByTestId("sleep-quality-scale");
    // The order is the scale. Reading the rendered labels off the group in
    // tree order is what pins it - asserting each one exists would pass on a
    // shuffled row.
    const rendered = screen
      .getAllByRole("radio")
      .map((node) => node.props.accessibilityLabel as string);
    expect(rendered).toEqual(WORDS);
    expect(group).toBeTruthy();
  });

  it("labels the options from the namespace's canonical quality names", () => {
    // One source of truth per level. `quality.1..5` is what the detail screen,
    // the recent list and the quality-mix chart already read, so a second
    // private copy would let a translator retitle one level and leave the
    // picker and the chart naming the same night differently. Nothing else
    // catches that: locale-parity checks key *presence across locales*, not
    // value *agreement across keys*.
    renderWithProviders(<QualityScale value={null} onChange={() => {}} />);

    const rendered = screen
      .getAllByRole("radio")
      .map((node) => node.props.accessibilityLabel as string);
    expect(rendered).toEqual([
      enSleep.quality["1"],
      enSleep.quality["2"],
      enSleep.quality["3"],
      enSleep.quality["4"],
      enSleep.quality["5"],
    ]);
  });

  it("names each option by its word, not by a number", () => {
    renderWithProviders(<QualityScale value={3} onChange={() => {}} />);

    for (const word of WORDS) {
      expect(screen.getByRole("radio", { name: word })).toBeTruthy();
    }
    // The instrument swap is the point: no "3 of 5" survives anywhere on it.
    expect(screen.queryByText("3/5")).toBeNull();
    expect(screen.queryByLabelText(/\d of \d/)).toBeNull();
  });

  it("reports the tapped option as its 1..5 value", () => {
    const onChange = jest.fn();
    renderWithProviders(<QualityScale value={null} onChange={onChange} />);

    fireEvent.press(screen.getByRole("radio", { name: "Fair" }));
    expect(onChange).toHaveBeenCalledWith(3);

    fireEvent.press(screen.getByRole("radio", { name: "Excellent" }));
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it("exposes the options as radios in a labelled radiogroup", () => {
    renderWithProviders(<QualityScale value={4} onChange={() => {}} />);

    // byRole skips plain Views, so the group's semantics are read off its label.
    expect(screen.getByLabelText("How it felt").props.accessibilityRole).toBe("radiogroup");
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(screen.getByRole("radio", { name: "Good" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Fair" })).not.toBeChecked();
  });

  it("wraps rather than sizing the options into equal columns", () => {
    // The 360dp answer (#774): a wrapping run. `flex-1` columns would give
    // "Excellent" ~53dp of a ~57dp word and clip it, since a lone word has no
    // break opportunity. This pins the layout choice so a later tidy-up cannot
    // quietly turn it back into five columns.
    renderWithProviders(<QualityScale value={null} onChange={() => {}} />);

    const group = screen.getByTestId("sleep-quality-scale");
    expect(group.props.className).toContain("flex-wrap");
    for (const option of screen.getAllByRole("radio")) {
      expect(option.props.className).not.toContain("flex-1");
    }
  });
});
