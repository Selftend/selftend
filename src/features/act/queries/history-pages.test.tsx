import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import * as repo from "@/src/features/act/repository";
import {
  useBullsEyeSnapshotPages,
  useChoicePointPages,
  useCommittedActionArchivePages,
  useConnectionLogPages,
  useDefusionLogPages,
  useExpansionLogPages,
  useListedCommittedActions,
  useObservingSelfSessionPages,
  useUrgeSurfLog,
  useUrgeSurfLogPages,
} from "@/src/features/act/queries";
import { ACT_HISTORY_PAGE_SIZE, actKeys } from "@/src/features/act/queries/keys";
import { createTestQueryClient } from "@/test/render-with-providers";

// Explicit factory rather than an automock of the re-export barrel — the pattern the
// sibling `queries.test.tsx` already established for the same reason.
jest.mock("@/src/features/act/repository", () => ({
  getUrgeSurfLog: jest.fn(),
  listBullsEyeSnapshotsPage: jest.fn(),
  listChoicePointsPage: jest.fn(),
  listCommittedActionArchivePage: jest.fn(),
  listCommittedActions: jest.fn(),
  listConnectionLogsPage: jest.fn(),
  listDefusionLogsPage: jest.fn(),
  listExpansionLogsPage: jest.fn(),
  listObservingSelfSessionsPage: jest.fn(),
  listUrgeSurfLogsPage: jest.fn(),
}));

