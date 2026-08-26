import { fireEvent, screen } from "@testing-library/react-native";

import { router } from "expo-router";

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
  useSelectedDate: () => ({ selectedDate: "2026-05-24" }),
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

  /**
   * The list renders through the shared `DefusionLogRow` (#1388), the same row
   * ACT home shows - so tapping through from home does not change the shape of
   * what the user is reading.
   *
   * ⚠️ Asserts on rendered TEXT and ROUTES only, never on how `dayLogs` is
   * derived: #1332 owns a rewrite of this screen's filtering, and these
   * assertions must survive it.
   */
  it("renders each log as a shared row: technique, pair on the meta line, no category", () => {
    mockUseDefusionLogs.mockReturnValue({
      data: [
        {
          id: "log-1",
          userId: "user-1",
          fusedThought: "today thought",
          thoughtCategory: "selfJudgment",
          techniqueUsed: "musicalThoughts",
          defusedVersion: "",
          fusionLevelBefore: 60,
          fusionLevelAfter: 20,
          notes: "",
          createdAt: "2026-05-24T09:00:00.000Z",
          updatedAt: "2026-05-24T09:00:00.000Z",
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useDefusionLogs>);

    renderWithProviders(<ActDefusionListScreen />);

    expect(screen.getByText("Musical thoughts")).toBeTruthy();
    expect(screen.queryByText("Self-judgment")).toBeNull();
    expect(screen.getByText("60 → 20")).toBeTruthy();

    fireEvent.press(screen.getByText("today thought"));

    expect(router.push as jest.Mock).toHaveBeenCalledWith({
      pathname: "/modules/act/defusion/[id]",
      params: { id: "log-1" },
    });
  });
});
