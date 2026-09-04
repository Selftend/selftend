import { screen, within } from "@testing-library/react-native";

import { RecordBandCard } from "@/src/features/progress/record-band-card";
import { renderWithProviders } from "@/test/render-with-providers";

/**
 * Frozen so the three bodies gate on a known span. `buildRecordBand` takes
 * `now` for exactly this reason; the card does not, so the clock is the only
 * way to place "today" from out here.
 */
const TODAY = "2026-09-04T12:00:00";

function renderBand(dayKeys: string[] | undefined) {
  jest.useFakeTimers({ now: new Date(TODAY) });
  try {
    return renderWithProviders(<RecordBandCard dayKeys={dayKeys} lang="en" />);
  } finally {
    jest.useRealTimers();
  }
}

describe("RecordBandCard", () => {
  it("names itself and says what a mark means, in every state", () => {
    renderBand(["2026-07-01", "2026-09-03"]);

    expect(screen.getByText("Your days")).toBeTruthy();
    expect(screen.getByText("One mark for each day with a record.")).toBeTruthy();
  });

  /**
   * The three bodies (#1906). ☠️ Only the BODY changes - the title and the
   * description above are identical in all three, which is why they are
   * asserted once above rather than per state.
   */
  it("says the record has not started when there is nothing at all", () => {
    renderBand([]);

    expect(screen.getByText("Days you record anything will appear here.")).toBeTruthy();
    expect(screen.queryByTestId("record-band")).toBeNull();
  });

  /**
   * ☠️ The single-day state needs its OWN string. "Nothing here yet" would be a
   * lie about the person's own record - they did record something - and a count
   * would be the count line this card refuses.
   */
  it("has a separate line for a record that starts today, never the empty one", () => {
    renderBand(["2026-09-04", "2026-09-04"]);

    expect(screen.getByText("Your record starts here.")).toBeTruthy();
    expect(screen.queryByText("Days you record anything will appear here.")).toBeNull();
    expect(screen.queryByTestId("record-band")).toBeNull();
  });

  /**
   * ☠️ **Loading is not empty.** For one revision the card mapped an in-flight
   * query to the empty body, so someone with years of history was told on first
   * paint that nothing was there. It now renders no body line at all until the
   * record is known.
   */
  it("says nothing at all while the query is still in flight", () => {
    renderBand(undefined);

    expect(screen.getByText("Your days")).toBeTruthy();
    expect(screen.queryByText("Days you record anything will appear here.")).toBeNull();
    expect(screen.queryByText("Your record starts here.")).toBeNull();
    expect(screen.queryByTestId("record-band")).toBeNull();
  });

  it("gates on span, not count: one record three days back draws the band", () => {
    renderBand(["2026-09-01"]);

    expect(screen.getByTestId("record-band")).toBeTruthy();
    expect(screen.queryByText("Your record starts here.")).toBeNull();
  });

  /**
   * ☠️ **THE MARKS ARE INERT.** #1840's stated reason this screen is safe is
   * that it holds no content - *"you cannot re-read a thought record from a
   * dot."* A pressable dot puts that back, and a day names no tool for a door
   * to target anyway.
   */
  it("draws marks that cannot be pressed", () => {
    renderBand(["2026-07-01", "2026-08-02", "2026-09-03"]);

    const band = screen.getByTestId("record-band");

    expect(within(band).queryByRole("button")).toBeNull();
    expect(within(band).queryByRole("link")).toBeNull();
    // Nothing in the band carries a press handler of any kind - a role-less
    // Pressable would slip past the two queries above.
    //
    // ⚠️ No `?? []` fallback: if `findAll` ever stopped existing, a defaulted
    // empty array would make this assertion pass forever on a band full of
    // buttons. Let it throw instead.
    expect(band.findAll((node) => Boolean(node.props?.onPress))).toEqual([]);
  });

  /**
   * ☠️ **No count line, no caption under the band.** #1840 cut the spanning
   * scalar; a caption restores it in exactly the numerator-over-drawn-denominator
   * form #1834 warned about. The month ticks are the only text the band carries,
   * and they name months rather than totals.
   */
  it("carries no count and no caption - the only text on the band is month ticks", () => {
    renderBand(["2026-07-01", "2026-07-02", "2026-08-02", "2026-09-03"]);

    const band = screen.getByTestId("record-band");
    const text = within(band)
      .queryAllByText(/.+/)
      .map((node) => node.props.children)
      .join(" | ");

    // Four records across three months: no "4", no "3", no "days", no "records".
    expect(text).toBe("Jul 2026 | Aug | Sep");
    expect(within(band).queryByText(/record|day|total/i)).toBeNull();

    /*
     * ☠️ And the same check at CARD level, because the criterion is "no count
     * line, no caption UNDER the band" - a total rendered as a sibling of the
     * band, inside the same `CardContent`, is invisible to a band-scoped query.
     * The card's only text is its title, its description, and the ticks.
     */
    const cardText = screen
      .queryAllByText(/.+/)
      .map((node) => String(node.props.children))
      .join(" | ");

    expect(cardText).toBe(
      "Your days | One mark for each day with a record. | Jul 2026 | Aug | Sep",
    );
  });

  /**
   * ☠️ **No range control.** A changeable window invites comparison between
   * windows, which re-supplies the denominator #1834 removed.
   */
  it("offers no range control", () => {
    renderBand(["2026-07-01", "2026-09-03"]);

    for (const label of ["7d", "30d", "90d", "Custom", "All time"]) {
      expect(screen.queryByText(label)).toBeNull();
    }
  });

  /**
   * ☠️ **One summary node, labelled by EXTENT ONLY.** An a11y-only count was
   * refused on #1906: handing AT users the figure that was cut for being
   * harmful is worse than the gap. A screen-reader user gets almost nothing
   * from this card, and that is a recorded cost of the shape rather than a
   * defect to patch with a number.
   */
  it("exposes one summary node naming the extent, and no number but the year", () => {
    renderBand(["2026-07-01", "2026-08-02", "2026-09-03"]);

    const band = screen.getByTestId("record-band");

    expect(band.props.accessible).toBe(true);
    expect(band.props.accessibilityLabel).toBe("Your days, July 2026 to today.");
    // ☠️ Both roles. react-native-web drops the native-only `accessible` prop
    // and refuses a name on a generic div, so `role="img"` is what actually
    // carries this label in a browser - and jest's iOS preset would pass
    // happily without it. `mood-week-hero.tsx` pins the same pair.
    expect(band.props.accessibilityRole).toBe("image");
    expect(band.props.role).toBe("img");
    // The marks themselves are not announced one by one.
    expect(within(band).queryAllByLabelText(/mark/i)).toEqual([]);
  });

  /**
   * ☠️ **A mark does not say which tool it came from.** `src/lib/theme/encoding.ts`
   * keeps hue only where colour carries information read off it, and
   * "distinguishes items in a set" is explicitly not enough. Independently
   * moot - the unit is the day, and a day names no tool.
   *
   * Asserted as "every mark is the same class": a per-tool hue would have to
   * differ between them.
   */
  it("draws every mark identically, so no mark encodes a tool", () => {
    renderBand(["2026-07-01", "2026-08-02", "2026-09-03"]);

    const band = screen.getByTestId("record-band");
    // ⚠️ Host nodes only. `findAll` walks composite AND host nodes, so an
    // unfiltered walk returns each mark twice and a count assertion reads
    // double - which is how this test first failed.
    const marks = band.findAll(
      (node) =>
        typeof node.type === "string" &&
        String(node.props?.className ?? "").includes("rounded-full"),
    ) as { props: { className?: string } }[];

    expect(marks.length).toBe(3);
    expect(new Set(marks.map((mark) => mark.props.className)).size).toBe(1);
  });
});
