import { render } from "@testing-library/react-native";
import { Text } from "./text";
import { TINT_TOKENS } from "@/src/lib/design-tokens";

describe("Text eyebrow variant", () => {
  it("renders eyebrow variant with default muted color", () => {
    const { toJSON } = render(<Text variant="eyebrow">SECTION LABEL</Text>);
    expect(toJSON()).toMatchSnapshot("eyebrow-default");
  });

  it.each(TINT_TOKENS)("renders eyebrow variant with %s tint", (tint) => {
    const { toJSON } = render(
      <Text variant="eyebrow" tint={tint}>
        TINTED LABEL
      </Text>,
    );
    expect(toJSON()).toMatchSnapshot(`eyebrow-${tint}`);
  });
});
