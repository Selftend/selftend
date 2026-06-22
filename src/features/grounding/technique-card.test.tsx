import { fireEvent } from "@testing-library/react-native";

import { TechniqueCard } from "@/src/features/grounding/technique-card";
import { groundingLookup } from "@/src/constants/grounding";
import { renderWithProviders } from "@/test/render-with-providers";

describe("TechniqueCard", () => {
  it("renders title, description, meta and fires onPress", () => {
    const onPress = jest.fn();
    const { getByText, getByLabelText } = renderWithProviders(
      <TechniqueCard
        technique={groundingLookup["cold-water"]}
        title="Cold water"
        description="A sharp sensation."
        meta="Guided · 4 steps"
        onPress={onPress}
      />,
    );
    expect(getByText("Cold water")).toBeTruthy();
    expect(getByText("A sharp sensation.")).toBeTruthy();
    expect(getByText("Guided · 4 steps")).toBeTruthy();
    fireEvent.press(getByLabelText("Cold water"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
