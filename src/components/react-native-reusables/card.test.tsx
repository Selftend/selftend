import { render } from "@testing-library/react-native";
import { Text } from "@/src/components/react-native-reusables/text";
import { Card } from "./card";
import { TINT_TOKENS } from "@/src/lib/design-tokens";

describe("Card", () => {
  it("renders without spine or tint unchanged", () => {
    const { toJSON } = render(
      <Card>
        <Text>plain card</Text>
      </Card>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it.each(TINT_TOKENS)("renders spine prop for %s", (tint) => {
    const { toJSON } = render(
      <Card spine={tint}>
        <Text>{tint} spine</Text>
      </Card>,
    );
    expect(toJSON()).toMatchSnapshot(`spine-${tint}`);
  });

  it.each(TINT_TOKENS)("renders tint prop for %s", (tint) => {
    const { toJSON } = render(
      <Card tint={tint}>
        <Text>{tint} tint</Text>
      </Card>,
    );
    expect(toJSON()).toMatchSnapshot(`tint-${tint}`);
  });

  it("renders spine and tint together", () => {
    const { toJSON } = render(
      <Card tint="act" spine="act">
        <Text>both</Text>
      </Card>,
    );
    expect(toJSON()).toMatchSnapshot("spine-and-tint");
  });
});
