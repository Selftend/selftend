import { fireEvent } from "@testing-library/react-native";

import { GroundingIntro } from "@/src/features/grounding/grounding-intro";
import { groundingLookup } from "@/src/constants/grounding";
import { renderWithProviders } from "@/test/render-with-providers";

describe("GroundingIntro", () => {
  it("renders steps and starts the session", () => {
    const onStart = jest.fn();
    const { getByText } = renderWithProviders(
      <GroundingIntro
        technique={groundingLookup["54321"]}
        title="5-4-3-2-1"
        description="Anchor through the senses."
        steps={["First step", "Second step"]}
        onStart={onStart}
      />,
    );
    expect(getByText("First step")).toBeTruthy();
    // "Start" is the EN grounding.start label resolved by the real i18n provider.
    fireEvent.press(getByText("Start"));
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
