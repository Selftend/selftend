import { render } from "@testing-library/react-native";
import { Text } from "@/src/components/react-native-reusables/text";
import { Badge } from "./badge";
import { Icon } from "@/src/components/react-native-reusables/icon";

describe("Badge", () => {
  it("renders icon when icon prop is provided", () => {
    const { UNSAFE_getAllByType } = render(
      <Badge variant="tint" tint="act" icon="psychology">
        <Text>CBT</Text>
      </Badge>,
    );
    // Behavioral assertion: Icon component must actually render
    const icons = UNSAFE_getAllByType(Icon);
    expect(icons).toHaveLength(1);
    expect(icons[0].props.name).toBe("psychology");
  });
});
