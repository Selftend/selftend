import { render } from "@testing-library/react-native";
import { Circle, Line, Polygon, Polyline, Text as SvgText } from "react-native-svg";

import { LineChart, type LineChartPoint } from "@/src/components/charts/line-chart";
import { THEME } from "@/lib/theme";
import { DEFAULT_STYLE } from "@/src/lib/theme/styles";
import { themeTokens } from "@/src/lib/theme/projections";
import { hueHsl } from "@/src/features/mindfulness/exercise-hue";

function evenPoints(count: number, label?: (i: number) => string | undefined): LineChartPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    offset: count > 1 ? i / (count - 1) : 0,
    value: (i % 5) + 1,
    label: label?.(i),
  }));
}

describe("LineChart", () => {
  it("renders nothing without points", () => {
    const { toJSON } = render(<LineChart points={[]} domain={[1, 5]} />);
    expect(toJSON()).toBeNull();
  });

  it("renders line, area, per-point dots, gridlines, and labels at sparse density", () => {
    const points = evenPoints(7, (i) => `d${i}`);
    const { UNSAFE_getAllByType } = render(<LineChart points={points} domain={[1, 5]} />);

    expect(UNSAFE_getAllByType(Polyline)).toHaveLength(1);
    expect(UNSAFE_getAllByType(Polygon)).toHaveLength(1);
    expect(UNSAFE_getAllByType(Circle)).toHaveLength(7);
    // 5 gridlines for the integer steps of the 1..5 domain
    expect(UNSAFE_getAllByType(Line)).toHaveLength(5);
    // 5 y labels + 7 day labels
    const texts = UNSAFE_getAllByType(SvgText).map((t) => t.props.children);
    for (const label of ["d0", "d3", "d6", 1, 5]) {
      expect(texts).toContain(label);
    }
  });

  it("thins dots and interior labels past the dense-point limit, keeping line and area", () => {
    const points = evenPoints(60, (i) => `d${i}`);
    const { UNSAFE_getAllByType, UNSAFE_queryAllByType } = render(
      <LineChart points={points} domain={[1, 5]} />,
    );

    expect(UNSAFE_getAllByType(Polyline)).toHaveLength(1);
    expect(UNSAFE_getAllByType(Polygon)).toHaveLength(1);
    expect(UNSAFE_queryAllByType(Circle)).toHaveLength(0);
    const texts = UNSAFE_getAllByType(SvgText).map((t) => t.props.children);
    expect(texts).toContain("d0");
    expect(texts).toContain("d59");
    expect(texts).not.toContain("d30");
  });

  it("renders only the labels the points carry", () => {
    const points = evenPoints(10, (i) => (i % 2 === 0 ? `d${i}` : undefined));
    const { UNSAFE_getAllByType } = render(<LineChart points={points} domain={[1, 5]} />);

    const texts = UNSAFE_getAllByType(SvgText).map((t) => t.props.children);
    expect(texts).toContain("d0");
    expect(texts).not.toContain("d1");
  });

  // INVERTED by #588. The line took the caller's module hue - `hue="be"` on the
  // mood trend, `hue="iris"` on progress. A single-series chart has nothing to
  // tell apart, so its colour carries no information and it takes the app accent
  // (#558). Fails on the old behaviour: the stroke was `be`, and `be` and the
  // accent are different colours.
  it("colors the line from the app accent and grid/labels from neutral tokens", () => {
    const points = evenPoints(5, (i) => `d${i}`);
    const { UNSAFE_getAllByType } = render(<LineChart points={points} domain={[1, 5]} />);

    // Built from the contract rather than hard-coded, so a palette retune moves
    // the expectation with the token. `useAccentHsl` resolves the ACTIVE style,
    // which under test is the default.
    const accent = themeTokens("light", DEFAULT_STYLE)["--primary"].split(/\s+/).join(", ");
    expect(UNSAFE_getAllByType(Polyline)[0].props.stroke).toBe(`hsla(${accent}, 1)`);
    expect(UNSAFE_getAllByType(Polyline)[0].props.stroke).not.toBe(hueHsl("be", false, 1));
    expect(UNSAFE_getAllByType(Line)[0].props.stroke).toBe(THEME.light.border);
    const label = UNSAFE_getAllByType(SvgText)[0];
    expect(label.props.fill).toBe(THEME.light.mutedForeground);
  });
});
