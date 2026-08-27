import { act, fireEvent, render, screen, within } from "@testing-library/react-native";
import { Modal, Platform, ScrollView, Text } from "react-native";

import { ENTRANCE_FALLBACK_MS, PressShieldModal } from "@/src/components/app/press-shield-modal";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";
import { useOverlayCountStore } from "@/src/stores/overlay-count-store";
import i18n from "@/src/i18n";
import { setPlatformOS } from "@/test/modal-marker-mock";

/**
 * #1108: on web, a press landing while a react-native-web Modal is still
 * running its 250ms slide-in is silently swallowed — mousedown reaches the
 * button, the button moves before mouseup, and onPress never fires (#1051's
 * diagnosis). PressShieldModal overlays a transparent shield until RNW
 * reports the entrance finished (onShow), so a too-early press hits the
 * shield (and does nothing) instead of half-hitting a moving control.
 *
 * Since #1118 the wrapper also owns the reduce-motion collapse (call sites
 * pass intent via `animation`, never a raw `animationType`) and the #1054
 * web-unmount gate every call site inherits. The static suite
 * (modal-web-unmount.test.ts) enforces the gate LINE in the wrapper's
 * source; the gate tests here enforce its runtime behavior, so weakening it
 * cannot pass as a silent no-op.
 *
 * Since #1252 it also owns the pinned escape row that gives every full-screen
 * modal a visible way out (spec M1/M5 on #1167). The second describe block
 * below covers it.
 *
 * jest cannot exercise the real RNW animation (react-native renders here),
 * so these tests drive the seams the wrapper owns: the onShow contract, the
 * computed animationType, and the visibility gate.
 */

jest.mock("@/src/lib/accessibility", () => ({
  // Spread the real module: the wrapper also reads
  // DEFAULT_INTERACTIVE_HIT_SLOP from here for the escape row, and a mock that
  // withholds it would silently hand the Pressable `undefined`.
  ...jest.requireActual("@/src/lib/accessibility"),
  useReduceMotionEnabled: jest.fn(() => false),
}));

const mockedReduceMotion = jest.mocked(useReduceMotionEnabled);

const ORIGINAL_OS = Platform.OS;

const noop = () => undefined;

const fireModalShow = () => {
  const modal = screen.UNSAFE_getByType(Modal);
  act(() => {
    (modal.props as { onShow: () => void }).onShow();
  });
};

afterEach(() => {
  setPlatformOS(ORIGINAL_OS as "web" | "ios" | "android");
  mockedReduceMotion.mockReturnValue(false);
  jest.useRealTimers();
});

