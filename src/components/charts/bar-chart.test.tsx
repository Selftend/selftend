import { render, screen } from "@testing-library/react-native";
import { LinearGradient } from "expo-linear-gradient";

import { BarChart } from "@/src/components/charts/bar-chart";
import { tintStripeColors } from "@/src/features/mindfulness/exercise-hue";

describe("BarChart", () => {
  it("renders nothing without bars", () => {
    const { toJSON } = render(<BarChart bars={[]} />);
    expect(toJSON()).toBeNull();
  });

  it("scales against a fixed max in absolute mode, clamping values above it", () => {
    render(
      <BarChart
        bars={[{ value: 600 }, { value: 300 }, { value: 900 }]}
        max={600}
        barAreaHeight={80}
      />,
    );

    const heights = screen.getAllByTestId("bar-chart-bar").map((b) => b.props.style.height);
    expect(heights).toEqual([80, 40, 80]);
  });

  it("normalizes against the largest value with a denominator floor of 1", () => {
    render(<BarChart bars={[{ value: 4 }, { value: 2 }]} barAreaHeight={64} minBarHeight={0} />);
    let heights = screen.getAllByTestId("bar-chart-bar").map((b) => b.props.style.height);
    expect(heights).toEqual([64, 32]);

    render(<BarChart bars={[{ value: 0.5 }]} barAreaHeight={64} minBarHeight={0} />);
    heights = screen.getAllByTestId("bar-chart-bar").map((b) => b.props.style.height);
    expect(heights).toEqual([32]);
  });

  it("floors short bars, stubs zeros, and hides null values", () => {
    render(
      <BarChart
        bars={[{ value: 10 }, { value: 0.1 }, { value: 0 }, { value: null }]}
        barAreaHeight={64}
        minBarHeight={6}
        zeroHeight={2}
      />,
    );

    const heights = screen.getAllByTestId("bar-chart-bar").map((b) => b.props.style.height);
    expect(heights).toEqual([64, 6, 2, 0]);
  });

  it("applies the regular floor to zero values when no zeroHeight is given", () => {
    render(<BarChart bars={[{ value: 5 }, { value: 0 }]} barAreaHeight={64} minBarHeight={6} />);

    const heights = screen.getAllByTestId("bar-chart-bar").map((b) => b.props.style.height);
    expect(heights).toEqual([64, 6]);
  });

  it("fills bars from the chart tint, the highlight tint, or a per-bar override", () => {
    render(
      <BarChart
        bars={[{ value: 1 }, { value: 2, highlighted: true }, { value: 3, tintClass: "bg-act" }]}
        tintClass="bg-ink/40"
        highlightTintClass="bg-ink"
      />,
    );

    const classes = screen.getAllByTestId("bar-chart-bar").map((b) => b.props.className as string);
    expect(classes[0]).toContain("bg-ink/40");
    expect(classes[1]).toContain("bg-ink");
    expect(classes[1]).not.toContain("bg-ink/40");
    expect(classes[2]).toContain("bg-act");
  });

  it("renders gradient bars from token-derived colors instead of class tints", () => {
    const gradient = tintStripeColors("think", false);
    const { UNSAFE_getAllByType } = render(
      <BarChart bars={[{ value: 1 }, { value: 2 }]} gradient={gradient} />,
    );

    const gradients = UNSAFE_getAllByType(LinearGradient);
    expect(gradients).toHaveLength(2);
    expect(gradients[0].props.colors).toEqual(gradient);
  });

  it("renders top and bottom labels and caps column width", () => {
    render(
      <BarChart
        bars={[{ value: 1, topLabel: "7.5h", label: "1/2" }]}
        maxBarWidth={44}
        barClassName="rounded-t-md"
      />,
    );

    expect(screen.getByText("7.5h")).toBeTruthy();
    expect(screen.getByText("1/2")).toBeTruthy();
    const barClasses = (screen.getByTestId("bar-chart-bar").props.className as string).split(" ");
    expect(barClasses).toContain("rounded-t-md");
    expect(barClasses).not.toContain("rounded-md");
  });
});
