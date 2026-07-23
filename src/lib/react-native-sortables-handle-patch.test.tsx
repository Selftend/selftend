/**
 * Regression test for the react-native-sortables patch
 * (patches/react-native-sortables+1.9.4.patch).
 *
 * CustomHandle rendered `onLayout={runOnUI(onLayout)}` on a plain View, so
 * React Native invoked the UI-thread wrapper with the layout SyntheticEvent
 * as its argument. react-native-worklets 0.10 hard-throws when serializing
 * unsupported objects ("[Worklets] Cannot copy value of type
 * `SyntheticEvent`.", Sentry SELFTEND-5) — worklets 0.5 silently replaced
 * them, which is why this only surfaced after the SDK 57 upgrade.
 *
 * The patch drops the event before it crosses the worklet boundary:
 * `onLayout={() => runOnUI(onLayout)()}`. This test renders the real
 * (patched) component from the library's `src` tree — the tree Metro
 * bundles via the package's "react-native" main field — fires a layout
 * event, and asserts nothing is forwarded into the runOnUI wrapper while
 * the measurement worklet still runs.
 */
import { fireEvent, render } from "@testing-library/react-native";
import { View } from "react-native";
import type { ComponentType, PropsWithChildren } from "react";

// Loaded via jest.requireActual so tsc does not pull the library's TS source
// into the app's program (it does not compile under the app's tsconfig).
const CustomHandle: ComponentType<PropsWithChildren> = jest.requireActual(
  "react-native-sortables/src/components/shared/CustomHandle",
).default;

const mockRunOnUICalls: unknown[][] = [];

jest.mock("react-native-reanimated", () => ({
  runOnUI: (fn: (...args: unknown[]) => void) => {
    return (...args: unknown[]) => {
      mockRunOnUICalls.push(args);
      fn(...args);
    };
  },
  useAnimatedRef: () => () => null,
}));

jest.mock("react-native-gesture-handler", () => {
  const { Fragment } = require("react");
  return {
    GestureDetector: ({ children }: { children?: React.ReactNode }) => (
      <Fragment>{children}</Fragment>
    ),
  };
});

const mockUpdateActiveHandleMeasurements = jest.fn();

jest.mock("react-native-sortables/src/utils", () => ({
  error: (message: string) => new Error(message),
}));

jest.mock("react-native-sortables/src/providers", () => ({
  useCustomHandleContext: () => ({
    registerHandle: jest.fn(() => jest.fn()),
    updateActiveHandleMeasurements: mockUpdateActiveHandleMeasurements,
  }),
  useIsInPortalOutlet: () => false,
  useItemContext: () => ({
    gesture: { enabled: jest.fn().mockReturnThis() },
    isActive: { value: true },
    itemKey: "widget-1",
  }),
}));

describe("react-native-sortables CustomHandle onLayout patch", () => {
  beforeEach(() => {
    mockRunOnUICalls.length = 0;
    mockUpdateActiveHandleMeasurements.mockClear();
  });

  it("does not forward the layout SyntheticEvent across the worklet boundary", () => {
    const { UNSAFE_getAllByType } = render(
      <CustomHandle>
        <View testID="handle-content" />
      </CustomHandle>,
    );

    // The outermost rendered View is the handle wrapper carrying onLayout.
    const handleView = UNSAFE_getAllByType(View)[0];
    fireEvent(handleView, "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 28, height: 28 } },
    });

    expect(mockRunOnUICalls).toHaveLength(1);
    // Nothing may cross into the worklet call — a SyntheticEvent argument
    // makes worklets' createSerializable throw in production.
    expect(mockRunOnUICalls[0]).toHaveLength(0);
  });

  it("still triggers the measurement worklet for the active item", () => {
    const { UNSAFE_getAllByType } = render(
      <CustomHandle>
        <View testID="handle-content" />
      </CustomHandle>,
    );

    fireEvent(UNSAFE_getAllByType(View)[0], "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 28, height: 28 } },
    });

    expect(mockUpdateActiveHandleMeasurements).toHaveBeenCalledWith("widget-1");
  });
});
