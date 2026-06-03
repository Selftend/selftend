import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { SleepRecentList } from "@/src/features/sleep/sleep-recent-list";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

const mockRouter = jest.mocked(router);

function sleepLog(i: number) {
  const loggedAt = new Date(2026, 4, 30 - i, 12).toISOString();
  return {
    id: `s-${i}`,
    userId: "user-1",
    durationMinutes: 360 + i,
    quality: 3,
    notes: "",
    loggedAt,
    createdAt: loggedAt,
  };
}

describe("SleepRecentList", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows the empty state with no logs", () => {
    renderWithProviders(<SleepRecentList logs={[]} />);
    expect(screen.getByText(/No sleep logged yet/)).toBeTruthy();
  });

  it("collapses to 8 rows and expands via Show all", () => {
    const logs = Array.from({ length: 10 }, (_, i) => sleepLog(i));
    renderWithProviders(<SleepRecentList logs={logs} />);

    // 'Show all (10)' visible while collapsed.
    const toggle = screen.getByText("Show all (10)");
    expect(toggle).toBeTruthy();

    fireEvent.press(toggle);
    expect(screen.getByText("Show less")).toBeTruthy();
  });

  it("routes to the detail screen on row press", () => {
    renderWithProviders(<SleepRecentList logs={[sleepLog(0)]} />);
    fireEvent.press(screen.getByText("6h")); // 360 min => "6h"
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: "/tools/sleep/[id]",
      params: { id: "s-0" },
    });
  });
});
