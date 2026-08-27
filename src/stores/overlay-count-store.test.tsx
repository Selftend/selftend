/**
 * Tests for the overlay-count store (#1473, spec §2 on #1142).
 *
 * The contract:
 *   - acquire() raises the count, its release lowers it, and a release is
 *     idempotent per handle — a double-run cleanup must not drive the count
 *     negative and cancel out someone else's live registration
 *   - useOverlayRegistration(active) holds a registration exactly while
 *     `active` is true, and drops it on unmount — the web path closes modals
 *     by unmounting (the #1054 gate), so unmount IS a close there
 */

import { act, renderHook } from "@testing-library/react-native";

import { useOverlayCountStore, useOverlayRegistration } from "@/src/stores/overlay-count-store";

const count = () => useOverlayCountStore.getState().count;

beforeEach(() => {
  useOverlayCountStore.setState({ count: 0 });
});

describe("useOverlayCountStore.acquire", () => {
  it("raises the count and the release lowers it", () => {
    const release = useOverlayCountStore.getState().acquire();
    expect(count()).toBe(1);

    release();
    expect(count()).toBe(0);
  });

  it("stacks independent registrations", () => {
    const first = useOverlayCountStore.getState().acquire();
    const second = useOverlayCountStore.getState().acquire();
    expect(count()).toBe(2);

    first();
    expect(count()).toBe(1);

    second();
    expect(count()).toBe(0);
  });

  it("a release that runs twice lowers the count only once", () => {
    const doomed = useOverlayCountStore.getState().acquire();
    const survivor = useOverlayCountStore.getState().acquire();

    doomed();
    doomed();

    // The survivor's registration must still be visible: a non-idempotent
    // release would report "nothing on screen" while a modal is up.
    expect(count()).toBe(1);
    survivor();
    expect(count()).toBe(0);
  });
});

describe("useOverlayRegistration", () => {
  it("registers while active and releases on unmount", () => {
    const { unmount } = renderHook(() => useOverlayRegistration(true));
    expect(count()).toBe(1);

    unmount();
    expect(count()).toBe(0);
  });

  it("never registers while inactive", () => {
    const { unmount } = renderHook(() => useOverlayRegistration(false));
    expect(count()).toBe(0);

    unmount();
    expect(count()).toBe(0);
  });

  it("follows the active flag across toggles", () => {
    const { rerender } = renderHook(
      ({ active }: { active: boolean }) => useOverlayRegistration(active),
      { initialProps: { active: false } },
    );
    expect(count()).toBe(0);

    act(() => rerender({ active: true }));
    expect(count()).toBe(1);

    // The native path closes modals with `visible={false}` while staying
    // mounted, so deactivation alone must release.
    act(() => rerender({ active: false }));
    expect(count()).toBe(0);

    act(() => rerender({ active: true }));
    expect(count()).toBe(1);
  });

  it("two active registrations never share a handle", () => {
    const first = renderHook(() => useOverlayRegistration(true));
    const second = renderHook(() => useOverlayRegistration(true));
    expect(count()).toBe(2);

    first.unmount();
    expect(count()).toBe(1);

    second.unmount();
    expect(count()).toBe(0);
  });
});
