import { screen } from "@testing-library/react-native";

import ActCommittedActionListScreen from "@/src/features/act/act-committed-action-list-screen";
import { useCommittedActions } from "@/src/features/act/queries";
import type { CommittedAction } from "@/src/features/act/types";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), canGoBack: jest.fn(() => false) },
  usePathname: () => "/modules/act/committed-action",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/act/queries", () => ({
  useCommittedActions: jest.fn(),
}));

const mockUseCommittedActions = useCommittedActions as jest.MockedFunction<
  typeof useCommittedActions
>;

const ACTION: CommittedAction = {
  id: "a1",
  userId: "user-1",
  lifeDomain: "work",
  title: "Walk three times this week",
  description: "",
  status: "active",
  targetDate: "2026-09-01",
  obstacles: "",
  createdAt: "2026-08-25T09:00:00.000Z",
  updatedAt: "2026-08-25T09:00:00.000Z",
};

function renderList(actions: CommittedAction[]) {
  mockUseCommittedActions.mockReturnValue({
    data: actions,
    isLoading: false,
  } as unknown as ReturnType<typeof useCommittedActions>);
  renderWithProviders(<ActCommittedActionListScreen />);
}

describe("the committed action list's target date", () => {
  beforeEach(() => jest.clearAllMocks());

  it("reads as a date rather than as the stored key", () => {
    renderList([ACTION]);

    // `2026-09-01` is a wire format. Same shape as the picker's own trigger,
    // through the same `formatDayKey` (#1303).
    expect(screen.getByText("Target: Tue, Sep 1, 2026")).toBeTruthy();
    expect(screen.queryByText(/2026-09-01/)).toBeNull();
  });

  it("says nothing about a target date when there is none", () => {
    renderList([{ ...ACTION, targetDate: null }]);

    expect(screen.queryByText(/^Target: /)).toBeNull();
  });
});
