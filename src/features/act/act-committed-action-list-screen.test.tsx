import { fireEvent, screen } from "@testing-library/react-native";

import ActCommittedActionListScreen from "@/src/features/act/act-committed-action-list-screen";
import { useCommittedActionArchivePages, useCommittedActions } from "@/src/features/act/queries";
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
  useCommittedActionArchivePages: jest.fn(),
}));

const mockActive = useCommittedActions as jest.MockedFunction<typeof useCommittedActions>;
const mockArchive = useCommittedActionArchivePages as jest.MockedFunction<
  typeof useCommittedActionArchivePages
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

/**
 * `archive` is every finished row on the "server"; the mock hands each status's hook only
 * the rows of that status, the way the per-status read does (#2186). `over` applies to
 * both archives unless keyed by status.
 */
function setUp(
  active: CommittedAction[],
  archive: CommittedAction[] = [],
  over: Record<string, unknown> = {},
  overByStatus: Partial<Record<"completed" | "abandoned", Record<string, unknown>>> = {},
) {
  mockActive.mockReturnValue({
    data: active,
    isLoading: false,
  } as unknown as ReturnType<typeof useCommittedActions>);
  mockArchive.mockImplementation(
    (_userId, status) =>
      ({
        data: { pages: [archive.filter((a) => a.status === status)], pageParams: [null] },
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isPending: false,
        ...over,
        ...overByStatus[status],
      }) as unknown as ReturnType<typeof useCommittedActionArchivePages>,
  );
}

function renderList(
  active: CommittedAction[],
  archive: CommittedAction[] = [],
  over: Record<string, unknown> = {},
  overByStatus: Partial<Record<"completed" | "abandoned", Record<string, unknown>>> = {},
) {
  setUp(active, archive, over, overByStatus);
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
   * The header help door (#1543): the label `HelpButton` composes is what pins
   * this door to the `committedAction` key, and the sheet's own rendering is
   * pinned in `help-sheet.test.tsx`.
   *
   * Matching the composed label rather than the sheet's title matters here:
   * this screen's own heading is "Committed Action" too, so a title match would
   * pass with no door on the screen at all.
   */
  it("opens the committed action help sheet from the header", () => {
    renderList([]);

    fireEvent.press(screen.getByLabelText("Help: Committed Action"));

    expect(screen.getByTestId("help-sheet-content")).toBeTruthy();
  });
});

/**
 * ☠️ #1517 split this screen's read by status rather than flattening its three sections
 * into one keyset page — see the screen's docblock for why a flat `created_at desc` page
 * cuts across all three and fills them raggedly.
 */
