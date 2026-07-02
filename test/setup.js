/* global jest */

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// Wire React Query's notifyManager to React Testing Library's act() so that
// query/mutation state updates are flushed synchronously within act() boundaries.
// Without this, notifyManager uses its default setTimeout-based scheduler and
// fires forceStoreRerender outside act(), producing act() warnings in every
// suite that renders a component backed by a @tanstack/react-query hook.
const { notifyManager } = require("@tanstack/react-query");
const { act } = require("@testing-library/react-native");
notifyManager.setNotifyFunction((fn) => {
  act(fn);
});

// Mock expo-font so @expo/vector-icons' Icon.componentDidMount sees every font
// as already loaded and skips its Font.loadAsync() → setState() cycle.
// Without this, that async setState fires outside act() and floods every suite
// that renders any icon with "An update to Icon inside a test was not wrapped in act(...)".
jest.mock("expo-font", () => ({
  isLoaded: () => true,
  loadAsync: jest.fn().mockResolvedValue(undefined),
  useFonts: () => [true, null],
}));
jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);
jest.mock("@rn-primitives/slot", () => ({
  Slot: require("react-native").Text,
}));
jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));

jest.mock("@react-native-community/datetimepicker", () => ({
  __esModule: true,
  default: (props) => require("react").createElement(require("react-native").View, props),
  DateTimePickerAndroid: { open: jest.fn(), dismiss: jest.fn() },
}));
