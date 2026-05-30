import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import { useSaveExposureSession, useSaveHierarchy } from "@/src/features/exposure/queries";
import { saveHierarchy, saveItems, saveSession } from "@/src/features/exposure/repository";
import { createTestQueryClient } from "@/test/render-with-providers";

jest.mock("@/src/features/exposure/repository", () => ({
  deleteChoicePoint: jest.fn(),
  getHierarchy: jest.fn(),
  listAllItems: jest.fn(),
  listHierarchies: jest.fn(),
  listItems: jest.fn(),
  listSessions: jest.fn(),
  saveHierarchy: jest.fn(),
  saveItems: jest.fn(),
  saveSession: jest.fn(),
}));

const mockSaveHierarchy = saveHierarchy as jest.MockedFunction<typeof saveHierarchy>;
const mockSaveItems = saveItems as jest.MockedFunction<typeof saveItems>;
const mockSaveSession = saveSession as jest.MockedFunction<typeof saveSession>;

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("useSaveHierarchy", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls saveHierarchy then saveItems with the returned hierarchy id", async () => {
    const hierarchy = { id: "h1", userId: "u1", title: "Test", anxietyType: "social" } as never;
    mockSaveHierarchy.mockResolvedValue(hierarchy);
    mockSaveItems.mockResolvedValue();

    const client = createTestQueryClient();
    const { result } = renderHook(() => useSaveHierarchy("u1"), {
      wrapper: makeWrapper(client),
    });

    const items = [{ description: "Step 1", sudsRating: 30 } as never];

    await act(async () => {
      await result.current.mutateAsync({
        input: { title: "Test", anxietyType: "social" } as never,
        items,
      });
    });

    expect(mockSaveHierarchy).toHaveBeenCalledWith("u1", { title: "Test", anxietyType: "social" });
    expect(mockSaveItems).toHaveBeenCalledWith("u1", "h1", items);
    // saveHierarchy must be called before saveItems
    const hierarchyOrder = mockSaveHierarchy.mock.invocationCallOrder[0];
    const itemsOrder = mockSaveItems.mock.invocationCallOrder[0];
    expect(hierarchyOrder).toBeLessThan(itemsOrder);
  });

  it("returns the saved hierarchy", async () => {
    const hierarchy = { id: "h1", userId: "u1", title: "Test", anxietyType: "social" } as never;
    mockSaveHierarchy.mockResolvedValue(hierarchy);
    mockSaveItems.mockResolvedValue();

    const client = createTestQueryClient();
    const { result } = renderHook(() => useSaveHierarchy("u1"), {
      wrapper: makeWrapper(client),
    });

    let returned: unknown;
    await act(async () => {
      returned = await result.current.mutateAsync({ input: { title: "Test" } as never, items: [] });
    });

    expect(returned).toBe(hierarchy);
  });
});

describe("useSaveExposureSession", () => {
  beforeEach(() => jest.clearAllMocks());

  it("invalidates only the all exposure key when hierarchyId is null", async () => {
    mockSaveSession.mockResolvedValue({ id: "s1" } as never);

    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useSaveExposureSession("u1", null), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        itemId: "item1",
        input: { preSuds: 50, postSuds: 20 } as never,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Should be called with "all" exposure key only
    const allCalls = spy.mock.calls.map((c) => c[0]);
    const queryKeys = allCalls.map((c) => (c as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["exposure"]);
    // Should NOT contain an items key with a hierarchyId
    const itemsWithHierarchy = queryKeys.filter(
      (k) => Array.isArray(k) && k[0] === "exposure" && k[1] === "items" && k.length > 3,
    );
    expect(itemsWithHierarchy).toHaveLength(0);
  });

  it("also invalidates the items key for the hierarchy when hierarchyId is present", async () => {
    mockSaveSession.mockResolvedValue({ id: "s1" } as never);

    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useSaveExposureSession("u1", "h1"), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        itemId: "item1",
        input: { preSuds: 50, postSuds: 20 } as never,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const allCalls = spy.mock.calls.map((c) => c[0]);
    const queryKeys = allCalls.map((c) => (c as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["exposure"]);
    expect(queryKeys).toContainEqual(["exposure", "items", "u1", "h1"]);
  });
});