describe("the committed action list's status split", () => {
  beforeEach(() => jest.clearAllMocks());

  /**
   * ☠️ The active read must stay UNBOUNDED and whole. The widget, the routines engine and
   * the programme all treat a missing committed action as one that does not exist, so a
   * cap here silently drops a commitment the user is still working on. Asserting the
   * status argument is what stops someone "tidying up" by pointing this at the archive.
   */
  it("asks for the active set on its own, with no paging", () => {
    renderList([ACTION]);

    expect(mockActive).toHaveBeenCalledWith("user-1", "active");
  });

  it("renders the finished halves from the paged archive, under their own headings", () => {
    renderList(
      [ACTION],
      [
        { ...ACTION, id: "a2", title: "A finished one", status: "completed" },
        { ...ACTION, id: "a3", title: "A dropped one", status: "abandoned" },
      ],
    );

    // Each status word appears twice - once as the section heading, once on the row's
    // own status badge - so these count rather than expecting a single node.
    expect(screen.getAllByText("Active")).toHaveLength(2);
    expect(screen.getAllByText("Completed")).toHaveLength(2);
    expect(screen.getAllByText("Abandoned")).toHaveLength(2);
    expect(screen.getByText("A finished one")).toBeTruthy();
    expect(screen.getByText("A dropped one")).toBeTruthy();
  });

  /**
   * ☠️ The empty state now has to consider BOTH reads. Keying it on the active read alone
   * would tell a user with a long finished history and nothing in flight that they have
   * never committed to anything.
   */
  it("says nothing-yet only when both halves are empty", () => {
    renderList([], []);
    expect(
      screen.getByText('No committed actions yet. Tap "New action" to start one.'),
    ).toBeTruthy();
  });

  it("does not claim an empty history when only the active set is empty", () => {
    renderList([], [{ ...ACTION, id: "a2", title: "A finished one", status: "completed" }]);

    expect(
      screen.queryByText('No committed actions yet. Tap "New action" to start one.'),
    ).toBeNull();
    expect(screen.getByText("A finished one")).toBeTruthy();
  });

  // The control's label changed with #2186 — it names its section now — so the press
  // below follows the copy; what it pins is unchanged.
  it("extends the archive on request, and offers that only when another page exists", () => {
    const fetchNextPage = jest.fn();
    renderList([ACTION], [{ ...ACTION, id: "a2", status: "completed" }], {
      hasNextPage: true,
      fetchNextPage,
    });

    fireEvent.press(screen.getByText("Show more completed actions"));

    expect(fetchNextPage).toHaveBeenCalled();
  });

  /**
   * ☠️ Completed and Abandoned are two reads, two pages, two controls (#2186). They used
   * to be carved out of ONE twenty-row page: when the twenty newest finished rows were all
   * completed, the Abandoned section rendered nothing — no heading, no rows — and the one
   * "Show more" under all three sections gave no reason to press it looking for a section
   * that had silently gone. The three abandoned rows here are older than every completed
   * one, which is exactly the shape the shared page hid.
   */
  it("keeps a full page of one finished status from hiding the other", () => {
    const fetchCompleted = jest.fn();
    const fetchAbandoned = jest.fn();
    const completed = Array.from({ length: 20 }, (_, i) => ({
      ...ACTION,
      id: `c${i}`,
      title: `Finished ${i}`,
      status: "completed" as const,
      createdAt: `2026-08-${String(i + 1).padStart(2, "0")}T09:00:00.000Z`,
    }));
    const abandoned = Array.from({ length: 3 }, (_, i) => ({
      ...ACTION,
      id: `x${i}`,
      title: `Dropped ${i}`,
      status: "abandoned" as const,
      createdAt: `2025-08-0${i + 1}T09:00:00.000Z`,
    }));

    renderList(
      [],
      [...completed, ...abandoned],
      {},
      {
        completed: { hasNextPage: true, fetchNextPage: fetchCompleted },
        abandoned: { hasNextPage: false, fetchNextPage: fetchAbandoned },
      },
    );

    // One read per finished status, never one read for both.
    expect(mockArchive).toHaveBeenCalledWith("user-1", "completed");
    expect(mockArchive).toHaveBeenCalledWith("user-1", "abandoned");

    // Both sections are on the screen, heading and rows, whatever the other holds. The
    // status word is the heading plus one badge per row, so these count.
    expect(screen.getAllByText("Completed")).toHaveLength(21);
    expect(screen.getAllByText("Abandoned")).toHaveLength(4);
    expect(screen.getByText("Dropped 0")).toBeTruthy();
    expect(screen.getByText("Finished 19")).toBeTruthy();

    // The control belongs to the section that has more, and names it. The exhausted
    // section offers none.
    expect(screen.queryByText("Show more abandoned actions")).toBeNull();
    fireEvent.press(screen.getByText("Show more completed actions"));
    expect(fetchCompleted).toHaveBeenCalled();
    expect(fetchAbandoned).not.toHaveBeenCalled();
  });

  /**
   * ☠️ A failed read is NOT an empty list, and BOTH halves have to say so. This screen
   * reaches the empty state through `active.length === 0 && archive.length === 0`, which a
   * failed read satisfies just as well as an empty account — so a user mid-commitment
   * would be told they had never committed to anything, while the widget and the routines
   * engine went on reading the same rows successfully.
   */
  it.each([
    ["the active read", { activeError: true, archiveError: false }],
    ["the archive read", { activeError: false, archiveError: true }],
  ])("says so when %s fails, rather than claiming an empty list", (_label, flags) => {
    mockActive.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: flags.activeError,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useCommittedActions>);
    mockArchive.mockReturnValue({
      data: undefined,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isError: flags.archiveError,
      isFetchingNextPage: false,
      isPending: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useCommittedActionArchivePages>);

    renderWithProviders(<ActCommittedActionListScreen />);

    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(
      screen.queryByText('No committed actions yet. Tap "New action" to start one.'),
    ).toBeNull();
  });

  it("offers no Show more when the archive is complete", () => {
    renderList([ACTION], [{ ...ACTION, id: "a2", status: "completed" }], { hasNextPage: false });

    expect(screen.queryByText(/^Show more/)).toBeNull();
  });
});
