import { screen } from "@testing-library/react-native";

import ActExpansionListScreen from "@/src/features/act/act-expansion-list-screen";
import { useExpansionLogs } from "@/src/features/act/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), canGoBack: jest.fn(() => false) },
  usePathname: () => "/modules/act/expansion",
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
  useExpansionLogs: jest.fn(),
}));

const mockUseExpansionLogs = useExpansionLogs as jest.MockedFunction<typeof useExpansionLogs>;

describe("ActExpansionListScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows only logs whose createdAt is the selected day", () => {
    mockUseExpansionLogs.mockReturnValue({
      data: [
        {
          id: "today",
          userId: "user-1",
          emotion: "today emotion",
          bodySensation: "",
          intensityBefore: null,
          intensityAfter: null,
          struggleSwitchOn: null,
          discomfortType: null,
          techniqueUsed: "makeRoom",
          notes: "",
          createdAt: "2026-05-24T09:00:00.000Z",
          updatedAt: "2026-05-24T09:00:00.000Z",
        },
        {
          id: "old",
          userId: "user-1",
          emotion: "old emotion",
          bodySensation: "",
          intensityBefore: null,
          intensityAfter: null,
          struggleSwitchOn: null,
          discomfortType: null,
          techniqueUsed: "makeRoom",
          notes: "",
          createdAt: "2026-05-20T09:00:00.000Z",
          updatedAt: "2026-05-20T09:00:00.000Z",
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useExpansionLogs>);

    renderWithProviders(<ActExpansionListScreen />);

    expect(screen.getByText("today emotion")).toBeTruthy();
    expect(screen.queryByText("old emotion")).toBeNull();
  });
});