function wrap(client: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

/** A row carrying whichever timestamp field this archive keysets on. */
function row(i: number, field: string) {
  return { id: `id-${i}`, [field]: `2026-05-${String((i % 28) + 1).padStart(2, "0")}T09:00:00Z` };
}

/**
 * `[label, hook, repository read, timestamp field, cache key, leading read arguments]`.
 *
 * The last column is what the read takes BETWEEN the user id and the page arguments:
 * empty for the seven flat archives, the status for the committed-action archive, which
 * pages each finished status on its own (#2186).
 */
const ARCHIVES = [
  [
    "defusion",
    useDefusionLogPages,
    repo.listDefusionLogsPage,
    "createdAt",
    actKeys.defusionHistoryPages("u1"),
    [],
  ],
  [
    "expansion",
    useExpansionLogPages,
    repo.listExpansionLogsPage,
    "createdAt",
    actKeys.expansionHistoryPages("u1"),
    [],
  ],
  [
    "connection",
    useConnectionLogPages,
    repo.listConnectionLogsPage,
    "createdAt",
    actKeys.connectionHistoryPages("u1"),
    [],
  ],
  [
    "observing self",
    useObservingSelfSessionPages,
    repo.listObservingSelfSessionsPage,
    "createdAt",
    actKeys.observingHistoryPages("u1"),
    [],
  ],
  [
    "choice point",
    useChoicePointPages,
    repo.listChoicePointsPage,
    "createdAt",
    actKeys.choicePointHistoryPages("u1"),
    [],
  ],
  [
    "urge surf",
    useUrgeSurfLogPages,
    repo.listUrgeSurfLogsPage,
    "createdAt",
    actKeys.urgeSurfHistoryPages("u1"),
    [],
  ],
  [
    "bull's-eye",
    useBullsEyeSnapshotPages,
    repo.listBullsEyeSnapshotsPage,
    "reviewedAt",
    actKeys.bullsEyeHistoryPages("u1"),
    [],
  ],
  [
    "completed committed action archive",
    (userId: string | null) => useCommittedActionArchivePages(userId, "completed"),
    repo.listCommittedActionArchivePage,
    "createdAt",
    actKeys.committedActionArchivePages("u1", "completed"),
    ["completed"],
  ],
  [
    "abandoned committed action archive",
    (userId: string | null) => useCommittedActionArchivePages(userId, "abandoned"),
    repo.listCommittedActionArchivePage,
    "createdAt",
    actKeys.committedActionArchivePages("u1", "abandoned"),
    ["abandoned"],
  ],
] as const;

beforeEach(() => {
  jest.clearAllMocks();
});

describe.each(ARCHIVES)("%s archive paging", (_label, useHook, read, field, key, leading) => {
  const repoFn = () => read as jest.Mock;

  it("does not read anything for a signed-out user", () => {
    renderHook(() => useHook(null), { wrapper: wrap(createTestQueryClient()) });

    expect(repoFn()).not.toHaveBeenCalled();
  });

  it("asks for the flat family's page size, with no cursor on the first page", async () => {
    repoFn().mockResolvedValue([]);

    const { result } = renderHook(() => useHook("u1"), {
      wrapper: wrap(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(repoFn()).toHaveBeenCalledWith("u1", ...leading, ACT_HISTORY_PAGE_SIZE, null);
  });

  /**
   * ☠️ A SHORT page is the last page. Without this arm the archive would spend a round
   * trip per scroll to the bottom forever, and `hasNextPage` would stay true against an
   * exhausted feed — an infinite spinner on a complete history.
   */
  it("stops at a short page", async () => {
    repoFn().mockResolvedValue([row(0, field)]);

    const { result } = renderHook(() => useHook("u1"), {
      wrapper: wrap(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });

  /**
   * ☠️ And a FULL page must carry a cursor built from its LAST row — the keyset boundary.
   * Getting this wrong repeats or skips rows at every page seam rather than failing
   * loudly, which is why the cursor's contents are asserted rather than just `hasNextPage`.
   */
  it("carries a keyset cursor off the last row of a full page", async () => {
    const page = Array.from({ length: ACT_HISTORY_PAGE_SIZE }, (_, i) => row(i, field));
    repoFn().mockResolvedValueOnce(page).mockResolvedValueOnce([]);

    const { result } = renderHook(() => useHook("u1"), {
      wrapper: wrap(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);

    await result.current.fetchNextPage();

    const last = page[page.length - 1];
    await waitFor(() =>
      expect(repoFn()).toHaveBeenLastCalledWith("u1", ...leading, ACT_HISTORY_PAGE_SIZE, {
        timestamp: last[field as keyof typeof last],
        id: last.id,
      }),
    );
  });

  /**
   * ☠️ The archive must NOT share a cache entry with its tool's list hook: an infinite
   * query caches a `{ pages, pageParams }` envelope where the list hook caches a bare
   * array, so a collision hands whichever mounts second the other's shape. Nesting under
   * the list prefix is what keeps every existing mutation invalidation reaching it.
   */
  it("caches under its own key, nested inside the list prefix", async () => {
    repoFn().mockResolvedValue([]);
    const client = createTestQueryClient();

    const { result } = renderHook(() => useHook("u1"), { wrapper: wrap(client) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(client.getQueryData(key)).toMatchObject({ pages: [[]] });
  });
});

/**
 * The single-row read behind urge surf's new `[id]` route (#1517).
 *
 * ☠️ Both halves of the gate matter, and they fail differently. A null user is the
 * signed-out case; a null id is the cold-load case where the route param has not resolved
 * yet — and firing the read with `logId!` as `undefined` would ask PostgREST for a row
 * with no id, which 400s on the uuid cast rather than answering not-found.
 */
describe("useUrgeSurfLog", () => {
  const mockGet = () => repo.getUrgeSurfLog as jest.Mock;

  it("does not read for a signed-out user", () => {
    renderHook(() => useUrgeSurfLog(null, "log-1"), {
      wrapper: wrap(createTestQueryClient()),
    });

    expect(mockGet()).not.toHaveBeenCalled();
  });

  it("does not read before the route id has resolved", () => {
    renderHook(() => useUrgeSurfLog("u1", null), {
      wrapper: wrap(createTestQueryClient()),
    });

    expect(mockGet()).not.toHaveBeenCalled();
  });

  it("reads the row once both are present", async () => {
    mockGet().mockResolvedValue({ id: "log-1", urgeDescription: "an urge" });

    const { result } = renderHook(() => useUrgeSurfLog("u1", "log-1"), {
      wrapper: wrap(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet()).toHaveBeenCalledWith("u1", "log-1");
    expect(result.current.data).toMatchObject({ urgeDescription: "an urge" });
  });
});

/**
 * The committed-action detail's cache probe (#2190): the whole active set plus every
 * loaded page of both finished archives, so a tapped row paints from whatever the list
 * screen already holds.
 */
describe("useListedCommittedActions", () => {
  const mockActive = () => repo.listCommittedActions as jest.Mock;
  const mockArchive = () => repo.listCommittedActionArchivePage as jest.Mock;
  const action = (id: string, status: string) => ({
    id,
    status,
    createdAt: "2026-05-01T09:00:00Z",
  });
  /** A read that never lands — one entry still in flight while another is warm. */
  const pending = () => new Promise<never>(() => {});

  it("reads nothing for a signed-out user and holds no rows", () => {
    const { result } = renderHook(() => useListedCommittedActions(null), {
      wrapper: wrap(createTestQueryClient()),
    });

    expect(mockActive()).not.toHaveBeenCalled();
    expect(mockArchive()).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it("reads the whole active set and the first page of each finished archive, in that order", async () => {
    mockActive().mockResolvedValue([action("a1", "active")]);
    mockArchive().mockImplementation((_u: string, status: string) =>
      Promise.resolve([action(`${status}-1`, status)]),
    );

    const { result } = renderHook(() => useListedCommittedActions("u1"), {
      wrapper: wrap(createTestQueryClient()),
    });

    // Nothing has landed yet: no entry, rather than an empty union that a detail screen
    // would read as "not found".
    expect(result.current.data).toBeUndefined();

    await waitFor(() => expect(result.current.data).toHaveLength(3));
    expect(mockActive()).toHaveBeenCalledWith("u1", "active");
    expect(mockArchive()).toHaveBeenCalledWith("u1", "completed", ACT_HISTORY_PAGE_SIZE, null);
    expect(mockArchive()).toHaveBeenCalledWith("u1", "abandoned", ACT_HISTORY_PAGE_SIZE, null);
    expect(result.current.data?.map((a) => a.id)).toEqual(["a1", "completed-1", "abandoned-1"]);
  });

  /**
   * ☠️ Any ONE warm entry is enough to paint from. The detail screen probes this on the
   * list-to-detail hop, and waiting for all three reads before offering any rows would
   * put the spinner back on exactly the hop the probe exists to make instant.
   */
  it("offers the active set while both archives are still in flight", async () => {
    mockActive().mockResolvedValue([action("a1", "active")]);
    mockArchive().mockImplementation(pending);

    const { result } = renderHook(() => useListedCommittedActions("u1"), {
      wrapper: wrap(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data?.[0].id).toBe("a1");
  });

  it("offers a landed archive while the active read is still in flight", async () => {
    mockActive().mockImplementation(pending);
    mockArchive().mockImplementation((_u: string, status: string) =>
      status === "completed" ? Promise.resolve([action("c1", "completed")]) : pending(),
    );

    const { result } = renderHook(() => useListedCommittedActions("u1"), {
      wrapper: wrap(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data?.[0].id).toBe("c1");
  });

  /**
   * A row on page two of an archive is a row the list screen showed, so the detail must
   * find it: the probe flattens EVERY loaded page, not the first.
   */
  it("carries every loaded page of an archive, not only the first", async () => {
    const client = createTestQueryClient();
    mockActive().mockResolvedValue([]);
    mockArchive().mockResolvedValue([]);
    client.setQueryData(actKeys.committedActionArchivePages("u1", "abandoned"), {
      pages: [[action("x1", "abandoned")], [action("x2", "abandoned")]],
      pageParams: [null, { timestamp: "2026-05-01T09:00:00Z", id: "x1" }],
    });

    const { result } = renderHook(() => useListedCommittedActions("u1"), {
      wrapper: wrap(client),
    });

    await waitFor(() =>
      expect(result.current.data?.map((a) => a.id)).toEqual(expect.arrayContaining(["x1", "x2"])),
    );
  });
});
