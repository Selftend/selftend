import { useRef } from "react";

// Wraps an async press handler so re-entrant calls are ignored while one is in flight.
// `disabled={mutation.isPending}` alone cannot stop a rapid double-click: isPending is
// React state that has not re-rendered between two synchronous presses, so both presses
// fire the handler and each starts its own mutation (duplicate inserts). The ref flips
// synchronously on the first call, and finally releases it on success AND on error so
// the handler stays usable after a failed save.
export function useSingleFlight<Args extends unknown[]>(
  fn: (...args: Args) => Promise<unknown> | unknown,
) {
  const inFlightRef = useRef(false);
  return async (...args: Args) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      await fn(...args);
    } finally {
      inFlightRef.current = false;
    }
  };
}
