import { fireEvent, screen } from "@testing-library/react-native";
import { ActivityIndicator } from "react-native";

import ActCommittedActionDetailScreen from "@/src/features/act/act-committed-action-detail-screen";
import { useCommittedAction, useListedCommittedActions } from "@/src/features/act/queries";
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
    // The detail probes the list screen's own cache entries (#2190), never the plain
    // status-less list read — that one is absent here on purpose, so a probe of it throws.
    useListedCommittedActions: jest.fn(),
    useCommittedAction: jest.fn(() => ({ data: null, isLoading: false })),
    useActionSteps: jest.fn(() => ({ data: [] })),
    useSaveActionStep: idle,
    useToggleActionStep: idle,
    useDeleteActionStep: idle,
    useUpdateCommittedAction: idle,
    useDeleteCommittedAction: idle,
  };
});

const mockUseListedCommittedActions = useListedCommittedActions as jest.MockedFunction<
  typeof useListedCommittedActions
>;
const mockUseCommittedAction = useCommittedAction as jest.MockedFunction<typeof useCommittedAction>;

/** The two fields `useCachedItem` reads, in the shape the mocked hook must return. */
const idleItem = (result: { data: CommittedAction | null | undefined; isLoading: boolean }) =>
  result as unknown as ReturnType<typeof useCommittedAction>;

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
  mockUseListedCommittedActions.mockReturnValue({ data: [action] });
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

/**
 * ☠️ A status change is the one edit on this screen that MOVES the row between the three
 * entries its probe unions (#2257). The mutation invalidates all three; they refetch
 * concurrently, and when the old entry's response lands before the new entry's, the row
 * is in none of them — the single-row read flips on with nothing cached yet. That instant
 * used to replace the whole detail with the loading scaffold, on the screen's primary
 * action. Deterministically so for an action older than the twenty newest at its new
 * status, which never re-enters page one.
 */
describe("a status change from the detail", () => {
  beforeEach(() => jest.clearAllMocks());
  afterEach(() =>
    mockUseCommittedAction.mockReturnValue(idleItem({ data: null, isLoading: false })),
  );

  it("keeps the detail painted while the row is between the list's entries", () => {
    mockUseListedCommittedActions.mockReturnValue({ data: [ACTION] });
    const view = renderWithProviders(<ActCommittedActionDetailScreen />);
    expect(screen.getByText("Walk three times this week")).toBeTruthy();

    fireEvent.press(screen.getByText("Mark complete"));

    // The union has lost the row; the single-row read is on and has not answered.
    mockUseListedCommittedActions.mockReturnValue({ data: [] });
    mockUseCommittedAction.mockReturnValue(idleItem({ data: undefined, isLoading: true }));
    view.rerender(<ActCommittedActionDetailScreen />);

    expect(screen.getByText("Walk three times this week")).toBeTruthy();
    expect(screen.getByText("Mark complete")).toBeTruthy();
    expect(screen.UNSAFE_queryAllByType(ActivityIndicator)).toEqual([]);
  });
});
