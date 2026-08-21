/**
 * Tests for the layer-0 keyboard publisher (#1339, spec §5.2).
 *
 * Native (jest's default platform): `Keyboard` listeners publish the keyboard's
 * height and clear it on hide.
 * Web: the `visualViewport` overlap from `useWebKeyboardInset` is the edge.
 *
 * ☠️ `Platform.OS`, never `Platform.select({ web })` — jest resolves select's
 * web branch invisibly, which would make every assertion here vacuous.
 */

import { act, render } from "@testing-library/react-native";
import { Keyboard, Platform } from "react-native";

import { KeyboardInsetPublisher } from "@/src/components/app/keyboard-inset-publisher";
import {
  INSET_LAYER,
  insetBelowLayer,
  useLayeredInsetStore,
} from "@/src/stores/layered-inset-store";

const ORIGINAL_OS = Platform.OS;

function setPlatform(os: string) {
  Object.defineProperty(Platform, "OS", { configurable: true, value: os });
}

/** What a layer-1 consumer would read. */
function keyboardEdge() {
  return insetBelowLayer(useLayeredInsetStore.getState().edges, INSET_LAYER.strip);
}

beforeEach(() => {
  useLayeredInsetStore.setState({ edges: {} });
});

afterEach(() => {
  setPlatform(ORIGINAL_OS);
  jest.restoreAllMocks();
});

describe("on native", () => {
  /** Capture the handlers `Keyboard.addListener` is given. */
  function captureListeners() {
    const handlers: Record<string, (event: unknown) => void> = {};
    const remove = jest.fn();
    jest
      .spyOn(Keyboard, "addListener")
      .mockImplementation((event: string, handler: (payload: never) => void) => {
        handlers[event] = handler as (payload: unknown) => void;
        return { remove } as never;
      });
    return { handlers, remove };
  }

  it("publishes the keyboard height on show and clears it on hide", () => {
    setPlatform("ios");
    const { handlers } = captureListeners();

    render(<KeyboardInsetPublisher />);

    act(() => handlers.keyboardDidShow({ endCoordinates: { height: 336 } }));
    expect(keyboardEdge()).toBe(336);

    act(() => handlers.keyboardDidHide({}));
    expect(keyboardEdge()).toBe(0);
  });

  it("subscribes on Android too — edge-to-edge makes it overlay exactly as on iOS", () => {
    setPlatform("android");
    const { handlers } = captureListeners();

    render(<KeyboardInsetPublisher />);

    act(() => handlers.keyboardDidShow({ endCoordinates: { height: 280 } }));
    expect(keyboardEdge()).toBe(280);
  });

  it("removes its listeners and clears the edge on unmount", () => {
    setPlatform("ios");
    const { handlers, remove } = captureListeners();

    const view = render(<KeyboardInsetPublisher />);
    act(() => handlers.keyboardDidShow({ endCoordinates: { height: 336 } }));

    view.unmount();

    expect(remove).toHaveBeenCalledTimes(2);
    expect(useLayeredInsetStore.getState().edges).toEqual({});
  });
});

describe("on web", () => {
  const originalWindow = globalThis.window;

  function setViewport(height: number) {
    const listeners: ((event: unknown) => void)[] = [];
    const viewport = {
      addEventListener: jest.fn((_event: string, handler: (e: unknown) => void) =>
        listeners.push(handler),
      ),
      height,
      offsetTop: 0,
      removeEventListener: jest.fn(),
    };
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { innerHeight: 800, visualViewport: viewport },
      writable: true,
    });
    return {
      resizeTo: (next: number) => {
        viewport.height = next;
        act(() => listeners.forEach((handler) => handler({})));
      },
    };
  }

  afterEach(() => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
      writable: true,
    });
  });

  it("publishes the visual-viewport overlap and never subscribes to Keyboard", () => {
    setPlatform("web");
    const addListener = jest.spyOn(Keyboard, "addListener");
    const viewport = setViewport(800);

    render(<KeyboardInsetPublisher />);
    expect(keyboardEdge()).toBe(0);

    // The keyboard shrinks the VISUAL viewport only; innerHeight stays 800, so
    // an `absolute; bottom` element would otherwise sit behind it.
    viewport.resizeTo(480);
    expect(keyboardEdge()).toBe(320);

    viewport.resizeTo(800);
    expect(keyboardEdge()).toBe(0);

    expect(addListener).not.toHaveBeenCalled();
  });

  it("reaches the floaters, so the FAB and the prompt card clear the keyboard", () => {
    setPlatform("web");
    const viewport = setViewport(800);

    render(<KeyboardInsetPublisher />);
    viewport.resizeTo(480);

    // RoutineFab and ReminderPromptCard sit on layer 2 and read everything
    // below: layer 0 reaches them exactly as layer 1 does. That is #1339's
    // visible win - before this, an `absolute; bottom` floater sat BEHIND the
    // web keyboard, because no viewport meta resizes the layout viewport here.
    expect(insetBelowLayer(useLayeredInsetStore.getState().edges, INSET_LAYER.floater)).toBe(320);
  });
});
