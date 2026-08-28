import { fireEvent, screen } from "@testing-library/react-native";

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

describe("the committed action list's help door", () => {
  beforeEach(() => jest.clearAllMocks());

  /**
   * The header help door (#1543). `HelpButton` composes its own label
   * (`"Help: " + the help title`), so matching that label is what pins this door
   * to the `committedAction` key; the press proves the sheet's `how`/`why` - the
   * only copy this door unlocks - actually reach the screen.
   *
   * Asserting the label rather than the sheet title matters here: this screen's
   * own heading is "Committed Action" too, so a title match would pass without a
   * door.
   */
  it("opens the committed action help sheet from the header", () => {
    renderList([]);

    fireEvent.press(screen.getByLabelText("Help: Committed Action"));

    expect(
      screen.getByText(
        "Waiting to feel ready means waiting forever. Small committed steps build momentum and prove values-guided living is possible even in difficulty.",
      ),
    ).toBeTruthy();
  });
});
