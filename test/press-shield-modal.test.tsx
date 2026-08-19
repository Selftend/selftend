import { act, render, screen } from "@testing-library/react-native";
import { Modal, Platform, Text } from "react-native";

import { ENTRANCE_FALLBACK_MS, PressShieldModal } from "@/src/components/app/press-shield-modal";
import { setPlatformOS } from "@/test/modal-marker-mock";

/**
 * #1108: on web, a press landing while a react-native-web Modal is still
 * running its 250ms slide-in is silently swallowed — mousedown reaches the
 * button, the button moves before mouseup, and onPress never fires (#1051's
 * diagnosis). PressShieldModal overlays a transparent shield until RNW
 * reports the entrance finished (onShow), so a too-early press hits the
 * shield (and does nothing) instead of half-hitting a moving control.
 *
 * jest cannot exercise the real RNW animation (react-native renders here),
 * so these tests drive the seam the wrapper owns: the onShow contract.
 */

const ORIGINAL_OS = Platform.OS;

const fireModalShow = () => {
  const modal = screen.UNSAFE_getByType(Modal);
  act(() => {
    (modal.props as { onShow: () => void }).onShow();
  });
};

afterEach(() => {
  setPlatformOS(ORIGINAL_OS as "web" | "ios" | "android");
  jest.useRealTimers();
});

describe("PressShieldModal", () => {
  it("shields presses during the web slide-in and releases on onShow", () => {
    setPlatformOS("web");
    render(
      <PressShieldModal animationType="slide" visible>
        <Text>content</Text>
      </PressShieldModal>,
    );

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
      <PressShieldModal animationType="slide" onShow={onShow} visible>
        <Text>content</Text>
      </PressShieldModal>,
    );

    fireModalShow();
    expect(onShow).toHaveBeenCalledTimes(1);
  });

  it("never shields when the entrance is not animated", () => {
    // The reduce-motion path (animationType="none") — also what the e2e suite
    // runs under — must not gain a shield frame at all.
    setPlatformOS("web");
    render(
      <PressShieldModal animationType="none" visible>
        <Text>content</Text>
      </PressShieldModal>,
    );

    expect(screen.getByText("content")).toBeTruthy();
    expect(
      screen.queryByTestId("modal-entrance-shield", { includeHiddenElements: true }),
    ).toBeNull();
  });

  it("never shields on native", () => {
    // Native touch handling tracks moving views; the swallow mechanism is
    // web-only (#1108), so native keeps full interactivity during the slide.
    setPlatformOS("ios");
    render(
      <PressShieldModal animationType="slide" visible>
        <Text>content</Text>
      </PressShieldModal>,
    );

    expect(screen.getByText("content")).toBeTruthy();
    expect(
      screen.queryByTestId("modal-entrance-shield", { includeHiddenElements: true }),
    ).toBeNull();
  });

  it("re-arms when the modal is closed and reopened", () => {
    setPlatformOS("web");
    const ui = (visible: boolean) => (
      <PressShieldModal animationType="slide" visible={visible}>
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
      <PressShieldModal animationType="slide" visible>
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
