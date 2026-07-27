import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import GroundingHomeScreen from "@/src/features/grounding/grounding-home-screen";
import { useGroundingSessions } from "@/src/features/grounding/queries";
import { roomVariables } from "@/src/lib/module-room";
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
}));

jest.mock("@/src/components/app/grounding-onboarding-modal", () => ({
  GroundingOnboarding: () => null,
}));

jest.mock("@/src/components/app/screen-breadcrumb", () => ({ ScreenBreadcrumb: () => null }));
jest.mock("@/src/components/app/notification-settings-modal", () => ({
  NotificationSettingsModal: () => null,
}));
jest.mock("@/src/components/app/add-to-home-button", () => ({ AddToHomeButton: () => null }));
jest.mock("@/src/features/settings/queries", () => ({
  useUserPreferences: () => ({ data: undefined }),
  useUpdateShownButtonTours: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

const mockUseGroundingSessions = useGroundingSessions as jest.MockedFunction<
  typeof useGroundingSessions
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
  createdAt: "2026-05-28T10:00:00Z",
  ...overrides,
});

describe("GroundingHomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGroundingSessions.mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useGroundingSessions>);
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
    expect(screen.getByText("Takes 2-3 min")).toBeTruthy();
  });

  it("lists the techniques and navigates on press", () => {
    renderWithProviders(<GroundingHomeScreen />);
    fireEvent.press(screen.getByText("5-4-3-2-1"));
    expect(router.push).toHaveBeenCalledWith("/tools/grounding/54321");
  });

  it("renders the clay room: field header and room pour", () => {
    renderWithProviders(<GroundingHomeScreen />);

    // Full-bleed clay field header (Direction B room), not the plain header.
    expect(screen.getByTestId("module-field-gradient")).toBeTruthy();
    // The root carries the clay room re-pour; a wrong or missing room fails here.
    expect(screen.UNSAFE_getByType(SafeAreaView).props.style).toEqual(roomVariables("clay").light);
  });

  it("omits the subline until history has actually loaded", () => {
    // `data === undefined` means still loading, or a failed fetch with no cache -
    // claiming "no sessions" there would erase a returning user's real history.
    renderWithProviders(<GroundingHomeScreen />);
    expect(screen.queryByText("No sessions logged yet")).toBeNull();
    expect(screen.queryByText(/^Last · /)).toBeNull();
  });

  it("shows the never subline once an empty history has loaded", () => {
    mockUseGroundingSessions.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useGroundingSessions>);

    renderWithProviders(<GroundingHomeScreen />);
    expect(screen.getByText("No sessions logged yet")).toBeTruthy();
  });

  it("shows the last-done subline and the recent-sessions card when sessions exist", () => {
    mockUseGroundingSessions.mockReturnValue({
      data: [session()],
    } as unknown as ReturnType<typeof useGroundingSessions>);

    renderWithProviders(<GroundingHomeScreen />);

    expect(screen.getByText(/^Last · /)).toBeTruthy();
    expect(screen.queryByText("No sessions logged yet")).toBeNull();
    expect(screen.getByText("Recent sessions")).toBeTruthy();
  });
});
