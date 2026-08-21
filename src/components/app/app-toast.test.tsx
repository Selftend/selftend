import { act, fireEvent, screen } from "@testing-library/react-native";
import { Platform, View } from "react-native";

import { Icon } from "@/src/components/react-native-reusables/icon";

import { AppToast } from "@/src/components/app/app-toast";
import { SUCCESS_TOAST_MS, useToastStore } from "@/src/stores/toast-store";
import { announceMessage } from "@/src/lib/accessibility";
import i18n from "@/src/i18n";
import { renderWithProviders } from "@/test/render-with-providers";
import { setPlatformOS } from "@/test/modal-marker-mock";

// ☠️ Mocked at the MODULE, never through jsdom's `matchMedia`: the hook's web
// branch reads `matchMedia` through `useSyncExternalStore`, and jsdom's stub
// pins the result to `false` - so a matchMedia-based test of the reduce-motion
// branch can only ever prove the `false` half. Every existing consumer test
// mocks the module for the same reason.
let mockReduceMotion = false;
jest.mock("@/src/lib/accessibility", () => ({
  ...jest.requireActual("@/src/lib/accessibility"),
  useReduceMotionEnabled: () => mockReduceMotion,
  announceMessage: jest.fn(),
}));

// Captures what AppToast HANDS the wrapper. The wrapper's own reduce-motion
// stripping is its business and is tested next to it; what this file owns is
// that the toast asks for a 200ms fade and nothing else.
let mockEntering: { getDuration?: () => number } | undefined;
jest.mock("@/src/components/react-native-reusables/native-only-animated-view", () => ({
  NativeOnlyAnimatedView: ({
    children,
    entering,
  }: {
    children?: React.ReactNode;
    entering?: { getDuration?: () => number };
  }) => {
    mockEntering = entering;
    return children;
  },
}));

const mockAnnounce = announceMessage as jest.MockedFunction<typeof announceMessage>;
const ORIGINAL_OS = Platform.OS;

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

afterEach(() => {
  // `setPlatformOS` mutates the shared Platform object, so a test that moved it
  // would otherwise decide the platform for every test after it in the file.
  setPlatformOS(ORIGINAL_OS as "web" | "ios" | "android");
  mockReduceMotion = false;
  mockEntering = undefined;
  jest.clearAllMocks();
});

