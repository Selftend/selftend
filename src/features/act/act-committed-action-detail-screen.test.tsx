import { screen } from "@testing-library/react-native";

import ActCommittedActionDetailScreen from "@/src/features/act/act-committed-action-detail-screen";
import { useCommittedActions } from "@/src/features/act/queries";
import type { CommittedAction } from "@/src/features/act/types";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => ({ id: "a1" }),
  usePathname: () => "/modules/act/committed-action/a1",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/stores/toast-store", () => ({
  useToastStore: (selector: (s: { showToast: jest.Mock }) => unknown) =>
    selector({ showToast: jest.fn() }),
}));

// Every mutation is idle here — these tests read the screen, they don't drive
// it. Built inside the factory rather than hoisted: jest rejects a module
// factory that closes over anything not `mock`-prefixed.
jest.mock("@/src/features/act/queries", () => {
  const idle = () => ({ mutateAsync: jest.fn(), isPending: false });
  return {
    useCommittedActions: jest.fn(),
    useCommittedAction: jest.fn(() => ({ data: null, isLoading: false })),
    useActionSteps: jest.fn(() => ({ data: [] })),
    useSaveActionStep: idle,
    useToggleActionStep: idle,
    useDeleteActionStep: idle,
    useUpdateCommittedAction: idle,
    useDeleteCommittedAction: idle,
  };
});

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

function renderDetail(action: CommittedAction) {
  mockUseCommittedActions.mockReturnValue({ data: [action] } as unknown as ReturnType<
    typeof useCommittedActions
  >);
  renderWithProviders(<ActCommittedActionDetailScreen />);
}

describe("the committed action detail's target date", () => {
  beforeEach(() => jest.clearAllMocks());

  it("reads as a date rather than as the stored key", () => {
    renderDetail(ACTION);

    expect(screen.getByText("Tue, Sep 1, 2026")).toBeTruthy();
    expect(screen.queryByText("2026-09-01")).toBeNull();
  });

  it("leaves the card out when there is no target date", () => {
    renderDetail({ ...ACTION, targetDate: null });

    expect(screen.queryByText("Target date (optional)")).toBeNull();
  });
});
