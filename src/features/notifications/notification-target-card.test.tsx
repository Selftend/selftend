import { screen } from "@testing-library/react-native";

import { defaultUserPreferences } from "@/src/features/modules/types";
import { NotificationTargetCard } from "@/src/features/notifications/notification-target-card";
import { getNotificationTarget } from "@/src/features/notifications/registry";
import { renderWithProviders } from "@/test/render-with-providers";

describe("NotificationTargetCard", () => {
  it("renders live reminder controls (no 'Coming soon') for a promoted tool target", () => {
    renderWithProviders(
      <NotificationTargetCard
        target={getNotificationTarget("sleep")}
        preferences={defaultUserPreferences}
        userId="user-1"
        globalEnabled
      />,
    );

    // The placeholder badge must be gone now that the target is live.
    expect(screen.queryByText("Coming soon")).toBeNull();
    // The daily-reminder TimeField only renders for live targets.
    expect(screen.getByLabelText("Reminder time")).toBeTruthy();
  });

  it("renders the promoted target's label", () => {
    renderWithProviders(
      <NotificationTargetCard
        target={getNotificationTarget("habits")}
        preferences={defaultUserPreferences}
        userId="user-1"
        globalEnabled
      />,
    );

    expect(screen.getByText("Habits")).toBeTruthy();
  });
});
