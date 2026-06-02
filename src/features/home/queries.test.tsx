import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import { useAddWidget, useWidgetPreferences } from "@/src/features/home/queries";
import {
  getWidgetsSeeded,
  insertWidgetPreferences,
  listWidgetPreferences,
  markWidgetsSeeded,
} from "@/src/features/home/widget-repository";
import { resolveInitialWidgetIds } from "@/src/features/home/seeding";
import { listPlanItems } from "@/src/features/plan/repository";
import { createTestQueryClient } from "@/test/render-with-providers";

jest.mock("@/src/features/home/widget-repository", () => ({
  deleteWidgetPreference: jest.fn(),
  getWidgetsSeeded: jest.fn(),
  insertWidgetPreferences: jest.fn(),
  listWidgetPreferences: jest.fn(),
  markWidgetsSeeded: jest.fn(),
  updateWidgetPositions: jest.fn(),
}));

jest.mock("@/src/features/home/seeding", () => ({
  resolveInitialWidgetIds: jest.fn(),
}));

jest.mock("@/src/features/plan/repository", () => ({
  listPlanItems: jest.fn(),
}));

const mockListWidgets = listWidgetPreferences as jest.MockedFunction<typeof listWidgetPreferences>;
const mockGetSeeded = getWidgetsSeeded as jest.MockedFunction<typeof getWidgetsSeeded>;
const mockInsert = insertWidgetPreferences as jest.MockedFunction<typeof insertWidgetPreferences>;
const mockMarkSeeded = markWidgetsSeeded as jest.MockedFunction<typeof markWidgetsSeeded>;
const mockResolveInitial = resolveInitialWidgetIds as jest.MockedFunction<
  typeof resolveInitialWidgetIds
>;
const mockListPlanItems = listPlanItems as jest.MockedFunction<typeof listPlanItems>;

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("useWidgetPreferences - listOrSeed", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns existing widgets when present without seeding", async () => {
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
    expect(mockGetSeeded).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns empty array when list is empty and seeding already ran (no re-seed)", async () => {
    mockListWidgets.mockResolvedValue([]);
    mockGetSeeded.mockResolvedValue(true);

    const client = createTestQueryClient();
    const { result } = renderHook(() => useWidgetPreferences("u1"), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockMarkSeeded).not.toHaveBeenCalled();
  });

  it("seeds widgets when list is empty and not yet seeded, then marks seeded", async () => {
    const seededWidgets = [
      { id: "w1", userId: "u1", widgetId: "mood-checkin", position: 0, createdAt: "2026-01-01" },
    ];
    // First call: empty (triggers seed); second call: after seeding
    mockListWidgets.mockResolvedValueOnce([]).mockResolvedValueOnce(seededWidgets);
    mockGetSeeded.mockResolvedValue(false);
    mockListPlanItems.mockResolvedValue([]);
    mockResolveInitial.mockReturnValue(["mood-checkin"]);
    mockInsert.mockResolvedValue();
    mockMarkSeeded.mockResolvedValue();

    const client = createTestQueryClient();
    const { result } = renderHook(() => useWidgetPreferences("u1"), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInsert).toHaveBeenCalledWith("u1", ["mood-checkin"], 0);
    expect(mockMarkSeeded).toHaveBeenCalledWith("u1");
    expect(result.current.data).toEqual(seededWidgets);
  });

  it("does not fetch when userId is null (query disabled)", () => {
    const client = createTestQueryClient();
    renderHook(() => useWidgetPreferences(null), { wrapper: makeWrapper(client) });
    expect(mockListWidgets).not.toHaveBeenCalled();
  });
});

describe("useAddWidget - nextPosition", () => {
  beforeEach(() => jest.clearAllMocks());

  it("computes nextPosition as max(position) + 1 when widgets exist", async () => {
    const existing = [
      { id: "w1", userId: "u1", widgetId: "mood-checkin", position: 0, createdAt: "2026-01-01" },
      { id: "w2", userId: "u1", widgetId: "mood-trend", position: 2, createdAt: "2026-01-01" },
      { id: "w3", userId: "u1", widgetId: "cbt-open-record", position: 1, createdAt: "2026-01-01" },
    ];
    mockListWidgets.mockResolvedValue(existing);
    mockInsert.mockResolvedValue();
    // For the invalidation re-fetch after onSuccess
    mockGetSeeded.mockResolvedValue(true);

    const client = createTestQueryClient();
    const { result } = renderHook(() => useAddWidget("u1"), { wrapper: makeWrapper(client) });

    await act(async () => {
      await result.current.mutateAsync("habits-today");
    });

    // max position is 2, so nextPosition = 3
    expect(mockInsert).toHaveBeenCalledWith("u1", ["habits-today"], 3);
  });

  it("uses position 0 when there are no existing widgets", async () => {
    mockListWidgets.mockResolvedValue([]);
    mockInsert.mockResolvedValue();
    mockGetSeeded.mockResolvedValue(true);

    const client = createTestQueryClient();
    const { result } = renderHook(() => useAddWidget("u1"), { wrapper: makeWrapper(client) });

    await act(async () => {
      await result.current.mutateAsync("habits-today");
    });

    expect(mockInsert).toHaveBeenCalledWith("u1", ["habits-today"], 0);
  });
});
