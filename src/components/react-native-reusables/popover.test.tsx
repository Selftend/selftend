import { fireEvent, render, screen } from "@testing-library/react-native";
import { Platform } from "react-native";
import * as React from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/components/react-native-reusables/popover";
import { Text } from "@/src/components/react-native-reusables/text";
import { setPlatformOS } from "@/test/modal-marker-mock";

/**
 * #1326: popover.tsx's web entrance (`animate-in fade-in-0 zoom-in-95` plus a
 * slide) ran unconditionally on web, ignoring `useReduceMotionEnabled()` -
 * unlike the native half, which `NativeOnlyAnimatedView` already strips under
 * reduce motion. The fix mirrors the shape #1314/#1118 already established for
 * the toast and for `PressShieldModal`: gate the web class list on the hook.
 *
 * ☠️ Mocked at the MODULE, never through jsdom's `matchMedia` - the hook's web
 * branch reads `matchMedia` through `useSyncExternalStore`, and jsdom's stub
 * pins the result to `false`, so a matchMedia-based test could only prove the
 * `false` half. Every existing reduce-motion consumer test mocks the module
 * for the same reason (see press-shield-modal.test.tsx, app-toast.test.tsx).
 */

// react-native-screens' FullWindowOverlay is picked once at MODULE LOAD
// (`Platform.OS === "ios" ? RNFullWindowOverlay : React.Fragment`), and
// jest-expo's defaultPlatform is "ios" - so by the time a test here flips to
// "web", the alias is already frozen to the real overlay, which then warns
// off-iOS. Mirrors user-menu.test.tsx's fix for the same trap.
jest.mock("react-native-screens", () => ({
  ...jest.requireActual("react-native-screens"),
  FullWindowOverlay: ({ children }: { children: React.ReactNode }) => children,
}));

// The shared __mocks__/@rn-primitives/popover.js keeps open/close state but
// deliberately discards every prop except `children` on Content - fine for
// consumer tests that only check content visibility, but this test needs the
// className popover.tsx computes. Re-implement the same open/close context
// locally and forward the rest of the props onto a real View instead.
jest.mock("@rn-primitives/popover", () => {
  const ReactActual = require("react");
  const { View: RNView } = require("react-native");

  const PopoverContext = ReactActual.createContext({ open: false, setOpen: () => {} });

  return {
    Root: function Root({ children }: { children?: React.ReactNode }) {
      const [open, setOpen] = ReactActual.useState(false);
      const ctx = ReactActual.useMemo(() => ({ open, setOpen }), [open]);
      return ReactActual.createElement(PopoverContext.Provider, { value: ctx }, children);
    },
    // Forwards `...rest` (testID included) so a test can find and press the
    // trigger directly, matching how the real call sites open a popover
    // (user-menu.test.tsx presses the labelled trigger, never a `defaultOpen`
    // shortcut - `defaultOpen` isn't even part of the real Root's prop type).
    Trigger: ReactActual.forwardRef(function Trigger(
      {
        children,
        asChild,
        ...rest
      }: { children?: React.ReactNode; asChild?: boolean; [key: string]: unknown },
      ref: React.Ref<unknown>,
    ) {
      const { setOpen, open } = ReactActual.useContext(PopoverContext);
      ReactActual.useImperativeHandle(ref, () => ({
        open: () => setOpen(true),
        close: () => setOpen(false),
      }));
      const handlePress = () => setOpen(!open);
      if (asChild && ReactActual.isValidElement(children)) {
        return ReactActual.cloneElement(children, { onPress: handlePress, ...rest });
      }
      return ReactActual.createElement(RNView, { onPress: handlePress, ...rest }, children);
    }),
    Portal: function Portal({ children }: { children?: React.ReactNode }) {
      return children ?? null;
    },
    Overlay: function Overlay({ children }: { children?: React.ReactNode }) {
      return children ?? null;
    },
    Content: ReactActual.forwardRef(function Content(
      { children, ...rest }: { children?: React.ReactNode; [key: string]: unknown },
      ref: React.Ref<unknown>,
    ) {
      const { open } = ReactActual.useContext(PopoverContext);
      if (!open) return null;
      return ReactActual.createElement(RNView, { ref, ...rest }, children);
    }),
    useRootContext: function useRootContext() {
      return ReactActual.useContext(PopoverContext);
    },
  };
});

let mockReduceMotion = false;
jest.mock("@/src/lib/accessibility", () => ({
  ...jest.requireActual("@/src/lib/accessibility"),
  useReduceMotionEnabled: () => mockReduceMotion,
}));

const ORIGINAL_OS = Platform.OS;

afterEach(() => {
  setPlatformOS(ORIGINAL_OS as "web" | "ios" | "android");
  mockReduceMotion = false;
});

function renderOpenPopover() {
  render(
    <Popover>
      <PopoverTrigger testID="popover-trigger">
        <Text>Open</Text>
      </PopoverTrigger>
      <PopoverContent testID="popover-content" side="bottom">
        <Text>Content</Text>
      </PopoverContent>
    </Popover>,
  );
  fireEvent.press(screen.getByTestId("popover-trigger"));
}

describe("PopoverContent - web entrance motion", () => {
  const contentClasses = () => String(screen.getByTestId("popover-content").props.className);

  it("animates in on web", () => {
    setPlatformOS("web");
    renderOpenPopover();

    expect(contentClasses()).toContain("animate-in fade-in-0 zoom-in-95");
    expect(contentClasses()).toContain("slide-in-from-top-2");
  });

  it("omits the entrance animation under reduce motion", () => {
    setPlatformOS("web");
    mockReduceMotion = true;
    renderOpenPopover();

    expect(contentClasses()).not.toContain("animate-in");
    expect(contentClasses()).not.toContain("zoom-in-95");
    expect(contentClasses()).not.toContain("slide-in-from-top-2");
    // Unconditional on reduce motion: it is a pointer affordance, not motion.
    expect(contentClasses()).toContain("cursor-auto");
  });

  it("never carries the web animation classes on native, regardless of the motion setting", () => {
    renderOpenPopover();

    expect(contentClasses()).not.toContain("animate-in");
    expect(contentClasses()).not.toContain("cursor-auto");
  });
});
