import { render } from "@testing-library/react-native";
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
