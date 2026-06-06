/* global jest */

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
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
