import { render } from "@testing-library/react-native";

import { ScreenHeader } from "@/src/components/app/screen-header";
import { Text } from "@/src/components/react-native-reusables/text";

jest.mock("@/src/components/app/screen-breadcrumb", () => ({ ScreenBreadcrumb: () => null }));

describe("ScreenHeader", () => {
  it("renders the title", () => {
    const { getByText } = render(<ScreenHeader title="Mindfulness" />);
    expect(getByText("Mindfulness")).toBeTruthy();
  });

  it("renders the right slot when provided", () => {
    const { getByText } = render(<ScreenHeader title="Habit" right={<Text>Archived</Text>} />);
    expect(getByText("Archived")).toBeTruthy();
  });
});
