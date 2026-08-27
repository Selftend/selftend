import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import GroundingHomeScreen from "@/src/features/grounding/grounding-home-screen";
import { useGroundingSessionCount, useGroundingSessions } from "@/src/features/grounding/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    canGoBack: jest.fn(() => false),
  },
  usePathname: () => "/tools/grounding",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("@/src/features/grounding/queries", () => ({
  useGroundingSessions: jest.fn(),
  useGroundingSessionCount: jest.fn(),
}));

jest.mock("@/src/components/app/grounding-onboarding-modal", () => ({
  GroundingOnboarding: () => null,
}));

jest.mock("@/src/components/app/screen-breadcrumb", () => ({ ScreenBreadcrumb: () => null }));
jest.mock("@/src/components/app/add-to-home-button", () => ({ AddToHomeButton: () => null }));
jest.mock("@/src/features/settings/queries", () => ({
  useUserPreferences: () => ({ data: undefined }),
  useUpdateShownButtonTours: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

const mockUseGroundingSessions = useGroundingSessions as jest.MockedFunction<
  typeof useGroundingSessions
>;
const mockUseGroundingSessionCount = useGroundingSessionCount as jest.MockedFunction<
  typeof useGroundingSessionCount
>;

const session = (overrides: Record<string, unknown> = {}) => ({
  id: "s1",
  userId: "user-1",
  exerciseName: "54321",
  durationMinutes: 3,
  durationSeconds: null,
  cycles: null,
  reflection: "",
  moodAfter: null,
  feelingAfter: null,
  completedAt: "2026-05-28T10:00:00Z",
  completedOffsetMinutes: 0,
  dayKey: "2026-05-28",
  createdAt: "2026-05-28T10:00:00Z",
  stepsCompleted: 5,
  stepsTotal: 5,
  ...overrides,
});

describe("GroundingHomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGroundingSessions.mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useGroundingSessions>);
    mockUseGroundingSessionCount.mockReturnValue({
      data: 12,
    } as unknown as ReturnType<typeof useGroundingSessionCount>);
  });

  it("renders the header title, description, and stats", () => {
    renderWithProviders(<GroundingHomeScreen />);
    expect(screen.getByRole("heading", { name: "Grounding" })).toBeTruthy();
    expect(
      screen.getByText(
        "Quick techniques to anchor yourself in the present moment when anxiety or distress spikes.",
      ),
    ).toBeTruthy();
    expect(screen.getByText(/techniques$/)).toBeTruthy();
    expect(screen.getByText(/12 sessions/)).toBeTruthy();
  });

  it("lists the techniques and navigates on press", () => {
    renderWithProviders(<GroundingHomeScreen />);
    fireEvent.press(screen.getByText("5-4-3-2-1"));
    expect(router.push).toHaveBeenCalledWith("/tools/grounding/54321");
  });

  /**
   * #887 (jointly #882/#868): the acute-distress tool had NO crisis affordance
   * at all — #782 ordered "preserve the existing" one but none ever existed.
   * It lives on the home, above the technique list; the session flow stays
   * chrome-free.
   */
  it("carries the crisis-support row on the home, linking to the crisis page", () => {
    renderWithProviders(<GroundingHomeScreen />);

    fireEvent.press(screen.getByText("Not for emergencies · Crisis resources"));
    expect(router.push).toHaveBeenCalledWith("/crisis");
  });

  it("omits the subline until history has actually loaded", () => {
    // `data === undefined` means still loading, or a failed fetch with no cache -
    // claiming "no sessions" there would erase a returning user's real history.
    renderWithProviders(<GroundingHomeScreen />);
    expect(screen.queryByText("no sessions logged yet")).toBeNull();
    expect(screen.queryByText(/^last logged /)).toBeNull();
  });

  it("shows the never subline once an empty history has loaded", () => {
    mockUseGroundingSessions.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useGroundingSessions>);

    renderWithProviders(<GroundingHomeScreen />);
    expect(screen.getByText("no sessions logged yet")).toBeTruthy();
  });

  it("shows the last-done subline and the recent-sessions card when sessions exist", () => {
    mockUseGroundingSessions.mockReturnValue({
      data: [session()],
    } as unknown as ReturnType<typeof useGroundingSessions>);

    renderWithProviders(<GroundingHomeScreen />);

    expect(screen.getByText(/^last logged /)).toBeTruthy();
    expect(screen.queryByText("no sessions logged yet")).toBeNull();
    expect(screen.getByText("Recent sessions")).toBeTruthy();
  });
});
