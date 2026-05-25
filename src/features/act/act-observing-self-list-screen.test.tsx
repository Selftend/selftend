import { screen } from "@testing-library/react-native";

import ActObservingSelfListScreen from "@/src/features/act/act-observing-self-list-screen";
import { useObservingSelfSessions } from "@/src/features/act/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), canGoBack: jest.fn(() => false) },
  usePathname: () => "/modules/act/observing-self",
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
  useObservingSelfSessions: jest.fn(),
}));

const mockUseObservingSelfSessions = useObservingSelfSessions as jest.MockedFunction<
  typeof useObservingSelfSessions
>;

describe("ActObservingSelfListScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows only sessions whose createdAt is the selected day", () => {
    mockUseObservingSelfSessions.mockReturnValue({
      data: [
        {
          id: "today",
          userId: "user-1",
          techniqueUsed: "tenDeepBreaths",
          whatWasObserved: "today observation",
          durationMinutes: null,
          moodAfter: null,
          notes: "",
          createdAt: "2026-05-24T09:00:00.000Z",
          updatedAt: "2026-05-24T09:00:00.000Z",
        },
        {
          id: "old",
          userId: "user-1",
          techniqueUsed: "tenDeepBreaths",
          whatWasObserved: "old observation",
          durationMinutes: null,
          moodAfter: null,
          notes: "",
          createdAt: "2026-05-20T09:00:00.000Z",
          updatedAt: "2026-05-20T09:00:00.000Z",
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useObservingSelfSessions>);

    renderWithProviders(<ActObservingSelfListScreen />);

    expect(screen.getByText("today observation")).toBeTruthy();
    expect(screen.queryByText("old observation")).toBeNull();
  });
});
