import { screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { SettingsSectionCard } from "@/src/features/settings/components/settings-section-card";
import { renderWithProviders } from "@/test/render-with-providers";

describe("SettingsSectionCard", () => {
  it("renders the title, optional description, and children", () => {
    renderWithProviders(
      <SettingsSectionCard
        icon="notifications-active"
        iconClassName="text-be"
        badgeClassName="bg-[hsl(var(--be)/0.10)]"
        title="Reminders"
        description="Stay on track"
      >
        <Text>child-content</Text>
      </SettingsSectionCard>,
    );

    expect(screen.getByText("Reminders")).toBeTruthy();
    expect(screen.getByText("Stay on track")).toBeTruthy();
    expect(screen.getByText("child-content")).toBeTruthy();
  });

  it("omits the description block when no description is provided", () => {
    renderWithProviders(
      <SettingsSectionCard
        icon="help-outline"
        iconClassName="text-aqua"
        badgeClassName="bg-[hsl(var(--aqua)/0.10)]"
        title="Support"
      >
        <Text>links</Text>
      </SettingsSectionCard>,
    );

    expect(screen.getByText("Support")).toBeTruthy();
    expect(screen.getByText("links")).toBeTruthy();
  });
});
