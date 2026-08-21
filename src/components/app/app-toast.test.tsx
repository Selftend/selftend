import { act, screen } from "@testing-library/react-native";

import { AppToast } from "@/src/components/app/app-toast";
import { SUCCESS_TOAST_MS, useToastStore } from "@/src/stores/toast-store";
import i18n from "@/src/i18n";
import { renderWithProviders } from "@/test/render-with-providers";

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

beforeEach(() => {
  useToastStore.setState({ visible: null, queue: [] });
});

describe("AppToast - the accessibility label", () => {
  it("a title-only toast is announced as just the title, with no dangling description", () => {
    useToastStore.getState().showToast({ title: "Something did not save", tone: "error" });
    renderWithProviders(<AppToast />);

    // The label is what a screen reader speaks. A title-only toast (the #1064
    // convention for callers with nothing specific to add) must not read
    // "Something did not save. undefined" - or the sentence twice.
    const toast = screen.getByTestId("app-toast");
    expect(toast.props.accessibilityLabel).toBe("Something did not save");
    expect(screen.queryByText("undefined")).toBeNull();
  });

  it("a toast with a description speaks both sentences once each", () => {
    useToastStore.getState().showToast({
      title: "Something went wrong",
      description: "Notifications are blocked.",
      tone: "error",
    });
    renderWithProviders(<AppToast />);

    expect(screen.getByTestId("app-toast").props.accessibilityLabel).toBe(
      "Something went wrong. Notifications are blocked.",
    );
  });
});

describe("AppToast - the dismiss timer", () => {
  let setTimeoutSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    // Installed AFTER the fake timers so the spy wraps the fake rather than the
    // real one - otherwise `advanceTimersByTime` would drive a timer this never
    // sees, and the "no timer for an error" assertion would be vacuous.
    setTimeoutSpy = jest.spyOn(global, "setTimeout");
  });

  afterEach(() => {
    setTimeoutSpy.mockRestore();
    jest.useRealTimers();
  });

  /**
   * Only the toast's own timeouts, identified by their delay. Providers schedule
   * timers of their own, so a bare `getTimerCount()` would be counting somebody
   * else's work.
   */
  const toastTimers = () =>
    setTimeoutSpy.mock.calls.filter(([, delay]) => delay === SUCCESS_TOAST_MS);

  it("clears a success at SUCCESS_TOAST_MS, and not a moment before", () => {
    useToastStore.getState().showToast({ title: "Saved", tone: "success" });
    renderWithProviders(<AppToast />);

    act(() => {
      jest.advanceTimersByTime(SUCCESS_TOAST_MS - 1);
    });
    // Pinned on both sides: "eventually gone" would pass just as happily against
    // a toast that vanished instantly.
    expect(screen.queryByTestId("app-toast")).not.toBeNull();

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(screen.queryByTestId("app-toast")).toBeNull();
    expect(useToastStore.getState().visible).toBeNull();
  });

  // The point of the whole rework: an error waits for the user. Nothing dismisses
  // it on a clock, so no timeout is scheduled for it in the first place.
  it("never schedules a timer for an error, and the error outlives any duration", () => {
    useToastStore.getState().showToast({ title: "Something did not save", tone: "error" });
    renderWithProviders(<AppToast />);

    expect(toastTimers()).toHaveLength(0);

    act(() => {
      jest.advanceTimersByTime(SUCCESS_TOAST_MS * 20);
    });

    expect(screen.queryByTestId("app-toast")).not.toBeNull();
    expect(useToastStore.getState().visible).toMatchObject({ tone: "error" });
  });

  it("gives a promoted toast its own full duration rather than its predecessor's remainder", () => {
    useToastStore.getState().showToast({ title: "First", tone: "success" });
    useToastStore.getState().showToast({ title: "Second", tone: "success" });
    renderWithProviders(<AppToast />);

    act(() => {
      jest.advanceTimersByTime(SUCCESS_TOAST_MS);
    });
    expect(screen.getByText("Second")).toBeTruthy();

    // A timer keyed on anything coarser than the toast's identity - "is a toast
    // showing?" - would not restart here, and "Second" would flash away with
    // whatever was left of "First"'s window.
    act(() => {
      jest.advanceTimersByTime(SUCCESS_TOAST_MS - 1);
    });
    expect(screen.queryByText("Second")).not.toBeNull();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.queryByTestId("app-toast")).toBeNull();
  });

  it("schedules exactly one timer per success, not one per render", () => {
    useToastStore.getState().showToast({ title: "Saved", tone: "success" });
    const { rerender } = renderWithProviders(<AppToast />);

    rerender(<AppToast />);
    rerender(<AppToast />);

    expect(toastTimers()).toHaveLength(1);
  });
});
