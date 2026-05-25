import { fireEvent, render } from "@testing-library/react-native";

import { MindfulnessComplete, FEELINGS } from "@/src/features/mindfulness/mindfulness-complete";
import { mindfulnessLookup } from "@/src/constants/mindfulness";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("MindfulnessComplete", () => {
  it("saves the selected feeling slug and reflection", () => {
    const onSave = jest.fn();
    const { getByText, getByLabelText } = render(
      <MindfulnessComplete
        exercise={mindfulnessLookup["breath-awareness"]}
        durationMinutes={5}
        isSaving={false}
        onSave={onSave}
        onSkip={() => {}}
      />,
    );

    // FEELINGS[0] is "calmer"; the chip label comes from the (mocked) t() key.
    fireEvent.press(getByText("mindfulness.feelings.calmer"));
    fireEvent.changeText(getByLabelText("mindfulness.reflection"), "felt lighter");
    fireEvent.press(getByText("mindfulness.save"));

    expect(onSave).toHaveBeenCalledWith({ feeling: "calmer", reflection: "felt lighter" });
    expect(FEELINGS[0]).toBe("calmer");
  });
});
