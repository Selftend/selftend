import { GlowBackdrop } from "@/src/features/grounding/glow-backdrop";
import { ProgressSegments } from "@/src/features/grounding/progress-segments";
import { renderWithProviders } from "@/test/render-with-providers";

describe("ProgressSegments", () => {
  it("exposes an accessible step label", () => {
    const { getByLabelText } = renderWithProviders(
      <ProgressSegments total={5} current={2} hue="iris" />,
    );
    // "Step 3 of 5" comes from grounding.step with current+1.
    expect(getByLabelText("Step 3 of 5")).toBeTruthy();
  });
});

describe("GlowBackdrop", () => {
  it("renders without throwing", () => {
    const { toJSON } = renderWithProviders(<GlowBackdrop hue="aqua" />);
    expect(toJSON()).toBeTruthy();
  });
});
