import { act, fireEvent, screen, within } from "@testing-library/react-native";
import { Dimensions, Platform, StyleSheet, Text, View } from "react-native";
import { FullWindowOverlay as RNFullWindowOverlay } from "react-native-screens";

import { Icon } from "@/src/components/react-native-reusables/icon";

import { AppToast, TOAST_GUTTER, toastBottom } from "@/src/components/app/app-toast";
import { INVISIBLE_HEADER_HEIGHT } from "@/src/components/app/invisible-header";
import { INSET_LAYER, useLayeredInsetStore } from "@/src/stores/layered-inset-store";
import { SUCCESS_TOAST_MS, useToastStore } from "@/src/stores/toast-store";
import { announceMessage } from "@/src/lib/accessibility";
import i18n from "@/src/i18n";
import { lifecycleLog } from "@/test/lifecycle-recorder";
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

// ☠️ WRAPS the real overlay rather than replacing it, so what the assertions read
// is react-native-screens' own host output. Verified (#1338): the real overlay
// renders SILENTLY under react-test-renderer when `Platform.OS` is "ios", which
// jest-expo's `defaultPlatform` makes the default here. Its "only valid on iOS
// devices" warning fires only when a test moves the platform OFF ios while a
// MODULE-LOAD alias has already frozen the real component in - that is
// `popover.tsx`'s shape, and the reason `user-menu.test.tsx` keeps a stand-in of
// its own. This file needs no stand-in: `ToastOverlay` re-reads the platform every
// render, so the android and web cases below never reach the overlay at all.
jest.mock("react-native-screens", () => {
  const actual = jest.requireActual("react-native-screens");
  const { recordLifecycleOf } = require("@/test/lifecycle-recorder");

  return { ...actual, FullWindowOverlay: recordLifecycleOf(actual.FullWindowOverlay) };
});

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
  // The inset ladder is a module-scope store too, so an edge published by one
  // position test would decide where the toast sits for every test after it.
  useLayeredInsetStore.setState({ edges: {} });
  // Cleared HERE and not in `afterEach`: RNTL's auto-cleanup unmounts the tree in
  // an afterEach of its own, and an ordering assumption between the two would
  // decide whether a trailing "unmount" leaked into the next test's expectations.
  lifecycleLog.length = 0;
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