beforeEach(() => {
  // The real teardown, not a hand-written `setState`: the slot is two fields now,
  // and a reset that spelled out only `visible: null` would leave a queued toast
  // to surface in the next test - and an error toast, which no longer expires on
  // its own, to sit there for the rest of the file.
  useToastStore.getState().clearToasts();
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

describe("AppToast - the tone accent", () => {
  const cardClasses = () => String(screen.getByTestId("app-toast").props.className);

  /** The 4px rule down the left inset - the only `w-1` box in the card. */
  const accentBar = () =>
    screen.UNSAFE_getAllByType(View).find((node) => {
      const className = String(node.props.className ?? "");
      return className.includes("w-1 ") || className.endsWith("w-1");
    });

  // Read off `Icon`, not off MaterialIcons: `Icon`'s cssInterop consumes
  // className and hands the glyph resolved `color`/`size` props, so the class
  // is gone by the time it reaches the family component.
  const iconNamed = (name: string) =>
    screen.UNSAFE_getAllByType(Icon).find((icon) => icon.props.name === name);

  it.each([
    ["success", "check-circle", "bg-primary", "text-primary-ink"],
    ["error", "error", "bg-destructive", "text-destructive"],
  ] as const)("paints a %s with its own glyph and bar", (tone, glyph, bar, ink) => {
    useToastStore.getState().showToast({ title: "Message", tone });
    renderWithProviders(<AppToast />);

    expect(iconNamed(glyph)).toBeDefined();
    expect(String(accentBar()?.props.className)).toContain(bar);
    // ☠️ The ink asymmetry is deliberate: there is no `--destructive-ink`,
    // because contrast.ts already gates raw `--destructive` at AA on card while
    // raw `--primary` is not - which is why `--primary-ink` exists at all.
    expect(String(iconNamed(glyph)?.props.className)).toContain(ink);
  });

  it("shows one tone glyph and one close glyph, never the other tone's", () => {
    useToastStore.getState().showToast({ title: "Saved", tone: "success" });
    renderWithProviders(<AppToast />);

    expect(screen.UNSAFE_getAllByType(Icon).map((icon) => icon.props.name)).toEqual([
      "check-circle",
      "close",
    ]);
  });

  it("keeps the bar 4px and inset on all three sides", () => {
    useToastStore.getState().showToast({ title: "Saved", tone: "success" });
    renderWithProviders(<AppToast />);

    const className = String(accentBar()?.props.className);
    expect(className).toContain("w-1");
    expect(className).toContain("rounded-full");
    // 12px from top, bottom and left - a rule, not a full-bleed edge.
    for (const inset of ["top-3", "bottom-3", "left-3"]) {
      expect(className).toContain(inset);
    }
  });

  // #1238 already had to delete a `border-0` here once: the toast was the app's
  // only borderless floating surface. Nothing pinned it afterwards, so it could
  // have gone straight back.
  it("wears the default card border, neutral and not tone-coloured", () => {
    useToastStore.getState().showToast({ title: "Something did not save", tone: "error" });
    renderWithProviders(<AppToast />);

    expect(cardClasses()).toContain("border-border");
    expect(cardClasses()).not.toContain("border-0");
    // A tone ring would state severity a third time, after the bar and the icon.
    expect(cardClasses()).not.toContain("border-destructive");
    expect(cardClasses()).not.toContain("border-primary");
  });
});

describe("AppToast - the dismiss button", () => {
  const dismiss = () => screen.getByLabelText("Dismiss message");

  it("is the card's only dismissal: the body carries no press handler at all", () => {
    useToastStore.getState().showToast({ title: "Saved", tone: "success" });
    renderWithProviders(<AppToast />);

    // The body used to be a Pressable wrapping the whole card, which meant it
    // also swallowed any tap LANDING on it - including taps aimed at the header
    // underneath. The X is the dismissal now; the body is inert.
    expect(screen.getByTestId("app-toast").props.onPress).toBeUndefined();
    expect(dismiss()).toBeTruthy();
  });

  it("promotes the next queued toast through the same path the timer uses", () => {
    useToastStore.getState().showToast({ title: "First", tone: "success" });
    useToastStore.getState().showToast({ title: "Second", tone: "success" });
    renderWithProviders(<AppToast />);

    fireEvent.press(dismiss());

    expect(screen.getByText("Second")).toBeTruthy();
    expect(useToastStore.getState().visible).toMatchObject({ title: "Second" });
  });

  it("does not clear the queue - dismissing one toast is not dismissing all of them", () => {
    useToastStore.getState().showToast({ title: "First", tone: "success" });
    useToastStore.getState().showToast({ title: "Second", tone: "success" });
    useToastStore.getState().showToast({ title: "Third", tone: "success" });
    renderWithProviders(<AppToast />);

    fireEvent.press(dismiss());

    expect(useToastStore.getState().queue.map((toast) => toast.title)).toEqual(["Third"]);
  });

  it("frees a sticky error, which nothing else can", () => {
    useToastStore.getState().showToast({ title: "Something did not save", tone: "error" });
    renderWithProviders(<AppToast />);

    fireEvent.press(dismiss());

    expect(useToastStore.getState().visible).toBeNull();
  });

  // ☠️ On RNW `focusable` IS `tabIndex` (#1049). AppToast passes no `focusable`
  // of its own, so Pressable derives `true` from the press handler and the X
  // stays in the tab order - which is what makes a sticky error escapable by
  // keyboard. That it is never BOUND to a state variable is a property of the
  // source, not of one render, and is pinned in
  // `test/toast-source-invariants.test.ts`.
  it("is reachable by keyboard", () => {
    useToastStore.getState().showToast({ title: "Saved", tone: "success" });
    renderWithProviders(<AppToast />);

    expect(dismiss().props.focusable).toBe(true);
  });
});

describe("AppToast - what a screen reader is handed", () => {
  // ☠️ On iOS an accessibility element HIDES its descendants, so a card that was
  // both labelled and `accessible` would take the X away from VoiceOver - on the
  // one platform with no test layer to catch it.
  it("labels the card without making it an accessibility element", () => {
    useToastStore.getState().showToast({ title: "Saved", tone: "success" });
    renderWithProviders(<AppToast />);

    const card = screen.getByTestId("app-toast");
    expect(card.props.accessibilityLabel).toBe("Saved");
    expect(card.props.accessible).toBeUndefined();
  });

  it("interrupts for an error and waits its turn for a success", () => {
    useToastStore.getState().showToast({ title: "Something did not save", tone: "error" });
    const { rerender } = renderWithProviders(<AppToast />);

    expect(screen.getByTestId("app-toast").props.accessibilityLiveRegion).toBe("assertive");

    act(() => {
      useToastStore.getState().clearToasts();
      useToastStore.getState().showToast({ title: "Saved", tone: "success" });
    });
    rerender(<AppToast />);

    expect(screen.getByTestId("app-toast").props.accessibilityLiveRegion).toBe("polite");
  });

  // `accessibilityLiveRegion` is Android-only in RN core, so without this the
  // toast is announced by NOTHING on iOS.
  it("announces on iOS, where the live region does not exist", () => {
    setPlatformOS("ios");
    useToastStore.getState().showToast({
      title: "Something went wrong",
      description: "Notifications are blocked.",
      tone: "error",
    });
    renderWithProviders(<AppToast />);

    expect(mockAnnounce).toHaveBeenCalledWith("Something went wrong. Notifications are blocked.");
  });

  it("re-announces when the next toast takes the slot", () => {
    setPlatformOS("ios");
    useToastStore.getState().showToast({ title: "First", tone: "success" });
    const { rerender } = renderWithProviders(<AppToast />);
    expect(mockAnnounce).toHaveBeenCalledTimes(1);

    act(() => {
      useToastStore.getState().dismissToast();
      useToastStore.getState().showToast({ title: "Second", tone: "success" });
    });
    rerender(<AppToast />);

    expect(mockAnnounce).toHaveBeenCalledTimes(2);
    expect(mockAnnounce).toHaveBeenLastCalledWith("Second");
  });

  // Android has BOTH mechanisms, so announcing there would say it twice.
  it.each(["android", "web"] as const)("stays quiet on %s", (os) => {
    setPlatformOS(os);
    useToastStore.getState().showToast({ title: "Saved", tone: "success" });
    renderWithProviders(<AppToast />);

    expect(mockAnnounce).not.toHaveBeenCalled();
  });
});

describe("AppToast - the fade", () => {
  const cardClasses = () => String(screen.getByTestId("app-toast").props.className);

  it("fades in on web", () => {
    setPlatformOS("web");
    useToastStore.getState().showToast({ title: "Saved", tone: "success" });
    renderWithProviders(<AppToast />);

    // `duration-200` is pinned, not incidental: animate-in's own default is
    // 150ms, so leaving it off would let web and native diverge by 2x.
    expect(cardClasses()).toContain("animate-in fade-in-0 duration-200");
  });

  it("omits the class entirely when the user asked for less motion", () => {
    setPlatformOS("web");
    mockReduceMotion = true;
    useToastStore.getState().showToast({ title: "Saved", tone: "success" });
    renderWithProviders(<AppToast />);

    expect(cardClasses()).not.toContain("animate-in");
    expect(cardClasses()).not.toContain("fade-in-0");
  });

  it("hands native an entering animation, and leaks no web class into it", () => {
    useToastStore.getState().showToast({ title: "Saved", tone: "success" });
    renderWithProviders(<AppToast />);

    // ☠️ Only that an animation is HANDED OVER, never its duration. `test/setup.js`
    // swaps reanimated for `react-native-reanimated/mock`, whose builder throws
    // its argument away (`duration() { return this }`) and answers `getDuration()`
    // with a hardcoded 300. The 200 is therefore unobservable from jest on native
    // - it is pinned in `test/toast-source-invariants.test.ts` instead.
    expect(mockEntering).toBeDefined();
    // The web fade must not follow it off web, where the class means nothing.
    expect(cardClasses()).not.toContain("animate-in");
  });
});
