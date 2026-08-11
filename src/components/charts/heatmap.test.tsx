import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { Heatmap, type HeatmapColumn } from "@/src/components/charts/heatmap";

function column(
  key: string,
  cells: { key: string; color: string | null }[],
  monthLabel: string | null = null,
): HeatmapColumn {
  return {
    key,
    monthLabel,
    cells: cells.map((cell) => ({ ...cell, accessibilityLabel: cell.key })),
  };
}

describe("Heatmap", () => {
  it("renders nothing without columns", () => {
    const { toJSON } = render(<Heatmap columns={[]} />);
    expect(toJSON()).toBeNull();
  });

  /**
   * #871: a labelled column with no LATER labelled column keeps the minimum
   * segment width (one column span), and a fixed `width` at 15px ellipsized
   * "Aug" into "A…" — hit by any young account, or a month boundary at the
   * right edge. The final segment takes `minWidth` instead, so its label
   * renders at natural width; interior segments keep the fixed width so their
   * labels cannot push later ones off their columns.
   */
  it("lets the final month label render at natural width instead of clipping (#871)", () => {
    // One-column history: the only label IS the final segment.
    render(<Heatmap columns={[column("w1", [{ key: "d1", color: "#123456" }], "Aug")]} />);
    const single = StyleSheet.flatten(screen.getByText("Aug").props.style);
    expect(single.minWidth).toEqual(expect.any(Number));
    expect(single.width).toBeUndefined();
  });

  it("keeps interior month labels on fixed widths, only the last on minWidth", () => {
    render(
      <Heatmap
        columns={[
          column("w1", [{ key: "d1", color: "#123456" }], "Jul"),
          column("w2", [{ key: "d2", color: "#123456" }], "Aug"),
        ]}
      />,
    );
    // "Jul" stretches to the next labelled column with a fixed width…
    expect(StyleSheet.flatten(screen.getByText("Jul").props.style).width).toEqual(
      expect.any(Number),
    );
    // …while "Aug", the newest, is free to overflow its single column span.
    const last = StyleSheet.flatten(screen.getByText("Aug").props.style);
    expect(last.minWidth).toEqual(expect.any(Number));
    expect(last.width).toBeUndefined();
  });

  // #717: the hairline used to mark ONLY empty cells, so an unlogged day was
  // outlined while a logged day at the bottom of the ramp (a ~1.26:1 wash) had
  // no border at all - presence read backwards. The border is grid structure
  // now, so it must be identical either way and the fill must be the only
  // difference.
  it("gives filled and empty cells the same hairline, so presence rides on the fill alone", () => {
    render(
      <Heatmap
        columns={[
          column("w1", [
            { key: "logged", color: "hsla(330, 56%, 47%, 0.16)" },
            { key: "empty", color: null },
          ]),
        ]}
      />,
    );

    const logged = screen.getByLabelText("logged");
    const empty = screen.getByLabelText("empty");

    expect(logged.props.style.borderWidth).toBe(StyleSheet.hairlineWidth);
    expect(empty.props.style.borderWidth).toBe(StyleSheet.hairlineWidth);
    expect(logged.props.style.borderColor).toBe(empty.props.style.borderColor);
    expect(logged.props.style.backgroundColor).toBe("hsla(330, 56%, 47%, 0.16)");
    expect(empty.props.style.backgroundColor).toBe("transparent");
  });

  it("outlines the selected cell more heavily than its neighbours", () => {
    render(
      <Heatmap
        columns={[
          column("w1", [
            { key: "a", color: null },
            { key: "b", color: null },
          ]),
        ]}
        selectedKey="b"
      />,
    );

    expect(screen.getByLabelText("a").props.style.borderWidth).toBe(StyleSheet.hairlineWidth);
    expect(screen.getByLabelText("b").props.style.borderWidth).toBe(1.5);
    expect(screen.getByLabelText("a").props.style.borderColor).not.toBe(
      screen.getByLabelText("b").props.style.borderColor,
    );
  });

  it("renders out-of-range slots as bare spacers, so no entry and not a day still differ", () => {
    const { toJSON } = render(
      <Heatmap
        columns={[
          {
            key: "w1",
            monthLabel: null,
            cells: [null, { key: "day", color: null, accessibilityLabel: "day" }],
          },
        ]}
      />,
    );

    // The padding slot carries no accessibility label at all, so it is absent
    // from the tree a screen reader walks - unlike an in-range empty day.
    expect(screen.queryByLabelText("pad-0")).toBeNull();
    expect(screen.getByLabelText("day")).toBeTruthy();
    expect(JSON.stringify(toJSON())).toContain("day");
  });
});