describe("PressShieldModal", () => {
  it("shields presses during the web slide-in and releases on onShow", () => {
    setPlatformOS("web");
    render(
      <PressShieldModal onEscape={noop} visible>
        <Text>content</Text>
      </PressShieldModal>,
    );

    // The slide entrance is the default — call sites state intent, not an
    // animationType ternary (#1118).
    expect(screen.UNSAFE_getByType(Modal).props.animationType).toBe("slide");
    // Content is overlaid, not hidden — the user still sees the panel slide in.
    expect(screen.getByText("content")).toBeTruthy();
    const shield = screen.getByTestId("modal-entrance-shield", { includeHiddenElements: true });
    // "auto" as the prop (not style), and not "box-none": the shield must
    // swallow the press itself, not let it fall through to the moving button.
    expect(shield.props.pointerEvents).toBe("auto");

    fireModalShow();
    expect(
      screen.queryByTestId("modal-entrance-shield", { includeHiddenElements: true }),
    ).toBeNull();
  });

  it("forwards the caller's own onShow", () => {
    setPlatformOS("web");
    const onShow = jest.fn();
    render(
      <PressShieldModal onEscape={noop} onShow={onShow} visible>
        <Text>content</Text>
      </PressShieldModal>,
    );

    fireModalShow();
    expect(onShow).toHaveBeenCalledTimes(1);
  });

  it("collapses the entrance to none under reduce motion, with no shield", () => {
    // The wrapper owns the reduce-motion decision (#1118); the collapsed
    // path — also what the e2e suite runs under — must not gain a shield
    // frame at all.
    mockedReduceMotion.mockReturnValue(true);
    setPlatformOS("web");
    render(
      <PressShieldModal onEscape={noop} visible>
        <Text>content</Text>
      </PressShieldModal>,
    );

    expect(screen.UNSAFE_getByType(Modal).props.animationType).toBe("none");
    expect(screen.getByText("content")).toBeTruthy();
    expect(
      screen.queryByTestId("modal-entrance-shield", { includeHiddenElements: true }),
    ).toBeNull();
  });

  it("passes a fade intent through and never shields it", () => {
    // The manage-emotions desktop-web fork: a fade never moves the press
    // target, so it needs no shield — but it must still collapse to "none"
    // under reduce motion (previous test) rather than bypassing the wrapper.
    setPlatformOS("web");
    render(
      <PressShieldModal onEscape={noop} animation="fade" visible>
        <Text>content</Text>
      </PressShieldModal>,
    );

    expect(screen.UNSAFE_getByType(Modal).props.animationType).toBe("fade");
    expect(
      screen.queryByTestId("modal-entrance-shield", { includeHiddenElements: true }),
    ).toBeNull();
  });

  it("never shields on native", () => {
    // Native touch handling tracks moving views; the swallow mechanism is
    // web-only (#1108), so native keeps full interactivity during the slide.
    setPlatformOS("ios");
    render(
      <PressShieldModal onEscape={noop} visible>
        <Text>content</Text>
      </PressShieldModal>,
    );

    expect(screen.getByText("content")).toBeTruthy();
    expect(
      screen.queryByTestId("modal-entrance-shield", { includeHiddenElements: true }),
    ).toBeNull();
  });

  it("unmounts its Modal on web when closed (the #1054 gate lives here)", () => {
    // Every call site inherits this gate (#1118): a dismissed RNW Modal
    // lingers for its 250ms fade-out as a non-inert focus trap (#1034), so a
    // closed wrapper must render NOTHING on web. If this assertion fails,
    // the #1054 regime is broken for every <PressShieldModal> call site at
    // once.
    setPlatformOS("web");
    render(
      <PressShieldModal onEscape={noop} visible={false}>
        <Text>content</Text>
      </PressShieldModal>,
    );

    expect(screen.UNSAFE_queryByType(Modal)).toBeNull();
    expect(screen.queryByText("content", { includeHiddenElements: true })).toBeNull();
  });

  it("keeps the closed Modal mounted on native, where the exit animation is wanted", () => {
    setPlatformOS("ios");
    render(
      <PressShieldModal onEscape={noop} visible={false}>
        <Text>content</Text>
      </PressShieldModal>,
    );

    expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(false);
  });

  it("re-arms when the modal is closed and reopened", () => {
    setPlatformOS("web");
    const ui = (visible: boolean) => (
      <PressShieldModal onEscape={noop} visible={visible}>
        <Text>content</Text>
      </PressShieldModal>
    );
    const { rerender } = render(ui(true));

    fireModalShow();
    expect(
      screen.queryByTestId("modal-entrance-shield", { includeHiddenElements: true }),
    ).toBeNull();

    rerender(ui(false));
    rerender(ui(true));
    expect(
      screen.getByTestId("modal-entrance-shield", { includeHiddenElements: true }),
    ).toBeTruthy();
  });

  it("reports into the overlay-count registry exactly while visible (#1473)", () => {
    // The wrapper registering once covers every call site, the same way it
    // carries the #1054 gate for all of them — so this seam is where the
    // registry's "a PressShieldModal is on screen" signal is proven. Native
    // platform on purpose: there a closed wrapper stays MOUNTED with
    // `visible={false}`, so this also pins that deactivation alone releases.
    setPlatformOS("ios");
    const ui = (visible: boolean) => (
      <PressShieldModal onEscape={noop} visible={visible}>
        <Text>content</Text>
      </PressShieldModal>
    );
    const { rerender, unmount } = render(ui(true));
    expect(useOverlayCountStore.getState().count).toBe(1);

    rerender(ui(false));
    expect(useOverlayCountStore.getState().count).toBe(0);

    rerender(ui(true));
    expect(useOverlayCountStore.getState().count).toBe(1);

    unmount();
    expect(useOverlayCountStore.getState().count).toBe(0);
  });

  it("registerOverlay={false} keeps a visible modal out of the registry (#1475)", () => {
    // The one sanctioned opt-out, for the update popup: its trigger gates on
    // the count, so the wrapper registering it would oscillate the offer
    // (spec §2 on #1142). Who may pass this is policed statically in
    // modal-overlay-registration.test.ts; this pins that passing it actually
    // works — a wrapper that registered anyway would flash-and-vanish the
    // popup with every test still green.
    setPlatformOS("ios");
    const { unmount } = render(
      <PressShieldModal onEscape={noop} registerOverlay={false} visible>
        <Text>content</Text>
      </PressShieldModal>,
    );
    expect(useOverlayCountStore.getState().count).toBe(0);
    unmount();
    expect(useOverlayCountStore.getState().count).toBe(0);
  });

  it("drops the shield after the fallback window even if onShow never fires", () => {
    // A missed animationend must never leave the modal permanently inert —
    // that failure mode would be far worse than the swallowed tap it prevents.
    jest.useFakeTimers();
    setPlatformOS("web");
    render(
      <PressShieldModal onEscape={noop} visible>
        <Text>content</Text>
      </PressShieldModal>,
    );

    expect(
      screen.getByTestId("modal-entrance-shield", { includeHiddenElements: true }),
    ).toBeTruthy();
    act(() => {
      jest.advanceTimersByTime(ENTRANCE_FALLBACK_MS);
    });
    expect(
      screen.queryByTestId("modal-entrance-shield", { includeHiddenElements: true }),
    ).toBeNull();
  });
});

