import { fireEvent, screen } from "@testing-library/react-native";

import MeditationSessionLogScreen from "@/src/features/meditation/meditation-session-log-screen";
import { renderWithProviders } from "@/test/render-with-providers";

const mockSave = jest.fn().mockResolvedValue({ id: "s-1" });

jest.mock("expo-router", () => ({
  router: { replace: jest.fn() },
  useLocalSearchParams: () => ({ duration: "15" }),
  usePathname: () => "/tools/meditation/session-log",
}));
jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));
jest.mock("@/src/features/meditation/queries", () => ({
  useMeditationProgramState: () => ({ data: { currentStage: 1 } }),
  useSaveMeditationSession: () => ({ mutateAsync: mockSave, isPending: false }),
}));

describe("MeditationSessionLogScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("exposes the mood scale as radios with the picked value checked", () => {
    renderWithProviders(<MeditationSessionLogScreen />);

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(10);
    expect(screen.queryAllByRole("radio", { checked: true })).toHaveLength(0);

    fireEvent.press(screen.getByRole("radio", { name: "7" }));

    const checked = screen.getAllByRole("radio", { checked: true });
    expect(checked).toHaveLength(1);
    expect(checked[0]).toBe(screen.getByRole("radio", { name: "7" }));
  });
});
