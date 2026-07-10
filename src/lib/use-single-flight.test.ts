import { act, renderHook } from "@testing-library/react-native";

import { useSingleFlight } from "@/src/lib/use-single-flight";

// Manually resolvable async fn so the test controls when the "in flight" window closes.
function deferred() {
  let resolve!: () => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useSingleFlight", () => {
  it("runs the wrapped fn only once for concurrent calls (rapid double-press)", async () => {
    const gate = deferred();
    const fn = jest.fn(() => gate.promise);
    const { result } = renderHook(() => useSingleFlight(fn));

    await act(async () => {
      // Two synchronous presses before any re-render - the double-click scenario.
      void result.current();
      void result.current();
      gate.resolve();
      await gate.promise;
    });

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("allows another run after the previous one completes", async () => {
    const fn = jest.fn(async () => {});
    const { result } = renderHook(() => useSingleFlight(fn));

    await act(async () => {
      await result.current();
      await result.current();
    });

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("releases the guard when the wrapped fn throws", async () => {
    const fn = jest
      .fn<Promise<void>, []>()
      .mockRejectedValueOnce(new Error("save failed"))
      .mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useSingleFlight(fn));

    await act(async () => {
      await expect(result.current()).rejects.toThrow("save failed");
      await result.current();
    });

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("releases the guard when the wrapped fn throws synchronously (before any await)", async () => {
    const fn = jest
      .fn<void, []>()
      .mockImplementationOnce(() => {
        throw new Error("sync failure");
      })
      .mockImplementationOnce(() => undefined);
    const { result } = renderHook(() => useSingleFlight(fn));

    await act(async () => {
      await expect(result.current()).rejects.toThrow("sync failure");
      await result.current();
    });

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("passes arguments through to the wrapped fn", async () => {
    const fn = jest.fn(async (_a: string, _b: number) => {});
    const { result } = renderHook(() => useSingleFlight(fn));

    await act(async () => {
      await result.current("id-1", 2);
    });

    expect(fn).toHaveBeenCalledWith("id-1", 2);
  });

  it("calls the latest closure, not a stale one from the first render", async () => {
    let seen: number | null = null;
    const { result, rerender } = renderHook(
      ({ value }: { value: number }) =>
        useSingleFlight(async () => {
          seen = value;
        }),
      { initialProps: { value: 1 } },
    );

    rerender({ value: 2 });
    await act(async () => {
      await result.current();
    });

    expect(seen).toBe(2);
  });
});
