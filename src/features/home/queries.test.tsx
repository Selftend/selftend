import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import {
  useAddWidget,
  useRemoveWidget,
  useReorderWidgets,
  useRestoreWidget,
  useWidgetPreferences,
} from "@/src/features/home/queries";
import {
  addWidgetPreference,
  deleteWidgetPreference,
  listWidgetPreferences,
  restoreWidgetPreference,
  setWidgetOrder,
} from "@/src/features/home/widget-repository";
import { createTestQueryClient } from "@/test/render-with-providers";

jest.mock("@/src/features/home/widget-repository", () => ({
  addWidgetPreference: jest.fn(),
  deleteWidgetPreference: jest.fn(),
  listWidgetPreferences: jest.fn(),
  restoreWidgetPreference: jest.fn(),
  setWidgetOrder: jest.fn(),
}));

const mockListWidgets = listWidgetPreferences as jest.MockedFunction<typeof listWidgetPreferences>;
const mockAdd = addWidgetPreference as jest.MockedFunction<typeof addWidgetPreference>;
const mockDelete = deleteWidgetPreference as jest.MockedFunction<typeof deleteWidgetPreference>;
const mockRestore = restoreWidgetPreference as jest.MockedFunction<typeof restoreWidgetPreference>;
const mockSetOrder = setWidgetOrder as jest.MockedFunction<typeof setWidgetOrder>;

// widgetKeys.list(userId) mirrored from queries.ts for exact-key assertions.
const listKey = (userId: string) => ["widgets", "list", userId];

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("useWidgetPreferences", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns existing widgets", async () => {
    const existing = [
      { id: "w1", userId: "u1", widgetId: "mood-checkin", position: 0, createdAt: "2026-01-01" },
    ];
    mockListWidgets.mockResolvedValue(existing);

    const client = createTestQueryClient();
    const { result } = renderHook(() => useWidgetPreferences("u1"), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(existing);
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("keeps an empty Home empty without seeding defaults", async () => {
    mockListWidgets.mockResolvedValue([]);

    const client = createTestQueryClient();
    const { result } = renderHook(() => useWidgetPreferences("u1"), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("does not fetch when userId is null (query disabled)", () => {
    const client = createTestQueryClient();
    renderHook(() => useWidgetPreferences(null), { wrapper: makeWrapper(client) });
    expect(mockListWidgets).not.toHaveBeenCalled();
  });
});

describe("useAddWidget", () => {
  beforeEach(() => jest.clearAllMocks());

  // The hook used to read the list and post `max(position) + 1`. It must not read at
  // all now: the position is the server's, computed under a per-user lock (#974).
  it("adds by id alone, without reading the list to compute a position", async () => {
    const existing = [
      { id: "w1", userId: "u1", widgetId: "mood-checkin", position: 0, createdAt: "2026-01-01" },
      { id: "w2", userId: "u1", widgetId: "sleep-latest", position: 2, createdAt: "2026-01-01" },
      { id: "w3", userId: "u1", widgetId: "cbt-open-record", position: 1, createdAt: "2026-01-01" },
    ];
    mockListWidgets.mockResolvedValue(existing);
    mockAdd.mockResolvedValue();

    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useAddWidget("u1"), { wrapper: makeWrapper(client) });

    await act(async () => {
      await result.current.mutateAsync("habits-today");
    });

    expect(mockAdd).toHaveBeenCalledWith("habits-today");
    // The read-then-write is gone: no list read happens on the add path.
    expect(mockListWidgets).not.toHaveBeenCalled();
    // onSuccess invalidates the user's widget list with the exact key.
    const keys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(keys).toContainEqual(listKey("u1"));
  });

  it("skips invalidation when userId is null (onSuccess guard)", async () => {
    mockListWidgets.mockResolvedValue([]);
    mockAdd.mockResolvedValue();

    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useAddWidget(null), { wrapper: makeWrapper(client) });

    await act(async () => {
      await result.current.mutateAsync("habits-today");
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it("adds the same way on an empty dashboard - the server still owns position 0", async () => {
    mockListWidgets.mockResolvedValue([]);
    mockAdd.mockResolvedValue();

    const client = createTestQueryClient();
    const { result } = renderHook(() => useAddWidget("u1"), { wrapper: makeWrapper(client) });

    await act(async () => {
      await result.current.mutateAsync("habits-today");
    });

    expect(mockAdd).toHaveBeenCalledWith("habits-today");
    expect(mockListWidgets).not.toHaveBeenCalled();
  });
});

describe("useRemoveWidget", () => {
  beforeEach(() => jest.clearAllMocks());

  it("deletes the widget and invalidates the list for a real user", async () => {
    mockDelete.mockResolvedValue();

    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useRemoveWidget("u1"), { wrapper: makeWrapper(client) });

    await act(async () => {
      await result.current.mutateAsync("mood-checkin");
    });

    expect(mockDelete).toHaveBeenCalledWith("u1", "mood-checkin");
    const keys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(keys).toContainEqual(listKey("u1"));
  });

  it("skips invalidation when userId is null (onSuccess guard)", async () => {
    mockDelete.mockResolvedValue();

    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useRemoveWidget(null), { wrapper: makeWrapper(client) });

    await act(async () => {
      await result.current.mutateAsync("mood-checkin");
    });

    expect(spy).not.toHaveBeenCalled();
  });
});

describe("useReorderWidgets", () => {
  beforeEach(() => jest.clearAllMocks());

  it("persists the new order and invalidates the list for a real user", async () => {
    mockSetOrder.mockResolvedValue();
    const order = ["sleep-latest", "mood-checkin", "habits-today"];

    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useReorderWidgets("u1"), { wrapper: makeWrapper(client) });

    await act(async () => {
      await result.current.mutateAsync(order);
    });

    expect(mockSetOrder).toHaveBeenCalledWith(order);
    const keys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(keys).toContainEqual(listKey("u1"));
  });

  it("skips invalidation when userId is null (onSuccess guard)", async () => {
    mockSetOrder.mockResolvedValue();

    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useReorderWidgets(null), { wrapper: makeWrapper(client) });

    await act(async () => {
      await result.current.mutateAsync(["sleep-latest"]);
    });

    expect(spy).not.toHaveBeenCalled();
  });
});

describe("useRestoreWidget", () => {
  beforeEach(() => jest.clearAllMocks());

  it("restores the widget at its prior position and invalidates the list", async () => {
    mockRestore.mockResolvedValue();
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useRestoreWidget("u1"), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ widgetId: "mood-checkin", position: 1 });
    });

    expect(mockRestore).toHaveBeenCalledWith("u1", "mood-checkin", 1);
    const keys = spy.mock.calls.map((call) => (call[0] as { queryKey?: unknown }).queryKey);
    expect(keys).toContainEqual(listKey("u1"));
  });
});
