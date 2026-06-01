import { render, screen } from "@testing-library/react-native";

import { VolumeSlider } from "@/src/components/app/volume-slider";

describe("VolumeSlider", () => {
  it("exposes the current value as an adjustable accessibility node", () => {
    render(<VolumeSlider value={0.4} onChange={() => {}} accessibilityLabel="Breath volume" />);
    const node = screen.getByLabelText("Breath volume");
    expect(node.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 40 });
  });
});
