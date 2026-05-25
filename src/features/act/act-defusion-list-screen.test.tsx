import { screen } from "@testing-library/react-native";

import ActDefusionListScreen from "@/src/features/act/act-defusion-list-screen";
import { useDefusionLogs } from "@/src/features/act/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), canGoBack: jest.fn(() => false) },
  usePathname: () => "/modules/act/defusion",
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
  useDefusionLogs: jest.fn(),
}));

const mockUseDefusionLogs = useDefusionLogs as jest.MockedFunction<typeof useDefusionLogs>;

describe("ActDefusionListScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows only logs whose createdAt is the selected day", () => {
    mockUseDefusionLogs.mockReturnValue({
      data: [
        {
          id: "today",
          userId: "user-1",
          fusedThought: "today thought",
          thoughtCategory: "selfJudgment",
          techniqueUsed: "havingTheThoughtThat",
          defusedVersion: "",
          fusionLevelBefore: null,
          fusionLevelAfter: null,
          notes: "",
          createdAt: "2026-05-24T09:00:00.000Z",
          updatedAt: "2026-05-24T09:00:00.000Z",
        },
        {
          id: "old",
          userId: "user-1",
          fusedThought: "old thought",
          thoughtCategory: "selfJudgment",
          techniqueUsed: "havingTheThoughtThat",
          defusedVersion: "",
          fusionLevelBefore: null,
          fusionLevelAfter: null,
          notes: "",
          createdAt: "2026-05-20T09:00:00.000Z",
          updatedAt: "2026-05-20T09:00:00.000Z",
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useDefusionLogs>);

    renderWithProviders(<ActDefusionListScreen />);

    expect(screen.getByText("today thought")).toBeTruthy();
    expect(screen.queryByText("old thought")).toBeNull();
  });
});
