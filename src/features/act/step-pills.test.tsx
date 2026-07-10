import { fireEvent, screen } from "@testing-library/react-native";
import { Platform } from "react-native";

import { StepPills } from "@/src/features/act/step-pills";
import { renderWithProviders } from "@/test/render-with-providers";

const mockUseWindowDimensions = jest.fn();

// Partial mock via Proxy (mirrors wizard-screen.test.tsx / app-onboarding-wizard.test.tsx):
// spreading `{...actual}` would eagerly evaluate every lazy getter React Native's module
// defines, so only intercept the one export this suite needs to control.
jest.mock("react-native", () => {
  const actual = jest.requireActual("react-native");
  return new Proxy(actual, {
    get(target, prop, receiver) {
      if (prop === "useWindowDimensions") {
        return mockUseWindowDimensions;
      }
      return Reflect.get(target, prop, receiver);
    },
  });
});

const NARROW_WIDTH = { width: 390, height: 844, scale: 3, fontScale: 1 };
const WIDE_WIDTH = { width: 1024, height: 768, scale: 1, fontScale: 1 };

type Step = "thought" | "category" | "before";
const steps: Step[] = ["thought", "category", "before"];
const labels: Record<Step, string> = {
  thought: "Thought",
  category: "Category",
  before: "Before",
};

function renderPills(current: Step, onSelect: (s: Step) => void) {
  return renderWithProviders(
    <StepPills steps={steps} current={current} onSelect={onSelect} getLabel={(s) => labels[s]} />,
  );
}

describe("StepPills", () => {
  it("collapses to a single summary row on narrow screens", () => {
    mockUseWindowDimensions.mockReturnValue(NARROW_WIDTH);
    renderPills("category", jest.fn());

    expect(screen.getByText("Step 2 of 3 · Category")).toBeTruthy();
    expect(screen.queryByText("1. Thought")).toBeNull();
    expect(screen.queryByText("2. Category")).toBeNull();
    expect(screen.queryByText("3. Before")).toBeNull();
  });

  it("expands to the full pill list on tap and keeps onSelect working", () => {
    mockUseWindowDimensions.mockReturnValue(NARROW_WIDTH);
    const onSelect = jest.fn();
    renderPills("category", onSelect);

    fireEvent.press(screen.getByLabelText(/Show all steps/));

    expect(screen.getByText("1. Thought")).toBeTruthy();
    expect(screen.getByText("2. Category")).toBeTruthy();
    expect(screen.getByText("3. Before")).toBeTruthy();

    fireEvent.press(screen.getByText("1. Thought"));
    expect(onSelect).toHaveBeenCalledWith("thought");

    expect(screen.getByLabelText(/Hide steps/)).toBeTruthy();
  });

  it("shows the full pill list on wide screens with no toggle", () => {
    mockUseWindowDimensions.mockReturnValue(WIDE_WIDTH);
    renderPills("category", jest.fn());

    expect(screen.getByText("1. Thought")).toBeTruthy();
    expect(screen.getByText("2. Category")).toBeTruthy();
    expect(screen.getByText("3. Before")).toBeTruthy();
    expect(screen.queryByText("Step 2 of 3 · Category")).toBeNull();
    expect(screen.queryByLabelText(/Show all steps/)).toBeNull();
  });

  it("marks the active step as selected on native", () => {
    mockUseWindowDimensions.mockReturnValue(WIDE_WIDTH);
    renderPills("category", jest.fn());

    expect(screen.getByRole("button", { name: "2. Category" })).toBeSelected();
    expect(screen.getByRole("button", { name: "1. Thought" })).not.toBeSelected();
  });

  it("marks the active step with aria-current on web", () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
    try {
      mockUseWindowDimensions.mockReturnValue(WIDE_WIDTH);
      renderPills("category", jest.fn());

      const active = screen.getByRole("button", { name: "2. Category" });
      expect(active.props["aria-current"]).toBe("step");
      const inactive = screen.getByRole("button", { name: "1. Thought" });
      expect(inactive.props["aria-current"]).toBeUndefined();
    } finally {
      Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
    }
  });
});
