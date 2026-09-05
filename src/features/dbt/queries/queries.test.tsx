import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import * as repo from "@/src/features/dbt/repository";
import {
  DBT_HISTORY_PAGE_SIZE,
  dbtKeys,
  useCopingPlan,
  useDbtSessionCount,
  useDbtSessions,
  useDeleteCopingPlan,
  useDeleteEmotionRecord,
  useDeleteJudgement,
  useDeleteOppositeActionPlan,
  useDeleteScript,
  useDeleteWiseMindCheckin,
  useEmotionRecord,
  useEmotionRecordCount,
  useEmotionRecordPages,
  useEmotionRecords,
  useJudgement,
  useJudgementCount,
  useJudgementPages,
  useJudgements,
  useMarkOppositeActionPlanDone,
  useMarkScriptDone,
  useOppositeActionPlan,
  useOppositeActionPlanCount,
  useOppositeActionPlanPages,
  useOppositeActionPlans,
  usePrefetchCopingPlan,
  useSaveCopingPlan,
  useSaveDbtSession,
  useSaveEmotionRecord,
  useSaveJudgement,
  useSaveOppositeActionPlan,
  useSaveScript,
  useSaveWiseMindCheckin,
  useScript,
  useScriptCount,
  useScriptPages,
  useScripts,
  useWiseMindCheckin,
  useWiseMindCheckinCount,
  useWiseMindCheckinPages,
  useWiseMindCheckins,
} from "@/src/features/dbt/queries";
import { recordDaysKeys } from "@/src/features/progress/queries";
import { createTestQueryClient } from "@/test/render-with-providers";

// An explicit factory rather than an automock of the re-export barrel - the
// pattern `src/features/act/queries/queries.test.tsx` established, for the same
// reason: automocking a barrel does not reliably yield callable mock fns.
jest.mock("@/src/features/dbt/repository", () => ({
  countDbtSessions: jest.fn(),
  countEmotionRecords: jest.fn(),
  countJudgements: jest.fn(),
  countOppositeActionPlans: jest.fn(),
  countScripts: jest.fn(),
  countWiseMindCheckins: jest.fn(),
  deleteCopingPlan: jest.fn(),
  deleteEmotionRecord: jest.fn(),
  deleteJudgement: jest.fn(),
  deleteOppositeActionPlan: jest.fn(),
  deleteScript: jest.fn(),
  deleteWiseMindCheckin: jest.fn(),
  getCopingPlan: jest.fn(),
  getEmotionRecord: jest.fn(),
  getJudgement: jest.fn(),
  getOppositeActionPlan: jest.fn(),
  getScript: jest.fn(),
  getWiseMindCheckin: jest.fn(),
  listDbtSessions: jest.fn(),
  listEmotionRecords: jest.fn(),
  listEmotionRecordsPage: jest.fn(),
  listJudgements: jest.fn(),
  listJudgementsPage: jest.fn(),
  listOppositeActionPlans: jest.fn(),
  listOppositeActionPlansPage: jest.fn(),
  listScripts: jest.fn(),
  listScriptsPage: jest.fn(),
  listWiseMindCheckins: jest.fn(),
  listWiseMindCheckinsPage: jest.fn(),
  markOppositeActionPlanDone: jest.fn(),
  markScriptDone: jest.fn(),
  saveCopingPlan: jest.fn(),
  saveDbtSession: jest.fn(),
  saveEmotionRecord: jest.fn(),
  saveJudgement: jest.fn(),
  saveOppositeActionPlan: jest.fn(),
  saveScript: jest.fn(),
  saveWiseMindCheckin: jest.fn(),
}));

