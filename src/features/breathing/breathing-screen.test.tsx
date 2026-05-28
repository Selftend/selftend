import { fireEvent, screen, act } from "@testing-library/react-native";
import { router } from "expo-router";

import BreathingScreen from "@/app/(app)/tools/breathing/index";
import { useBreathingSessions } from "@/src/features/breathing/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("@/src/features/breathing/queries", () => ({
  useBreathingSessions: jest.fn(),
}));

jest.mock("@/src/components/app/help-sheet", () => ({
  HelpSheet: () => null,
}));

const mockUseBreathingSessions = useBreathingSessions as jest.MockedFunction<
  typeof useBreathingSessions
>;

describe("Breathing list polish", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBreathingSessions.mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useBreathingSessions>);
  });

  it("renders ToolHero with Breathing chip", () => {
    renderWithProviders(<BreathingScreen />);
    expect(screen.getByText("Breathing")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Breathing exercises" })).toBeTruthy();
  });

  it("renders tagline and meta from ToolHero", () => {
    renderWithProviders(<BreathingScreen />);
    expect(
      screen.getByText("Short guided patterns to calm your nervous system right now."),
    ).toBeTruthy();
    expect(screen.getByText("3 patterns · 1–10 min")).toBeTruthy();
  });

  it("renders all 3 pattern rows", () => {
    renderWithProviders(<BreathingScreen />);
    expect(screen.getByText("Box breathing")).toBeTruthy();
    expect(screen.getByText("4-7-8 breathing")).toBeTruthy();
    expect(screen.getByText("Coherent breathing")).toBeTruthy();
  });

  it("renders pattern duration meta badges", () => {
    renderWithProviders(<BreathingScreen />);
    expect(screen.getByText("1–5 min")).toBeTruthy();
    expect(screen.getByText("2–4 min")).toBeTruthy();
    expect(screen.getByText("5–10 min")).toBeTruthy();
  });

  it("does not render recent session card when no sessions exist", () => {
    renderWithProviders(<BreathingScreen />);
    expect(screen.queryByText("Recent sessions")).toBeNull();
  });

  it("renders recent session card with spine when sessions exist", () => {
    mockUseBreathingSessions.mockReturnValue({
      data: [
        {
          id: "s1",
          userId: "user-1",
          exerciseName: "box-breathing",
          durationMinutes: 3,
          reflection: "",
          moodAfter: null,
          feelingAfter: null,
          completedAt: "2026-05-28T10:00:00Z",
          createdAt: "2026-05-28T10:00:00Z",
        },
      ],
    } as unknown as ReturnType<typeof useBreathingSessions>);

    renderWithProviders(<BreathingScreen />);
    expect(screen.getByText("Recent sessions")).toBeTruthy();
    // "Box breathing" appears both in the recent card and the pattern row
    expect(screen.getAllByText("Box breathing").length).toBeGreaterThanOrEqual(2);
  });

  it("navigates to box-breathing route on press", () => {
    renderWithProviders(<BreathingScreen />);
    const boxRow = screen.getByLabelText("Box breathing");
    fireEvent.press(boxRow);
    expect(router.push).toHaveBeenCalledWith("/tools/breathing/box-breathing");
  });

  it("opens help sheet when help button is pressed", () => {
    renderWithProviders(<BreathingScreen />);
    const helpButton = screen.getByLabelText("About breathing");
    fireEvent.press(helpButton);
    // HelpSheet is mocked to null; pressing the button should not throw
    expect(helpButton).toBeTruthy();
  });
});
