import { render, screen } from "@testing-library/react-native";

import { VolumeSlider } from "@/src/components/app/volume-slider";

describe("VolumeSlider", () => {
  it("exposes the current value as an adjustable accessibility node", () => {
    render(<VolumeSlider value={0.4} onChange={() => {}} accessibilityLabel="Breath volume" />);
    const node = screen.getByLabelText("Breath volume");
    expect(node.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 40 });
  });

  it("announces a consumer's own scale when one is passed", () => {
    // A slider whose real unit is not a percentage (the sit length, in minutes)
    // must not read its position back as percent.
    render(
      <VolumeSlider
        value={0.5}
        onChange={() => {}}
        accessibilityLabel="Length"
        accessibilityValue={{ min: 1, max: 120, now: 60, text: "60 min" }}
      />,
    );
    expect(screen.getByLabelText("Length").props.accessibilityValue).toEqual({
      min: 1,
      max: 120,
      now: 60,
      text: "60 min",
    });
  });
});
