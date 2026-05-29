import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "@/src/components/react-native-reusables/text";
import { Button } from "./button";

describe("Button behavior", () => {
  it("invokes onPress handler when pressed", () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <Button onPress={onPress}>
        <Text>Click me</Text>
      </Button>,
    );
    fireEvent.press(getByRole("button"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not invoke onPress when disabled", () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <Button onPress={onPress} disabled>
        <Text>Click me</Text>
      </Button>,
    );
    fireEvent.press(getByRole("button"));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("sets accessibilityState.disabled when disabled prop is set", () => {
    const { getByRole } = render(
      <Button disabled>
        <Text>Disabled</Text>
      </Button>,
    );
    expect(getByRole("button").props.accessibilityState).toMatchObject({ disabled: true });
  });
});