describe("AppToast - riding above an iOS modal", () => {
  /**
   * The overlay's HOST node, by its native name. Read off the host rather than off
   * the composite so the assertion is on what react-native-screens actually hands
   * the platform - `unstable_accessibilityContainerViewIsModal` reaches native as
   * `accessibilityContainerViewIsModal`, and a wrapper that dropped the prop on
   * the way through would still satisfy a composite-level check.
   */
  const overlays = () =>
    // The cast is the honest part: a host component's `type` IS its native name
    // at runtime, but `ReactTestInstance["type"]` is typed `ElementType`, which
    // does not model that - a bare `===` is a compile error, not a loose match.
    screen.UNSAFE_root.findAll((node) => (node.type as unknown) === "RNSFullWindowOverlay");

  it("wraps the card in a full-window overlay on iOS", () => {
    setPlatformOS("ios");
    useToastStore.getState().showToast({ title: "Saved", tone: "success" });
    renderWithProviders(<AppToast />);

    expect(overlays()).toHaveLength(1);
    // The card is INSIDE it, not a sibling of it - the whole point is that the
    // toast rides in the overlay's own UIWindow layer.
    expect(within(overlays()[0]).getByTestId("app-toast")).toBeTruthy();
  });

  // ☠️☠️ Why this matters is stated once, on `ToastOverlay` in `app-toast.tsx`;
  // the short version is that the native default hides the whole app from
  // VoiceOver. Asserted on an ERROR because that is the toast that never expires
  // on its own, which is what turns the bug from a flicker into a lockout.
  it("declares itself NOT a modal accessibility container", () => {
    setPlatformOS("ios");
    useToastStore.getState().showToast({ title: "Something did not save", tone: "error" });
    renderWithProviders(<AppToast />);

    // `toBe(false)`, never `toBeFalsy()`: `undefined` is the failure mode here,
    // and it is falsy.
    expect(overlays()[0].props.accessibilityContainerViewIsModal).toBe(false);
  });

  // `FullWindowOverlay` has no Android or web implementation. `ToastOverlay` is a
  // component precisely so this branch is re-read every render - popover's
  // module-load alias would have frozen whichever platform loaded the file first.
  it.each(["android", "web"] as const)("adds no overlay on %s, and still shows the toast", (os) => {
    setPlatformOS(os);
    useToastStore.getState().showToast({ title: "Saved", tone: "success" });
    renderWithProviders(<AppToast />);

    expect(overlays()).toHaveLength(0);
    expect(screen.getByTestId("app-toast")).toBeTruthy();
  });

  it("remounts the overlay when the next toast is promoted into the slot", () => {
    setPlatformOS("ios");
    useToastStore.getState().showToast({ title: "First", tone: "success" });
    useToastStore.getState().showToast({ title: "Second", tone: "success" });
    const { rerender } = renderWithProviders(<AppToast />);

    expect(lifecycleLog).toEqual(["mount"]);

    act(() => {
      useToastStore.getState().dismissToast();
    });
    rerender(<AppToast />);

    expect(screen.getByText("Second")).toBeTruthy();
    // ☠️☠️ Promotion swaps `visible` STRAIGHT from the dismissed toast to
    // `queue[0]`, so the host's `!toast` guard never fires and nothing would
    // otherwise unmount. Only `key={toast.id}` makes the overlay re-add its
    // container to the UIWindow - on top of whatever modal is presented by now.
    expect(lifecycleLog).toEqual(["mount", "unmount", "mount"]);
  });

  /**
   * Calibration for the recorder above, and nothing more - read the claim
   * narrowly. It is NOT evidence about `AppToast`: what pins the host's own
   * dependence on the key is the test above, which fails outright if the key is
   * removed or moved down onto the Card (verified by mutation).
   *
   * What this adds is the other half of that instrument's reading: that
   * ["mount", "unmount", "mount"] is a result the recorder can distinguish from
   * ["mount"] in the first place. Promotion changes only this overlay's children,
   * so React reconciles one element in place and the native container keeps the
   * UIWindow position it took when the FIRST toast appeared. Without it, "the key
   * remounts it" reads the same as "React remounts things".
   */
  function UnkeyedOverlayControl() {
    const toast = useToastStore((state) => state.visible);

    if (!toast) {
      return null;
    }

    return (
      <RNFullWindowOverlay unstable_accessibilityContainerViewIsModal={false}>
        <Text>{toast.title}</Text>
      </RNFullWindowOverlay>
    );
  }

  it("remounts nothing at all once the key is taken away", () => {
    setPlatformOS("ios");
    useToastStore.getState().showToast({ title: "First", tone: "success" });
    useToastStore.getState().showToast({ title: "Second", tone: "success" });
    const { rerender } = renderWithProviders(<UnkeyedOverlayControl />);

    expect(lifecycleLog).toEqual(["mount"]);

    act(() => {
      useToastStore.getState().dismissToast();
    });
    rerender(<UnkeyedOverlayControl />);

    // The promotion definitely happened - it just did not move the container.
    expect(screen.getByText("Second")).toBeTruthy();
    expect(lifecycleLog).toEqual(["mount"]);
  });
});

// A notched phone, so "the inset was applied" is distinguishable from "no inset
// at all" - the one shape a zeroed default cannot tell apart.
const PHONE = {
  windowHeight: 800,
  safeAreaTop: 59,
  safeAreaBottom: 34,
  insetBelow: 0,
  toastHeight: 80,
};

