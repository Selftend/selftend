import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "@/src/components/react-native-reusables/text";
import { Button } from "./button";
import { TINT_TOKENS } from "@/src/lib/design-tokens";

describe("Button tinted variant", () => {
  it("renders default variant unchanged", () => {
    const { toJSON } = render(
      <Button>
        <Text>Default</Text>
      </Button>,
    );
    expect(toJSON()).toMatchSnapshot("default");
  });

  it.each(TINT_TOKENS)("renders tinted variant with %s tint", (tint) => {
    const { toJSON } = render(
      <Button variant="tinted" tint={tint}>
        <Text>{tint}</Text>
      </Button>,
    );
    expect(toJSON()).toMatchSnapshot(`tinted-${tint}`);
  });
});

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
