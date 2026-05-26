import { screen } from "@testing-library/react-native";

import { ToolHero } from "./tool-hero";
import { Text } from "@/src/components/react-native-reusables/text";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-linear-gradient", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require("react-native");
  return { LinearGradient: View };
});

describe("ToolHero", () => {
  it("renders the title, tagline and meta", () => {
    renderWithProviders(
      <ToolHero
        hue="be"
        icon="mood"
        title="Check-in"
        tagline="Log how you're feeling."
        meta={<Text>This week · 5 logs</Text>}
      />,
    );

    expect(screen.getByText("Check-in")).toBeTruthy();
    expect(screen.getByText("Log how you're feeling.")).toBeTruthy();
    expect(screen.getByText("This week · 5 logs")).toBeTruthy();
  });
});