function wrap(client: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

/** The keys left stale by a mutation, as arrays for comparison. */
function invalidatedKeys(client: QueryClient) {
  return client
    .getQueryCache()
    .getAll()
    .filter((query) => query.state.isInvalidated)
    .map((query) => query.queryKey);
}

beforeEach(() => {
  jest.clearAllMocks();
  for (const fn of Object.values(repo)) {
    if (typeof fn === "function") (fn as jest.Mock).mockResolvedValue([]);
  }
});

// ---------------------------------------------------------------------------
// Read gates. Every DBT read is `enabled: Boolean(userId)`, so a signed-out
// render must not reach the repository at all.
// ---------------------------------------------------------------------------
const listHooks = [
  ["useCopingPlan", useCopingPlan, repo.getCopingPlan],
  ["useDbtSessions", useDbtSessions, repo.listDbtSessions],
  ["useDbtSessionCount", useDbtSessionCount, repo.countDbtSessions],
  ["useWiseMindCheckins", useWiseMindCheckins, repo.listWiseMindCheckins],
  ["useWiseMindCheckinCount", useWiseMindCheckinCount, repo.countWiseMindCheckins],
  ["useWiseMindCheckinPages", useWiseMindCheckinPages, repo.listWiseMindCheckinsPage],
  ["useJudgements", useJudgements, repo.listJudgements],
  ["useJudgementCount", useJudgementCount, repo.countJudgements],
  ["useJudgementPages", useJudgementPages, repo.listJudgementsPage],
  ["useEmotionRecords", useEmotionRecords, repo.listEmotionRecords],
  ["useEmotionRecordCount", useEmotionRecordCount, repo.countEmotionRecords],
  ["useEmotionRecordPages", useEmotionRecordPages, repo.listEmotionRecordsPage],
  ["useOppositeActionPlans", useOppositeActionPlans, repo.listOppositeActionPlans],
  ["useOppositeActionPlanCount", useOppositeActionPlanCount, repo.countOppositeActionPlans],
  ["useOppositeActionPlanPages", useOppositeActionPlanPages, repo.listOppositeActionPlansPage],
  ["useScripts", useScripts, repo.listScripts],
  ["useScriptCount", useScriptCount, repo.countScripts],
  ["useScriptPages", useScriptPages, repo.listScriptsPage],
] as const;

describe.each(listHooks)("%s enabled gate", (_name, useHook, repoFn) => {
  it("does not read when there is no user", () => {
    renderHook(() => (useHook as (u: string | null) => unknown)(null), {
      wrapper: wrap(createTestQueryClient()),
    });
    expect(repoFn).not.toHaveBeenCalled();
  });

  it("reads once there is one", async () => {
    renderHook(() => (useHook as (u: string | null) => unknown)("u1"), {
      wrapper: wrap(createTestQueryClient()),
    });
    await waitFor(() => expect(repoFn).toHaveBeenCalled());
  });
});

// ---------------------------------------------------------------------------
// ☠️ The limit is an argument to the fetch, so a key that omits it lets two
// callers asking for different depths share one cache entry - whichever mounts
// first wins and the other silently gets the wrong number of rows (ACT's
// `limitedListHooks`, fixed one hook at a time there because nothing asserted
// the rule as a rule). The list prefix still matches every variant on
// invalidation, so keying on the limit costs nothing.
// ---------------------------------------------------------------------------
const limitedListHooks = [
  ["useDbtSessions", useDbtSessions, repo.listDbtSessions, 100],
  ["useWiseMindCheckins", useWiseMindCheckins, repo.listWiseMindCheckins, 30],
  ["useJudgements", useJudgements, repo.listJudgements, 30],
  ["useEmotionRecords", useEmotionRecords, repo.listEmotionRecords, 30],
  ["useOppositeActionPlans", useOppositeActionPlans, repo.listOppositeActionPlans, 50],
  ["useScripts", useScripts, repo.listScripts, 50],
] as const;

describe.each(limitedListHooks)("%s limit keying", (_name, useHook, repoFn, fallback) => {
  it("gives each caller the depth it asked for, not the depth that mounted first", async () => {
    const client = createTestQueryClient();
    const hook = useHook as (
      userId: string | null,
      limit?: number,
    ) => { data: unknown[] | undefined };

    // Row count mirrors the requested limit, so the rows each caller holds say
    // which fetch filled its cache entry.
    (repoFn as jest.Mock).mockImplementation((_userId: string, limit: number) =>
      Promise.resolve(Array.from({ length: limit }, (_, i) => ({ id: `r${i}` }))),
    );

    const wide = renderHook(() => hook("u1", 500), { wrapper: wrap(client) });
    await waitFor(() => expect(wide.result.current.data).toHaveLength(500));

    const narrow = renderHook(() => hook("u1"), { wrapper: wrap(client) });
    await waitFor(() => expect(narrow.result.current.data).toHaveLength(fallback));

    // ☠️ The assertion that actually catches a shared key: both callers must
    // hold their own rows at the same time. "Was called with 30" passes even on
    // a colliding key, because the second observer refetches and overwrites.
    expect(wide.result.current.data).toHaveLength(500);
  });
});

// ---------------------------------------------------------------------------
// Detail gates: `Boolean(userId) && Boolean(id)`, all three branches.
// ---------------------------------------------------------------------------
const detailHooks = [
  ["useWiseMindCheckin", useWiseMindCheckin, repo.getWiseMindCheckin],
  ["useJudgement", useJudgement, repo.getJudgement],
  ["useEmotionRecord", useEmotionRecord, repo.getEmotionRecord],
  ["useOppositeActionPlan", useOppositeActionPlan, repo.getOppositeActionPlan],
  ["useScript", useScript, repo.getScript],
] as const;

describe.each(detailHooks)("%s enabled gate", (_name, useHook, repoFn) => {
  const render = (userId: string | null, id: string | null) =>
    renderHook(() => (useHook as (u: string | null, i: string | null) => unknown)(userId, id), {
      wrapper: wrap(createTestQueryClient()),
    });

  it("does not read without a user", () => {
    render(null, "r1");
    expect(repoFn).not.toHaveBeenCalled();
  });

  it("does not read without an id", () => {
    render("u1", null);
    expect(repoFn).not.toHaveBeenCalled();
  });

  it("reads when it has both", async () => {
    render("u1", "r1");
    await waitFor(() => expect(repoFn).toHaveBeenCalled());
  });
});

// ---------------------------------------------------------------------------
// Paging. `getNextPageParam` returns undefined on a short page - the signal
// that stops the infinite query - and a cursor built from the last row
// otherwise.
// ---------------------------------------------------------------------------
const pagedHooks = [
  ["wise mind", useWiseMindCheckinPages, repo.listWiseMindCheckinsPage],
  ["judgements", useJudgementPages, repo.listJudgementsPage],
  ["emotion records", useEmotionRecordPages, repo.listEmotionRecordsPage],
  ["opposite action", useOppositeActionPlanPages, repo.listOppositeActionPlansPage],
  ["scripts", useScriptPages, repo.listScriptsPage],
] as const;

describe.each(pagedHooks)("%s paging", (_name, useHook, repoFn) => {
  const rows = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      id: `row-${i}`,
      createdAt: `2026-06-${String(i + 1).padStart(2, "0")}T09:00:00.000Z`,
    }));

  it("asks for one page at the shared size, with no cursor first", async () => {
    (repoFn as jest.Mock).mockResolvedValue(rows(DBT_HISTORY_PAGE_SIZE));
    const hook = useHook as (u: string | null) => {
      hasNextPage: boolean;
      fetchNextPage: () => void;
    };
    const { result } = renderHook(() => hook("u1"), { wrapper: wrap(createTestQueryClient()) });

    await waitFor(() => expect(repoFn).toHaveBeenCalled());
    expect(repoFn).toHaveBeenCalledWith("u1", DBT_HISTORY_PAGE_SIZE, null);
    // A full page means there may be another, so the cursor is the last row's.
    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
  });

  it("stops at a short page rather than asking forever", async () => {
    (repoFn as jest.Mock).mockResolvedValue(rows(DBT_HISTORY_PAGE_SIZE - 1));
    const hook = useHook as (u: string | null) => { hasNextPage: boolean };
    const { result } = renderHook(() => hook("u1"), { wrapper: wrap(createTestQueryClient()) });

    await waitFor(() => expect(repoFn).toHaveBeenCalled());
    await waitFor(() => expect(result.current.hasNextPage).toBe(false));
  });
});

