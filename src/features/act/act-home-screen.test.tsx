import { fireEvent, screen } from "@testing-library/react-native";

import { router } from "expo-router";

import ActHomeScreen from "./act-home-screen";
import { useDefusionLogs } from "@/src/features/act/queries";
import { useActProgram } from "@/src/features/act/use-act-program";
import { useUpdateShownButtonTours, useUserPreferences } from "@/src/features/settings/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    canGoBack: jest.fn(() => false),
    push: jest.fn(),
  },
  usePathname: () => "/modules/act",
  useFocusEffect: jest.fn(),
}));

jest.mock("@react-navigation/native", () => ({
  useIsFocused: () => true,
}));

jest.mock("@/src/components/app/notification-settings-modal", () => ({
  NotificationSettingsModal: () => null,
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: {
      id: "user-1",
    },
  }),
}));

jest.mock("@/src/features/settings/queries", () => ({
  useUpdateShownButtonTours: jest.fn(),
  useUpdateUserPreferences: jest.fn(),
  useUserPreferences: jest.fn(),
}));

jest.mock("@/src/features/act/queries", () => ({
  useDefusionLogs: jest.fn(),
}));

jest.mock("@/src/features/act/use-act-program", () => ({
  useActProgram: jest.fn(),
}));

const mockUseUserPreferences = useUserPreferences as jest.MockedFunction<typeof useUserPreferences>;
const mockUseUpdateShownButtonTours = useUpdateShownButtonTours as jest.MockedFunction<
  typeof useUpdateShownButtonTours
>;
const mockUseDefusionLogs = useDefusionLogs as jest.MockedFunction<typeof useDefusionLogs>;
const mockUseActProgram = useActProgram as jest.MockedFunction<typeof useActProgram>;

const defaultActProgram = {
  status: "not_started" as const,
  startedAt: null,
  summaryStats: {
    choicePoints: 0,
    defusionLogs: 0,
    expansionLogs: 0,
    committedActions: 0,
  },
  phaseIndex: 0,
  totalPhases: 6,
  isLastPhase: false,
  phase: null,
  phaseReady: false,
};

describe("ActHomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUpdateShownButtonTours.mockReturnValue({
      isPending: false,
      mutateAsync: jest.fn(),
    } as unknown as ReturnType<typeof useUpdateShownButtonTours>);
    mockUseUserPreferences.mockReturnValue({
      data: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);
    mockUseDefusionLogs.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useDefusionLogs>);
    mockUseActProgram.mockReturnValue({
      program: defaultActProgram,
      isLoading: false,
      isUpdating: false,
      abandonProgram: jest.fn(),
      advancePhase: jest.fn(),
      dismissProgramPrompt: jest.fn(),
      dismissGraduation: jest.fn(),
      promptDismissedAt: null,
      graduationDismissedAt: null,
      startProgram: jest.fn(),
      showProgramPrompt: jest.fn(),
      replayProgram: jest.fn(),
    } as unknown as ReturnType<typeof useActProgram>);
  });

  it("renders the four ACT pillars with their tools", () => {
    renderWithProviders(<ActHomeScreen />);

    // Pillar headings (sourced from pillars copy)
    expect(screen.getByText("Build a foundation")).toBeTruthy();
    expect(screen.getByText("Be present")).toBeTruthy();
    expect(screen.getByText("Open up")).toBeTruthy();
    expect(screen.getByText("Do what matters")).toBeTruthy();

    // Foundation tools, surfaced on the home screen for the first time
    expect(screen.getByText("Choice point")).toBeTruthy();
    expect(screen.getByText("Drop anchor")).toBeTruthy();

    // The six principle tools, now grouped under their pillars
    expect(screen.getByText("Defusion")).toBeTruthy();
    expect(screen.getByText("Acceptance")).toBeTruthy();
    expect(screen.getByText("Connection")).toBeTruthy();
    expect(screen.getByText("Observing Self")).toBeTruthy();
    expect(screen.getByText("Values")).toBeTruthy();
    expect(screen.getByText("Committed Action")).toBeTruthy();
  });

  it("navigates to the Choice Point tool from the Foundation pillar", () => {
    renderWithProviders(<ActHomeScreen />);

    fireEvent.press(screen.getByText("Choice point"));

    expect(router.push as jest.Mock).toHaveBeenCalledWith("/modules/act/choice-point");
  });

  it("renders the author eyebrow below the header with primary tint", () => {
    renderWithProviders(<ActHomeScreen />);

    expect(screen.getByText("Inspired by The Happiness Trap · Russ Harris")).toBeTruthy();
  });

  it("renders recent defusion logs empty state when no logs exist", () => {
    renderWithProviders(<ActHomeScreen />);

    expect(screen.getByText(/No defusion logs yet/)).toBeTruthy();
  });

  it("collapses the graduation hero when graduationDismissedAt is set", () => {
    mockUseActProgram.mockReturnValue({
      program: { ...defaultActProgram, status: "graduated" },
      isLoading: false,
      isUpdating: false,
      abandonProgram: jest.fn(),
      advancePhase: jest.fn(),
      dismissProgramPrompt: jest.fn(),
      dismissGraduation: jest.fn(),
      promptDismissedAt: null,
      graduationDismissedAt: "2026-05-20T00:00:00.000Z",
      startProgram: jest.fn(),
      showProgramPrompt: jest.fn(),
      replayProgram: jest.fn(),
    } as unknown as ReturnType<typeof useActProgram>);

    renderWithProviders(<ActHomeScreen />);

    // Collapsed: the full graduation hero title is hidden; the replay row shows.
    expect(screen.queryByText("You finished the ACT program")).toBeNull();
    expect(screen.getByText("Replay the ACT program")).toBeTruthy();
  });
});
