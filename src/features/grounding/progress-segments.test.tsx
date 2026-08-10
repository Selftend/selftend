import { GlowBackdrop } from "@/src/features/grounding/glow-backdrop";
import { ProgressSegments } from "@/src/features/grounding/progress-segments";
import { renderWithProviders } from "@/test/render-with-providers";
import { fireEvent } from "@testing-library/react-native";

describe("ProgressSegments", () => {
  it("exposes each interactive segment to assistive technology", () => {
    const onSelect = jest.fn();
    const { getByLabelText } = renderWithProviders(
      <ProgressSegments total={5} current={2} onSelect={onSelect} />,
    );
    fireEvent.press(getByLabelText("Go to step 4 of 5"));
    expect(onSelect).toHaveBeenCalledWith(3);
  });
});

describe("GlowBackdrop", () => {
  it("renders without throwing", () => {
    const { toJSON } = renderWithProviders(<GlowBackdrop />);
    expect(toJSON()).toBeTruthy();
  });
});
