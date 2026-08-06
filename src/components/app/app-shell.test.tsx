import { fireEvent, screen } from "@testing-library/react-native";
import { Platform, Text as mockText, View as mockView } from "react-native";
import type { ReactElement, ReactNode } from "react";

import { AppShell } from "./app-shell";
import { useSidebarStore } from "@/src/stores/sidebar-store";
import { renderWithProviders } from "@/test/render-with-providers";

type MockSessionState = { session: { user: { id: string } } | null };

let mockSessionState: MockSessionState = { session: { user: { id: "user-1" } } };

jest.mock("expo-router", () => {
  const React = require("react");
  const View = mockView;

  function Stack({ children }: { children?: ReactNode }) {
    return <View>{children}</View>;
  }

  Stack.Screen = function StackScreen() {
    return null;
  };

  return {
    Link: ({
      href,
      asChild: _asChild,
      children,
    }: {
      href: string;
      asChild?: boolean;
      children: ReactElement;
    }) => React.cloneElement(React.Children.only(children), { href }),
    Stack,
    usePathname: () => "/",
  };
});

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => mockSessionState,
}));

jest.mock("@/src/components/app/user-menu", () => ({
  UserMenu: () => null,
}));

// The shell is under test, not the panel internals — a visible stub lets the
// suite assert the overlay renders without pulling in the panel's deps.
jest.mock("@/src/components/app/sidebar-nav", () => {
  const Text = mockText;
  return {
    SidebarNav: ({ onSelect }: { onSelect?: () => void }) => (
      <Text onPress={onSelect}>Navigation panel</Text>
    ),
  };
});

const mockUseWindowDimensions = jest.fn();

// Partial mock via Proxy: spreading `{...actual}`
// would eagerly evaluate every lazy getter React Native's module defines, so
// only intercept the one export this suite needs to control.
jest.mock("react-native", () => {
  const actual = jest.requireActual("react-native");
  return new Proxy(actual, {
    get(target, prop, receiver) {
      if (prop === "useWindowDimensions") {
        return mockUseWindowDimensions;
      }
      return Reflect.get(target, prop, receiver);
    },
  });
});

// Either side of the retired sidebar-vs-hamburger switch (DESKTOP_BREAKPOINT = 768):
// the overlay shell must behave identically on both.
const MOBILE_DIMENSIONS = { width: 390, height: 844, scale: 3, fontScale: 1 };
const DESKTOP_DIMENSIONS = { width: 1024, height: 768, scale: 1, fontScale: 1 };

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
  mockSessionState = { session: { user: { id: "user-1" } } };
  useSidebarStore.setState({ isOpen: false });
  mockUseWindowDimensions.mockReturnValue(DESKTOP_DIMENSIONS);
});

describe("AppShell chrome per session state", () => {
  it("signed in: renders the invisible header with the hamburger, home links to the app root", () => {
    renderWithProviders(<AppShell />);

    expect(screen.getByTestId("invisible-header")).toBeTruthy();
    expect(screen.getByLabelText("Open navigation")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Go to home" }).props.href).toBe("/(app)");
  });

  // #669: one chrome everywhere — signed out gets the same invisible header
  // with a same-size spacer in the hamburger slot and the brand linking to "/".
  it("signed out: renders the invisible header with a spacer instead of the hamburger", () => {
    mockSessionState = { session: null };

    renderWithProviders(<AppShell />);

    expect(screen.getByTestId("invisible-header")).toBeTruthy();
    expect(screen.queryByLabelText("Open navigation")).toBeNull();
    expect(screen.getByTestId("invisible-header-nav-spacer")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Go to home" }).props.href).toBe("/");
  });
});

describe("AppShell overlay panel", () => {
  it("opens from the hamburger on desktop and dismisses via the backdrop", () => {
    renderWithProviders(<AppShell />);

    expect(screen.queryByText("Navigation panel")).toBeNull();
    fireEvent.press(screen.getByLabelText("Open navigation"));
    expect(screen.getByText("Navigation panel")).toBeTruthy();
    // e2e scopes panel clicks to this testID (navigateViaPanel) — keep it.
    expect(screen.getByTestId("navigation-overlay")).toBeTruthy();

    // No X: the backdrop is the close affordance, keeping its button role and
    // screen-reader label.
    const backdrop = screen.getByLabelText("Close navigation");
    expect(backdrop.props.role).toBe("button");
    fireEvent.press(backdrop);
    expect(screen.queryByText("Navigation panel")).toBeNull();
  });

  it("opens the same overlay at mobile width", () => {
    mockUseWindowDimensions.mockReturnValue(MOBILE_DIMENSIONS);

    renderWithProviders(<AppShell />);

    fireEvent.press(screen.getByLabelText("Open navigation"));
    expect(screen.getByText("Navigation panel")).toBeTruthy();
  });

  it("closes when a panel link is selected", () => {
    renderWithProviders(<AppShell />);

    fireEvent.press(screen.getByLabelText("Open navigation"));
    fireEvent.press(screen.getByText("Navigation panel"));
    expect(screen.queryByText("Navigation panel")).toBeNull();
  });
});

// #671: the declarative half of the web modal keyboard story. The Escape /
// focus-trap / focus-restore half is the hook's own unit suite
// (use-modal-panel-keyboard.test.tsx). The dialog is the WHOLE overlay —
// panel and backdrop — because aria-modal hides the modal's siblings from
// assistive tech, and the backdrop is the panel's only close affordance.
describe("AppShell modal panel semantics", () => {
  it("marks the overlay modal and hides the page behind while open", () => {
    renderWithProviders(<AppShell />);

    expect(screen.getByTestId("app-shell-page").props["aria-hidden"]).toBe(false);
    fireEvent.press(screen.getByLabelText("Open navigation"));

    const overlay = screen.getByTestId("navigation-overlay");
    expect(overlay.props.role).toBe("dialog");
    expect(overlay.props["aria-modal"]).toBe(true);
    // The backdrop lives INSIDE the modal, so assistive tech keeps its close
    // affordance — findable without includeHiddenElements.
    expect(screen.getByLabelText("Close navigation")).toBeTruthy();
    // The page is aria-hidden and outside the modal — hidden from default
    // queries, which is exactly the behavior under assertion.
    expect(
      screen.getByTestId("app-shell-page", { includeHiddenElements: true }).props["aria-hidden"],
    ).toBe(true);

    fireEvent.press(screen.getByLabelText("Close navigation"));
    expect(screen.getByTestId("app-shell-page").props["aria-hidden"]).toBe(false);
  });

  it("keeps the backdrop out of the web Tab order without losing its role and label", () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });

    renderWithProviders(<AppShell />);
    fireEvent.press(screen.getByLabelText("Open navigation"));

    const backdrop = screen.getByLabelText("Close navigation");
    expect(backdrop.props.tabIndex).toBe(-1);
    expect(backdrop.props.role).toBe("button");
  });

  it("does not touch the native backdrop's focusability", () => {
    renderWithProviders(<AppShell />);
    fireEvent.press(screen.getByLabelText("Open navigation"));

    expect(screen.getByLabelText("Close navigation").props.tabIndex).toBeUndefined();
  });
});