// ---------------------------------------------------------------------------
// Writes. Every DBT mutation suppresses the global toast (its screen shows its
// own), and every one that writes a `record_days` source invalidates the
// record-days root as well as its own list - the rule #1906 set and
// `test/record-days-invalidation.test.ts` derives from the migration.
// ---------------------------------------------------------------------------
const recordWriteHooks = [
  [
    "useSaveWiseMindCheckin",
    useSaveWiseMindCheckin,
    repo.saveWiseMindCheckin,
    dbtKeys.wiseMindList,
  ],
  ["useSaveJudgement", useSaveJudgement, repo.saveJudgement, dbtKeys.judgementList],
  ["useSaveEmotionRecord", useSaveEmotionRecord, repo.saveEmotionRecord, dbtKeys.emotionRecordList],
  [
    "useSaveOppositeActionPlan",
    useSaveOppositeActionPlan,
    repo.saveOppositeActionPlan,
    dbtKeys.oppositeActionList,
  ],
  ["useSaveScript", useSaveScript, repo.saveScript, dbtKeys.scriptList],
  ["useSaveDbtSession", useSaveDbtSession, repo.saveDbtSession, dbtKeys.sessionList],
] as const;

describe.each(recordWriteHooks)("%s", (_name, useHook, repoFn, listKey) => {
  it("invalidates its own list and the record-days root", async () => {
    (repoFn as jest.Mock).mockResolvedValue({ id: "r1" });
    const client = createTestQueryClient();
    client.setQueryData(listKey("u1"), []);
    client.setQueryData(recordDaysKeys.all, []);

    const { result } = renderHook(
      () =>
        (useHook as (u: string | null) => { mutateAsync: (input: never) => Promise<unknown> })(
          "u1",
        ),
      { wrapper: wrap(client) },
    );
    await result.current.mutateAsync({} as never);

    const stale = invalidatedKeys(client);
    expect(stale).toContainEqual([...listKey("u1")]);
    expect(stale).toContainEqual([...recordDaysKeys.all]);
  });

  it("writes but invalidates nothing when there is no user", async () => {
    (repoFn as jest.Mock).mockResolvedValue({ id: "r1" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(
      () =>
        (useHook as (u: string | null) => { mutateAsync: (input: never) => Promise<unknown> })(
          null,
        ),
      { wrapper: wrap(client) },
    );
    await result.current.mutateAsync({} as never);

    expect(repoFn).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});

const deleteHooks = [
  [
    "useDeleteWiseMindCheckin",
    useDeleteWiseMindCheckin,
    repo.deleteWiseMindCheckin,
    dbtKeys.wiseMindList,
  ],
  ["useDeleteJudgement", useDeleteJudgement, repo.deleteJudgement, dbtKeys.judgementList],
  [
    "useDeleteEmotionRecord",
    useDeleteEmotionRecord,
    repo.deleteEmotionRecord,
    dbtKeys.emotionRecordList,
  ],
  [
    "useDeleteOppositeActionPlan",
    useDeleteOppositeActionPlan,
    repo.deleteOppositeActionPlan,
    dbtKeys.oppositeActionList,
  ],
  ["useDeleteScript", useDeleteScript, repo.deleteScript, dbtKeys.scriptList],
] as const;

describe.each(deleteHooks)("%s", (_name, useHook, repoFn, listKey) => {
  it("removes the record and stales both its list and the record-days root", async () => {
    (repoFn as jest.Mock).mockResolvedValue(undefined);
    const client = createTestQueryClient();
    client.setQueryData(listKey("u1"), []);
    client.setQueryData(recordDaysKeys.all, []);

    const { result } = renderHook(
      () =>
        (useHook as (u: string | null) => { mutateAsync: (id: string) => Promise<unknown> })("u1"),
      { wrapper: wrap(client) },
    );
    await result.current.mutateAsync("r1");

    expect(repoFn).toHaveBeenCalledWith("u1", "r1");
    const stale = invalidatedKeys(client);
    expect(stale).toContainEqual([...listKey("u1")]);
    expect(stale).toContainEqual([...recordDaysKeys.all]);
  });
});

describe("the two done mutations", () => {
  const doneHooks = [
    [
      "useMarkOppositeActionPlanDone",
      useMarkOppositeActionPlanDone,
      repo.markOppositeActionPlanDone,
      dbtKeys.oppositeActionList,
      dbtKeys.oppositeActionDetail,
    ],
    [
      "useMarkScriptDone",
      useMarkScriptDone,
      repo.markScriptDone,
      dbtKeys.scriptList,
      dbtKeys.scriptDetail,
    ],
  ] as const;

  it.each(doneHooks)(
    "%s reaches the list, the record's own detail and the record-days root",
    async (_name, useHook, repoFn, listKey, detailKey) => {
      // The detail key is built from the RESOLVED row, not from the argument -
      // a done record whose detail stays fresh still reads "not done yet".
      (repoFn as jest.Mock).mockResolvedValue({ id: "r1" });
      const client = createTestQueryClient();
      client.setQueryData(listKey("u1"), []);
      client.setQueryData(detailKey("u1", "r1"), {});
      client.setQueryData(recordDaysKeys.all, []);

      const { result } = renderHook(
        () =>
          (
            useHook as (u: string | null) => {
              mutateAsync: (vars: { id: string; input: never }) => Promise<unknown>;
            }
          )("u1"),
        { wrapper: wrap(client) },
      );
      await result.current.mutateAsync({ id: "r1", input: {} as never });

      const stale = invalidatedKeys(client);
      expect(stale).toContainEqual([...listKey("u1")]);
      expect(stale).toContainEqual([...detailKey("u1", "r1")]);
      expect(stale).toContainEqual([...recordDaysKeys.all]);
    },
  );

  it.each(doneHooks)(
    "%s invalidates nothing when there is no user",
    async (_name, useHook, repoFn) => {
      (repoFn as jest.Mock).mockResolvedValue({ id: "r1" });
      const client = createTestQueryClient();
      const spy = jest.spyOn(client, "invalidateQueries");

      const { result } = renderHook(
        () =>
          (
            useHook as (u: string | null) => {
              mutateAsync: (vars: { id: string; input: never }) => Promise<unknown>;
            }
          )(null),
        { wrapper: wrap(client) },
      );
      await result.current.mutateAsync({ id: "r1", input: {} as never });

      expect(spy).not.toHaveBeenCalled();
    },
  );
});

// ---------------------------------------------------------------------------
// The coping plan is the one write that must NOT touch record days: it has no
// day, so a plan saved today marks nothing on the timeline (#1992 §4).
// ---------------------------------------------------------------------------
describe("coping plan mutations", () => {
  it("saves through the insert path or the replace path, and stales only the plan", async () => {
    (repo.saveCopingPlan as jest.Mock).mockResolvedValue({ id: "p1" });
    const client = createTestQueryClient();
    client.setQueryData(dbtKeys.copingPlan("u1"), null);
    client.setQueryData(recordDaysKeys.all, []);

    const { result } = renderHook(() => useSaveCopingPlan("u1"), { wrapper: wrap(client) });
    await result.current.mutateAsync({ plan: { items: [], fallback: [] }, existingId: null });

    expect(repo.saveCopingPlan).toHaveBeenCalledWith("u1", { items: [], fallback: [] }, null);
    const stale = invalidatedKeys(client);
    expect(stale).toContainEqual([...dbtKeys.copingPlan("u1")]);
    expect(stale).not.toContainEqual([...recordDaysKeys.all]);
  });

  it("skips invalidation without a user", async () => {
    (repo.saveCopingPlan as jest.Mock).mockResolvedValue({ id: "p1" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useSaveCopingPlan(null), { wrapper: wrap(client) });
    await result.current.mutateAsync({ plan: { items: [], fallback: [] }, existingId: null });

    expect(spy).not.toHaveBeenCalled();
  });

  it("deleting the plan stales the plan key and nothing else", async () => {
    (repo.deleteCopingPlan as jest.Mock).mockResolvedValue(undefined);
    const client = createTestQueryClient();
    client.setQueryData(dbtKeys.copingPlan("u1"), {});
    client.setQueryData(recordDaysKeys.all, []);

    const { result } = renderHook(() => useDeleteCopingPlan("u1"), { wrapper: wrap(client) });
    await result.current.mutateAsync("p1");

    expect(repo.deleteCopingPlan).toHaveBeenCalledWith("u1", "p1");
    const stale = invalidatedKeys(client);
    expect(stale).toContainEqual([...dbtKeys.copingPlan("u1")]);
    expect(stale).not.toContainEqual([...recordDaysKeys.all]);
  });

  it("deleting invalidates nothing without a user", async () => {
    (repo.deleteCopingPlan as jest.Mock).mockResolvedValue(undefined);
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useDeleteCopingPlan(null), { wrapper: wrap(client) });
    await result.current.mutateAsync("p1");

    expect(spy).not.toHaveBeenCalled();
  });

  it("prefetches the plan on the module home, and does nothing signed out", async () => {
    (repo.getCopingPlan as jest.Mock).mockResolvedValue(null);
    const client = createTestQueryClient();
    const { result } = renderHook(() => usePrefetchCopingPlan(), { wrapper: wrap(client) });

    result.current(null);
    expect(repo.getCopingPlan).not.toHaveBeenCalled();

    result.current("u1");
    await waitFor(() => expect(repo.getCopingPlan).toHaveBeenCalledWith("u1"));
  });
});
