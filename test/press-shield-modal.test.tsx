import { act, render, screen } from "@testing-library/react-native";
import { Modal, Platform, Text } from "react-native";

import { ENTRANCE_FALLBACK_MS, PressShieldModal } from "@/src/components/app/press-shield-modal";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";
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
 * jest cannot exercise the real RNW animation (react-native renders here),
 * so these tests drive the seams the wrapper owns: the onShow contract, the
 * computed animationType, and the visibility gate.
 */

jest.mock("@/src/lib/accessibility", () => ({
  useReduceMotionEnabled: jest.fn(() => false),
}));

const mockedReduceMotion = jest.mocked(useReduceMotionEnabled);

const ORIGINAL_OS = Platform.OS;

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
      <PressShieldModal visible>
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
      <PressShieldModal onShow={onShow} visible>
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
      <PressShieldModal visible>
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
      <PressShieldModal animation="fade" visible>
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
      <PressShieldModal visible>
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
      <PressShieldModal visible={false}>
        <Text>content</Text>
      </PressShieldModal>,
    );

    expect(screen.UNSAFE_queryByType(Modal)).toBeNull();
    expect(screen.queryByText("content", { includeHiddenElements: true })).toBeNull();
  });

  it("keeps the closed Modal mounted on native, where the exit animation is wanted", () => {
    setPlatformOS("ios");
    render(
      <PressShieldModal visible={false}>
        <Text>content</Text>
      </PressShieldModal>,
    );

    expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(false);
  });

  it("re-arms when the modal is closed and reopened", () => {
    setPlatformOS("web");
    const ui = (visible: boolean) => (
      <PressShieldModal visible={visible}>
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

  it("drops the shield after the fallback window even if onShow never fires", () => {
    // A missed animationend must never leave the modal permanently inert —
    // that failure mode would be far worse than the swallowed tap it prevents.
    jest.useFakeTimers();
    setPlatformOS("web");
    render(
      <PressShieldModal visible>
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
