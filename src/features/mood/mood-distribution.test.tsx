import { screen } from "@testing-library/react-native";

import { MoodDistributionChart } from "@/src/features/mood/mood-distribution";
import { getMoodDistribution } from "@/src/features/mood/summaries";
import { renderWithProviders } from "@/test/render-with-providers";

describe("getMoodDistribution", () => {
  it("counts each level, index 0 being score 1", () => {
    expect(
      getMoodDistribution([{ moodScore: 1 }, { moodScore: 3 }, { moodScore: 3 }, { moodScore: 5 }]),
    ).toEqual([1, 0, 2, 0, 1]);
  });

  it("returns five zeros for no points", () => {
    expect(getMoodDistribution([])).toEqual([0, 0, 0, 0, 0]);
    expect(getMoodDistribution(undefined)).toEqual([0, 0, 0, 0, 0]);
  });

  // Clamping would fold a bad row into a real level and inflate its count.
  it("ignores scores outside 1-5 rather than clamping them", () => {
    expect(getMoodDistribution([{ moodScore: 0 }, { moodScore: 6 }, { moodScore: 2.5 }])).toEqual([
      0, 0, 0, 0, 0,
    ]);
  });
});

describe("MoodDistributionChart", () => {
  // The stacked pill (#881): only levels WITH check-ins take bar width; the
  // legend names all five with their counts.
  it("renders a legend entry with its count for every level, in scale order", () => {
    renderWithProviders(<MoodDistributionChart counts={[2, 0, 3, 1, 0]} />);

    expect(screen.getByText("Awful · 2")).toBeTruthy();
    expect(screen.getByText("Bad · 0")).toBeTruthy();
    expect(screen.getByText("Okay · 3")).toBeTruthy();
    expect(screen.getByText("Good · 1")).toBeTruthy();
    expect(screen.getByText("Great · 0")).toBeTruthy();
    // Counts, never percentages: "33%" from three check-ins claims a precision
    // the data has not earned (#701, upheld by #881).
    expect(screen.queryByText(/%/)).toBeNull();
  });

  /**
   * Zero-count levels take NO bar width — absence is absence, never a faint
   * 0.25 swatch that would read as a small value (#691's measured-invisible
   * constraint, upheld by #881). Only the three non-zero segments render.
   */
  it("gives bar width only to levels with check-ins", () => {
    renderWithProviders(<MoodDistributionChart counts={[2, 0, 3, 1, 0]} />);

    expect(screen.getByLabelText("Awful: 2 check-ins")).toBeTruthy();
    expect(screen.getByLabelText("Okay: 3 check-ins")).toBeTruthy();
    expect(screen.getByLabelText("Good: 1 check-in")).toBeTruthy();
    // No segment exists for the zero levels; their fact lives in the legend.
    expect(screen.queryByLabelText("Bad: 0 check-ins")).toBeNull();
    expect(screen.queryByLabelText("Great: 0 check-ins")).toBeNull();
  });

  /**
   * The fill is the single-hue `be` ramp at the score→step mapping the heatmap
   * and `score-tone.ts` use — monotonic, so position + fill agree on the
   * ordinal. NOT the design's five hues (#881: rejected on measurement — hue
   * encodes data, not identity, per #691).
   */
  it("fills each segment with its be-ramp step, worst faintest to best fullest", () => {
    renderWithProviders(<MoodDistributionChart counts={[2, 0, 3, 1, 5]} />);

    const classOf = (label: string) => String(screen.getByLabelText(label).props.className);
    expect(classOf("Awful: 2 check-ins")).toContain("bg-be/[0.16]");
    expect(classOf("Okay: 3 check-ins")).toContain("bg-be/[0.52]");
    expect(classOf("Good: 1 check-in")).toContain("bg-be/[0.74]");
    expect(classOf("Great: 5 check-ins")).toContain("bg-be");
  });

  /**
   * The mandatory non-colour cue between adjacent segments (#691, carried into
   * #881's resolution): a 1px hairline separates every segment after the first
   * visible one, so neighbours stay distinct in greyscale.
   */
  it("separates adjacent segments with a hairline, none before the first", () => {
    renderWithProviders(<MoodDistributionChart counts={[2, 0, 3, 1, 0]} />);

    const classOf = (label: string) => String(screen.getByLabelText(label).props.className);
    expect(classOf("Awful: 2 check-ins")).not.toContain("border-l");
    // "Okay" follows a zero-width level; it is still the SECOND visible
    // segment, so it carries the separator.
    expect(classOf("Okay: 3 check-ins")).toContain("border-l");
    expect(classOf("Good: 1 check-in")).toContain("border-l");
  });

  /**
   * A single entry is one full-width segment plus four `· 0` legend entries —
   * the counted legend is what keeps it reading as "one check-in, and it was
   * Okay" rather than a percentage claim (#881's accepted trade).
   */
  it("reads as one counted check-in at a single entry", () => {
    renderWithProviders(<MoodDistributionChart counts={[0, 0, 1, 0, 0]} />);

    expect(screen.getByLabelText("Okay: 1 check-in")).toBeTruthy();
    expect(screen.getByText("Okay · 1")).toBeTruthy();
    expect(screen.getAllByText(/· 0/)).toHaveLength(4);
    expect(screen.queryByText(/%/)).toBeNull();
  });

  // A glance view, like the mood map: a level is not an entity and #696
  // declined history filters, so there is nowhere to navigate to.
  it("is not interactive", () => {
    renderWithProviders(<MoodDistributionChart counts={[2, 0, 3, 1, 0]} />);

    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
