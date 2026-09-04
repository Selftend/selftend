import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import { recordDaysKey, useRecordDays } from "@/src/features/progress/queries";
import * as repo from "@/src/features/progress/repository";
import { createTestQueryClient } from "@/test/render-with-providers";

jest.mock("@/src/features/progress/repository", () => ({
  listRecordDays: jest.fn(),
  viewerOffsetMinutes: jest.fn(() => 330),
}));

const mockListRecordDays = jest.mocked(repo.listRecordDays);

function wrap(client: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockListRecordDays.mockResolvedValue([]);
});

describe("recordDaysKey", () => {
  it("carries the frame as well as the user, because the RPC reads both", () => {
    // They move independently: rows that captured no offset are bucketed by the
    // frame passed in, so flying between zones changes the answer while the user
    // id does not move. Keying on the id alone would serve the departure city's
    // days after arrival.
    expect(recordDaysKey("user-1", 330)).not.toEqual(recordDaysKey("user-1", -480));
  });

  it("keeps a signed-out reader off every real user's cache entry", () => {
    expect(recordDaysKey(null, 330)).toEqual(["progress", "record-days", "anonymous", 330]);
  });
});

describe("useRecordDays", () => {
  it("does not fetch without a user", () => {
    const client = createTestQueryClient();
    renderHook(() => useRecordDays(null), { wrapper: wrap(client) });

    expect(mockListRecordDays).not.toHaveBeenCalled();
    expect(client.getQueryState(recordDaysKey(null, 330))?.fetchStatus).toBe("idle");
  });

  it("fetches the viewer's days under the viewer's own frame by default", async () => {
    mockListRecordDays.mockResolvedValue(["2026-03-02", "2026-03-10"]);
    const client = createTestQueryClient();
    const { result } = renderHook(() => useRecordDays("user-1"), { wrapper: wrap(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(["2026-03-02", "2026-03-10"]);
    expect(mockListRecordDays).toHaveBeenCalledWith(330);
  });

  it("asks again under a different frame instead of serving the cached answer", async () => {
    const client = createTestQueryClient();
    const { result, rerender } = renderHook(
      ({ offset }: { offset: number }) => useRecordDays("user-1", offset),
      { wrapper: wrap(client), initialProps: { offset: 330 } },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender({ offset: -480 });
    await waitFor(() => expect(mockListRecordDays).toHaveBeenCalledWith(-480));
    expect(mockListRecordDays).toHaveBeenCalledTimes(2);
  });
});
