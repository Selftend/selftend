import { fireEvent, screen } from "@testing-library/react-native";
import { Text as mockText, View as mockView } from "react-native";
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

// The shell is under test, not the header/panel internals — visible stubs let
// the suite assert which chrome renders without pulling in their deps.
jest.mock("@/src/components/app/app-header", () => {
  const Text = mockText;
  return {
    AppHeader: () => <Text>Old top bar</Text>,
  };
});

jest.mock("@/src/components/app/sidebar-nav", () => {
  const Text = mockText;
  return {
    SidebarNav: ({ onSelect }: { onSelect?: () => void }) => (
      <Text onPress={onSelect}>Navigation panel</Text>
    ),
  };
});

const mockUseWindowDimensions = jest.fn();

// Partial mock via Proxy (mirrors app-header.test.tsx): spreading `{...actual}`
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
  mockSessionState = { session: { user: { id: "user-1" } } };
  useSidebarStore.setState({ isOpen: false });
  mockUseWindowDimensions.mockReturnValue(DESKTOP_DIMENSIONS);
});

describe("AppShell chrome per session state", () => {
  it("signed in: renders the invisible header and never the old top bar", () => {
    renderWithProviders(<AppShell />);

    expect(screen.getByLabelText("Open navigation")).toBeTruthy();
    expect(screen.queryByText("Old top bar")).toBeNull();
  });

  it("signed out: keeps the old top bar, no hamburger", () => {
    mockSessionState = { session: null };

    renderWithProviders(<AppShell />);

    expect(screen.getByText("Old top bar")).toBeTruthy();
    expect(screen.queryByLabelText("Open navigation")).toBeNull();
  });
});

describe("AppShell overlay panel", () => {
  it("opens from the hamburger on desktop and dismisses via the backdrop", () => {
    renderWithProviders(<AppShell />);

    expect(screen.queryByText("Navigation panel")).toBeNull();
    fireEvent.press(screen.getByLabelText("Open navigation"));
    expect(screen.getByText("Navigation panel")).toBeTruthy();

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