/** Where the card's TOP edge lands, which is what the clamp is actually about. */
function topEdge(args: Parameters<typeof toastBottom>[0]): number {
  return args.windowHeight - toastBottom(args) - args.toastHeight;
}

describe("toastBottom - the ladder arithmetic", () => {
  it("rests on the home-indicator inset plus one rung when nothing is down there", () => {
    // The same rung RoutineFab and ReminderPromptCard stand on, spelled the same
    // way - a toast that invented its own gutter would read as misaligned next
    // to furniture that is, in fact, correctly aligned.
    expect(toastBottom(PHONE)).toBe(34 + TOAST_GUTTER);
    expect(TOAST_GUTTER).toBe(16);
  });

  it("steps over the furniture: the max of layers 0-2, plus the same rung", () => {
    // 140 stands in for whatever won the max below - a visible banner strip, the
    // cookie banner, a form footer, the FAB. The toast never learns which.
    expect(toastBottom({ ...PHONE, insetBelow: 140 })).toBe(140 + TOAST_GUTTER);
  });

  it("ignores an inset that sits below the safe area rather than dropping onto it", () => {
    // A publisher can report an edge INSIDE the home-indicator inset (a strip
    // with no bottom padding of its own). Taking it literally would move the
    // toast DOWN, under the indicator, which is the one direction the base case
    // exists to prevent.
    expect(toastBottom({ ...PHONE, insetBelow: 10 })).toBe(34 + TOAST_GUTTER);
  });

  it("stops climbing at the invisible header instead of sliding under it", () => {
    // 600 is the shape of a soft keyboard over a lifted form footer: measured,
    // legitimate, and most of the screen high. Unclamped the toast would want
    // 616 and its top would land 104px above the header's bottom edge.
    const clamped = { ...PHONE, insetBelow: 600 };

    expect(toastBottom(clamped)).toBeLessThan(600 + TOAST_GUTTER);
    // The top edge comes to rest exactly on the header's bottom edge - #660's
    // line, inherited rather than re-invented as a fraction of the screen.
    expect(topEdge(clamped)).toBe(PHONE.safeAreaTop + INVISIBLE_HEADER_HEIGHT);
  });

  it("keeps clamping as the furniture keeps rising, rather than escaping upward", () => {
    // Past the clamp the answer stops MOVING. Anything still monotonic in
    // `insetBelow` here would be the climbs-forever bug wearing a ceiling.
    const high = toastBottom({ ...PHONE, insetBelow: 600 });

    expect(toastBottom({ ...PHONE, insetBelow: 5_000 })).toBe(high);
    expect(toastBottom({ ...PHONE, insetBelow: 50_000 })).toBe(high);
  });

  it("accepts overlapping the obstruction when the card is too tall to clear it", () => {
    // A three-line error toast under a full keyboard: no position clears both
    // the furniture and the header. The toast takes the base case and overlaps
    // what is beneath it - readable and dismissible, which a toast pushed off
    // the bottom of the window would not be.
    const tall = { ...PHONE, insetBelow: 600, toastHeight: 700 };

    expect(toastBottom(tall)).toBe(PHONE.safeAreaBottom + TOAST_GUTTER);
    expect(toastBottom(tall)).toBeGreaterThan(0);
  });

  it("does not clamp before the card has been measured", () => {
    // Height 0 is the first frame. The ceiling is at its most generous there, so
    // the toast takes the offset it asked for and settles once the measurement
    // lands - never the other way round, which would be a visible drop.
    expect(toastBottom({ ...PHONE, insetBelow: 300, toastHeight: 0 })).toBe(300 + TOAST_GUTTER);
  });
});

