import { fireEvent, screen } from "@testing-library/react-native";
import { Text as mockText } from "react-native";
import type { ReactElement } from "react";

import { InvisibleHeader } from "./invisible-header";
import { getTourTarget, setTourTarget } from "@/src/features/tours/tour-targets";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    // Mirror Link asChild: forward the href onto the wrapped pressable so
    // tests can assert real link targets instead of spying on router.push.
    Link: ({
      href,
      asChild: _asChild,
      children,
    }: {
      href: string;
      asChild?: boolean;
      children: ReactElement;
    }) => React.cloneElement(React.Children.only(children), { href }),
  };
});

// The header is under test, not the account menu — stub the menu's heavy deps away.
jest.mock("@/src/components/app/user-menu", () => {
  const Text = mockText;
  return {
    UserMenu: () => <Text>User menu</Text>,
  };
});

afterEach(() => {
  setTourTarget("home-navigation", null);
});

describe("InvisibleHeader", () => {
  it("renders a transparent row: no card surface or bottom border on the bar itself", () => {
    renderWithProviders(<InvisibleHeader onMenuPress={jest.fn()} />);

    const row = screen.getByTestId("invisible-header");
    expect(row.props.className).not.toContain("bg-");
    expect(row.props.className).not.toContain("border-b");
  });

  it("opens the navigation from the hamburger", () => {
    const onMenuPress = jest.fn();
    renderWithProviders(<InvisibleHeader onMenuPress={onMenuPress} />);

    const hamburger = screen.getByLabelText("Open navigation");
    expect(hamburger.props.role).toBe("button");
    fireEvent.press(hamburger);
    expect(onMenuPress).toHaveBeenCalledTimes(1);
  });

  it("centers the brand as a home link to the signed-in root", () => {
    renderWithProviders(<InvisibleHeader onMenuPress={jest.fn()} />);

    expect(screen.getByRole("link", { name: "Go to home" }).props.href).toBe("/(app)");
    expect(screen.getByText("Selftend")).toBeTruthy();
  });

  it("keeps the brand layer tap-transparent via the pointerEvents PROP", () => {
    renderWithProviders(<InvisibleHeader onMenuPress={jest.fn()} />);

    // Regression guard: box-none must be the View prop, not a style entry,
    // or the absolutely-positioned brand layer swallows hamburger/menu taps.
    const layer = screen.getByTestId("invisible-header-brand-layer");
    expect(layer.props.pointerEvents).toBe("box-none");
  });

  it("renders the account menu", () => {
    renderWithProviders(<InvisibleHeader onMenuPress={jest.fn()} />);

    expect(screen.getByText("User menu")).toBeTruthy();
  });

  it("registers the hamburger as the home-navigation tour target", () => {
    const { unmount } = renderWithProviders(<InvisibleHeader onMenuPress={jest.fn()} />);

    expect(getTourTarget("home-navigation")).not.toBeNull();
    unmount();
    expect(getTourTarget("home-navigation")).toBeNull();
  });
});
