import { act, render } from "@testing-library/react-native";

import { MindfulnessTimer } from "@/src/features/mindfulness/mindfulness-timer";
import { mindfulnessLookup } from "@/src/constants/mindfulness";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { returnObjects?: boolean }) =>
      opts?.returnObjects ? ["Settle.", "Breathe in."] : key,
  }),
}));

jest.mock("@/src/lib/color-scheme", () => ({ useAppColorScheme: () => "dark" }));

describe("MindfulnessTimer", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("calls onComplete after the duration elapses", () => {
    const onComplete = jest.fn();
    render(
      <MindfulnessTimer
        exercise={mindfulnessLookup["breath-awareness"]}
        durationMinutes={1}
        onComplete={onComplete}
        onBack={() => {}}
      />,
    );

    expect(onComplete).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(61_000);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
