import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { ProgramWidget } from "@/src/features/home/widgets/program-widget";
import { useUserPreferences } from "@/src/features/settings/queries";
import { useProgramWidgetTaskStatus } from "@/src/features/home/program-widget-status";
import { defaultUserPreferences } from "@/src/features/modules/types";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

jest.mock("@/src/features/settings/queries", () => ({
  useUserPreferences: jest.fn(),
}));

jest.mock("@/src/features/home/program-widget-status", () => ({
  useProgramWidgetTaskStatus: jest.fn(() => ({ data: [] })),
}));

const mockUseUserPreferences = useUserPreferences as jest.MockedFunction<typeof useUserPreferences>;
const mockUseProgramWidgetTaskStatus = useProgramWidgetTaskStatus as jest.MockedFunction<
  typeof useProgramWidgetTaskStatus
>;

describe("ProgramWidget", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProgramWidgetTaskStatus.mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof useProgramWidgetTaskStatus
    >);
  });

  it("places incomplete goals before completed goals", () => {
    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        cbtProgramStartedAt: "2026-07-01T00:00:00.000Z",
        cbtProgramPhaseIndex: 0,
      },
    } as ReturnType<typeof useUserPreferences>);
    mockUseProgramWidgetTaskStatus.mockReturnValue({
      data: [
        { taskKey: "dailyNoticing", done: true },
        { taskKey: "setGoals", done: false },
        { taskKey: "clarifyValues", done: false },
      ],
    } as ReturnType<typeof useProgramWidgetTaskStatus>);

    renderWithProviders(<ProgramWidget module="cbt" userId="u1" />);

    expect(screen.getAllByRole("button")[0]).toHaveTextContent(/Set 1-2 goals/);
  });

  it("opens the full module without enrolling from the not-started state", () => {
    mockUseUserPreferences.mockReturnValue({
      data: defaultUserPreferences,
    } as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<ProgramWidget module="cbt" userId="u1" />);
    fireEvent.press(screen.getByText("View programme"));

    expect(router.push).toHaveBeenCalledWith("/modules/cbt");
  });

  it("shows current program goals as links while enrolled", () => {
    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        actProgramStartedAt: "2026-07-01T00:00:00.000Z",
        actProgramPhaseIndex: 0,
      },
    } as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<ProgramWidget module="act" userId="u1" />);

    expect(screen.getByText("Drop anchor today")).toBeTruthy();
    expect(screen.getByText("+1 more goal")).toBeTruthy();
    fireEvent.press(screen.getByText("Drop anchor today"));
    expect(router.push).toHaveBeenCalledWith("/modules/act/connection/drop-anchor");
  });

  it("opens the programme when the remaining-goals link is pressed", () => {
    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        cbtProgramStartedAt: "2026-07-01T00:00:00.000Z",
        cbtProgramPhaseIndex: 0,
      },
    } as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<ProgramWidget module="cbt" userId="u1" />);
    fireEvent.press(screen.getByText(/\+\d+ more goals?/));

    expect(router.push).toHaveBeenCalledWith("/modules/cbt");
  });

  it("shows congratulations and links to the module when completed", () => {
    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        cbtProgramStartedAt: "2026-07-01T00:00:00.000Z",
        cbtProgramCompletedAt: "2026-07-10T00:00:00.000Z",
      },
    } as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<ProgramWidget module="cbt" userId="u1" />);

    expect(screen.getByText("Programme complete - well done.")).toBeTruthy();
    fireEvent.press(screen.getByText("Open module"));
    expect(router.push).toHaveBeenCalledWith("/modules/cbt");
  });
});
