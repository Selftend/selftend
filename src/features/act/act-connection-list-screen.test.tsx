import { screen } from "@testing-library/react-native";

import ActConnectionListScreen from "@/src/features/act/act-connection-list-screen";
import { useConnectionLogs } from "@/src/features/act/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), canGoBack: jest.fn(() => false) },
  usePathname: () => "/modules/act/connection",
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
  useConnectionLogs: jest.fn(),
}));

const mockUseConnectionLogs = useConnectionLogs as jest.MockedFunction<typeof useConnectionLogs>;

describe("ActConnectionListScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows only logs whose createdAt is the selected day", () => {
    mockUseConnectionLogs.mockReturnValue({
      data: [
        {
          id: "today",
          userId: "user-1",
          technique: "noticeFiveThings",
          activityContext: "",
          noticesFromSenses: "today notice",
          durationMinutes: null,
          moodAfter: null,
          notes: "",
          createdAt: "2026-05-24T09:00:00.000Z",
          updatedAt: "2026-05-24T09:00:00.000Z",
        },
        {
          id: "old",
          userId: "user-1",
          technique: "noticeFiveThings",
          activityContext: "",
          noticesFromSenses: "old notice",
          durationMinutes: null,
          moodAfter: null,
          notes: "",
          createdAt: "2026-05-20T09:00:00.000Z",
          updatedAt: "2026-05-20T09:00:00.000Z",
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useConnectionLogs>);

    renderWithProviders(<ActConnectionListScreen />);

    expect(screen.getByText("today notice")).toBeTruthy();
    expect(screen.queryByText("old notice")).toBeNull();
  });
});