/**
 * #1252 (spec clauses M1, M5, G1 on #1167): a full-screen modal covers
 * `InvisibleHeader` entirely, so it is the app's genuine no-way-out set. The
 * wrapper pins the Escape itself rather than each modal remembering one —
 * which is what turns a forgotten Escape into a type error (G1) instead of
 * something a test has to catch.
 */
describe("PressShieldModal's pinned escape row", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  // The row is unconditional, not "rendered when useful". A conditional is
  // precisely what the enforcement gate (#1263) cannot see through, so the
  // table below pins every axis the wrapper branches on — platform, entrance,
  // reduce motion — against the one thing that must not vary.
  it.each([
    ["web, sliding in", "web" as const, false],
    ["web, entrance finished", "web" as const, false],
    ["native", "ios" as const, false],
    ["under reduce motion", "web" as const, true],
  ])("renders exactly one Escape (%s)", (_label, os, reduceMotion) => {
    setPlatformOS(os);
    mockedReduceMotion.mockReturnValue(reduceMotion);
    render(
      <PressShieldModal onEscape={noop} visible>
        <Text>content</Text>
      </PressShieldModal>,
    );

    expect(screen.getAllByTestId("modal-escape")).toHaveLength(1);
  });

  it("names the Escape with a bare 'Close'", () => {
    // #1239: not "Close {title}". The dialog already announces its title on
    // entry through its own accessibilityLabel, so repeating it on the way out
    // is redundancy — and threading a title in here would be the first crack
    // in M5's "the row holds only the Escape".
    setPlatformOS("web");
    render(
      <PressShieldModal accessibilityLabel="Getting started with CBT" onEscape={noop} visible>
        <Text>content</Text>
      </PressShieldModal>,
    );

    expect(screen.getByLabelText("Close")).toBeTruthy();
    expect(screen.queryByLabelText("Close Getting started with CBT")).toBeNull();
  });

  it("wears the word instead of the X when the call site passes escapeLabel (M2)", () => {
    // #1258: a bare X when closing is free, a word when closing decides
    // something that sticks. The word replaces the glyph and IS the
    // accessible name — announcing "Close" on a press that persists a
    // decision would be the same disguise, one sense over.
    setPlatformOS("web");
    const onEscape = jest.fn();
    render(
      <PressShieldModal escapeLabel="Skip for now" onEscape={onEscape} visible>
        <Text>content</Text>
      </PressShieldModal>,
    );

    const escape = screen.getByTestId("modal-escape");
    expect(within(escape).getByText("Skip for now")).toBeTruthy();
    expect(escape.props.accessibilityLabel).toBe("Skip for now");
    expect(screen.queryByLabelText("Close")).toBeNull();

    fireEvent.press(escape);
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("holds only the Escape — no title of its own", () => {
    // M5: every guide renders its own title inside the scroll, so a pinned
    // title would show it twice.
    setPlatformOS("web");
    render(
      <PressShieldModal accessibilityLabel="Getting started with CBT" onEscape={noop} visible>
        <Text>content</Text>
      </PressShieldModal>,
    );

    expect(screen.queryByText("Getting started with CBT")).toBeNull();
  });

  it("fires onEscape, and leaves onRequestClose alone", () => {
    // M4 is a hard constraint of this change: the visible affordance is what
    // the rule governs, and the system gesture (Android back, the web Escape
    // key — on the wizard, a step to the PREVIOUS panel) is untouched. So the
    // two must not be wired to each other.
    setPlatformOS("web");
    const onEscape = jest.fn();
    const onRequestClose = jest.fn();
    render(
      <PressShieldModal onEscape={onEscape} onRequestClose={onRequestClose} visible>
        <Text>content</Text>
      </PressShieldModal>,
    );

    fireEvent.press(screen.getByTestId("modal-escape"));
    expect(onEscape).toHaveBeenCalledTimes(1);
    expect(onRequestClose).not.toHaveBeenCalled();
    expect(screen.UNSAFE_getByType(Modal).props.onRequestClose).toBe(onRequestClose);
  });

  it("keeps the Escape OUTSIDE the scroller", () => {
    // ☠️ The whole fix. `HelpSheet`'s X — the precedent named when this work
    // was charted — lived inside its own ScrollView and scrolled away on the
    // first swipe, so on a long guide it was visible only at scroll position
    // zero (#1257 removed it). If this assertion ever fails, the modal can
    // once again be impossible to close one gesture in.
    setPlatformOS("web");
    render(
      <PressShieldModal onEscape={noop} visible>
        <ScrollView>
          <Text>a long guide</Text>
        </ScrollView>
      </PressShieldModal>,
    );

    const scroller = screen.UNSAFE_getByType(ScrollView);
    expect(within(scroller).queryByTestId("modal-escape")).toBeNull();
    expect(within(scroller).getByText("a long guide")).toBeTruthy();
    expect(screen.getByTestId("modal-escape")).toBeTruthy();
  });

  it("renders no row for a sheet, which pins its own Escape inside its panel", () => {
    // A bottom sheet, a centred card, a native pageSheet: the screen stays
    // visible behind it, so a 48px bg-background row would be an opaque bar
    // hanging over the backdrop. Those four call sites say `surface="sheet"`
    // and keep their own X (#1257 swept them).
    setPlatformOS("web");
    render(
      <PressShieldModal surface="sheet" transparent visible>
        <Text>content</Text>
      </PressShieldModal>,
    );

    expect(screen.queryByTestId("modal-escape")).toBeNull();
    expect(screen.getByText("content")).toBeTruthy();
  });
});
