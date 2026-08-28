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

const ARCHIVES = [
  ["defusion", useDefusionLogPages, repo.listDefusionLogsPage, "createdAt", "defusionHistoryPages"],
  [
    "expansion",
    useExpansionLogPages,
    repo.listExpansionLogsPage,
    "createdAt",
    "expansionHistoryPages",
  ],
  [
    "connection",
    useConnectionLogPages,
    repo.listConnectionLogsPage,
    "createdAt",
    "connectionHistoryPages",
  ],
  [
    "observing self",
    useObservingSelfSessionPages,
    repo.listObservingSelfSessionsPage,
    "createdAt",
    "observingHistoryPages",
  ],
  [
    "choice point",
    useChoicePointPages,
    repo.listChoicePointsPage,
    "createdAt",
    "choicePointHistoryPages",
  ],
  [
    "urge surf",
    useUrgeSurfLogPages,
    repo.listUrgeSurfLogsPage,
    "createdAt",
    "urgeSurfHistoryPages",
  ],
  [
    "bull's-eye",
    useBullsEyeSnapshotPages,
    repo.listBullsEyeSnapshotsPage,
    "reviewedAt",
    "bullsEyeHistoryPages",
  ],
  [
    "committed action archive",
    useCommittedActionArchivePages,
    repo.listCommittedActionArchivePage,
    "createdAt",
    "committedActionArchivePages",
  ],
] as const;

beforeEach(() => {
  jest.clearAllMocks();
});

describe.each(ARCHIVES)("%s archive paging", (_label, useHook, read, field, keyName) => {
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
    expect(repoFn()).toHaveBeenCalledWith("u1", ACT_HISTORY_PAGE_SIZE, null);
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
      expect(repoFn()).toHaveBeenLastCalledWith("u1", ACT_HISTORY_PAGE_SIZE, {
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

    const key = actKeys[keyName]("u1");
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
