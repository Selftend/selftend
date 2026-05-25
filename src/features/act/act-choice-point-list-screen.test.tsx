import { screen } from "@testing-library/react-native";

import ActChoicePointListScreen from "@/src/features/act/act-choice-point-list-screen";
import { useChoicePoints } from "@/src/features/act/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), canGoBack: jest.fn(() => false) },
  usePathname: () => "/modules/act/choice-point",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/stores/selected-date-store", () => ({
  useSelectedDate: () => ({ selectedDate: "2026-05-24", isToday: true }),
  toLocalDateKey: (iso: string) => iso.slice(0, 10),
}));

jest.mock("@/src/features/act/queries", () => ({
  useChoicePoints: jest.fn(),
}));

const mockUseChoicePoints = useChoicePoints as jest.MockedFunction<typeof useChoicePoints>;

describe("ActChoicePointListScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows only choice points whose createdAt is the selected day", () => {
    mockUseChoicePoints.mockReturnValue({
      data: [
        {
          id: "today",
          userId: "user-1",
          hooks: ["today hook"],
          awayMoves: [],
          towardMoves: [],
          notes: "",
          createdAt: "2026-05-24T09:00:00.000Z",
          updatedAt: "2026-05-24T09:00:00.000Z",
        },
        {
          id: "old",
          userId: "user-1",
          hooks: ["old hook"],
          awayMoves: [],
          towardMoves: [],
          notes: "",
          createdAt: "2026-05-20T09:00:00.000Z",
          updatedAt: "2026-05-20T09:00:00.000Z",
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useChoicePoints>);

    renderWithProviders(<ActChoicePointListScreen />);

    expect(screen.getByText("today hook")).toBeTruthy();
    expect(screen.queryByText("old hook")).toBeNull();
  });
});