describe("AppToast - where it sits", () => {
  function hostBottom(): number {
    return StyleSheet.flatten(screen.getByTestId("app-toast-host").props.style).bottom as number;
  }

  it("anchors to the bottom, and to nothing at the top", () => {
    useToastStore.getState().showToast({ title: "Saved", tone: "success" });
    renderWithProviders(<AppToast />);

    const style = StyleSheet.flatten(screen.getByTestId("app-toast-host").props.style);
    // #660 ruled the top off-limits; the toast has to hold no opinion about it
    // at all, not merely a smaller one.
    expect(style.top).toBeUndefined();
    // jest's insets are all zero, so this is the base case in full.
    expect(style.bottom).toBe(TOAST_GUTTER);
  });

  it("rides above furniture the moment a lower layer publishes, and settles back after", () => {
    useToastStore.getState().showToast({ title: "Saved", tone: "success" });
    renderWithProviders(<AppToast />);

    // A banner strip appears under a visible toast. Live tracking is the point:
    // the anchor moves under the card that is already on screen.
    act(() => useLayeredInsetStore.getState().publishInset("strip", INSET_LAYER.strip, 140));
    expect(hostBottom()).toBe(140 + TOAST_GUTTER);

    act(() => useLayeredInsetStore.getState().publishInset("fab", INSET_LAYER.floater, 220));
    expect(hostBottom()).toBe(220 + TOAST_GUTTER);

    act(() => useLayeredInsetStore.getState().clearInset("fab"));
    act(() => useLayeredInsetStore.getState().clearInset("strip"));
    expect(hostBottom()).toBe(TOAST_GUTTER);
  });

  it("cannot see its own layer, so it can never climb away from itself", () => {
    useToastStore.getState().showToast({ title: "Saved", tone: "success" });
    renderWithProviders(<AppToast />);

    // The whole reason the ladder is layered (#1154): a flat max would let the
    // toast consume its own published edge and rise forever.
    act(() => useLayeredInsetStore.getState().publishInset("toast", INSET_LAYER.toast, 400));

    expect(hostBottom()).toBe(TOAST_GUTTER);
  });

  it("clamps a live inset at the header instead of following it up the screen", () => {
    useToastStore.getState().showToast({ title: "Saved", tone: "success" });
    renderWithProviders(<AppToast />);

    const windowHeight = Dimensions.get("window").height;
    act(() =>
      useLayeredInsetStore.getState().publishInset("keyboard", INSET_LAYER.keyboard, 9_999),
    );

    // Height 0 here (nothing measures under jest), so the ceiling is the full
    // drop from the header's bottom edge to the bottom of the window.
    expect(hostBottom()).toBe(windowHeight - INVISIBLE_HEADER_HEIGHT);
  });

  it("carries the height measurement on its first frame, not on a later one", () => {
    // ☠️ jest's `View` is a class mock with no measure methods, so no rendered
    // publisher can ever be made to measure here - the #1339 lesson. What IS
    // provable is the property that decides the whole thing on web: RNW's
    // `onLayout` is a MOUNT-TIME decision, so a handler attached on a later
    // render is never heard at all and the card's height stays 0 forever.
    useToastStore.getState().showToast({ title: "Saved", tone: "success" });
    renderWithProviders(<AppToast />);

    expect(typeof screen.getByTestId("app-toast-host").props.onLayout).toBe("function");
  });

  it("lets the measured height tighten the clamp, so a tall card stops lower", () => {
    useToastStore.getState().showToast({ title: "Saved", tone: "success" });
    renderWithProviders(<AppToast />);

    const windowHeight = Dimensions.get("window").height;
    act(() =>
      useLayeredInsetStore.getState().publishInset("keyboard", INSET_LAYER.keyboard, 9_999),
    );
    // Driven through the handler rather than through a rendered layout pass:
    // jest never fires one, and its `View` cannot measure. The contract is what
    // is under test - a height arrives, and the ceiling drops by exactly it.
    fireEvent(screen.getByTestId("app-toast-host"), "layout", {
      nativeEvent: { layout: { height: 700 } },
    });

    expect(hostBottom()).toBe(windowHeight - INVISIBLE_HEADER_HEIGHT - 700);
  });
});
