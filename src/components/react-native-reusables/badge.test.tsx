import { render } from "@testing-library/react-native";
import { Text } from "@/src/components/react-native-reusables/text";
import { Badge } from "./badge";
import { TINT_TOKENS } from "@/src/lib/design-tokens";

describe("Badge", () => {
  it("renders default variant unchanged", () => {
    const { toJSON } = render(
      <Badge>
        <Text>Default</Text>
      </Badge>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it.each(TINT_TOKENS)("renders tint variant for %s", (tint) => {
    const { toJSON } = render(
      <Badge variant="tint" tint={tint}>
        <Text>{tint}</Text>
      </Badge>,
    );
    expect(toJSON()).toMatchSnapshot(`tint-${tint}`);
  });

  it("renders icon when icon prop is provided", () => {
    const { toJSON } = render(
      <Badge variant="tint" tint="act" icon="psychology">
        <Text>CBT</Text>
      </Badge>,
    );
    expect(toJSON()).toMatchSnapshot("with-icon");
  });
});
