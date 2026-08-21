import { fireEvent, screen, within } from "@testing-library/react-native";
import { StyleSheet, Text as mockText } from "react-native";
import type { ReactElement } from "react";

import { INVISIBLE_HEADER_HEIGHT, InvisibleHeader } from "./invisible-header";
import { Icon } from "@/src/components/react-native-reusables/icon";
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
      dangerouslySingular,
    }: {
      href: string;
      asChild?: boolean;
      children: ReactElement;
      // expo-router's real SingularOptions; the panel only ever passes `true`.
      dangerouslySingular?: boolean | ((name: string, params: object) => string | undefined);
    }) => React.cloneElement(React.Children.only(children), { href, dangerouslySingular }),
  };
});

// The header is under test, not the account menu — stub the menu's heavy deps away.
jest.mock("@/src/components/app/user-menu", () => {
  const Text = mockText;
  return {
    UserMenu: () => <Text>User menu</Text>,
  };
});

// Notched-device insets so the safe-area test can tell "inset applied" from
// "no margin". Built on the library's official jest mock (the one
// test/setup.js installs) — requireActual's SafeAreaProvider renders nothing
// in jest.
jest.mock("react-native-safe-area-context", () => {
  const mock = jest.requireActual("react-native-safe-area-context/jest/mock").default;
  return {
    ...mock,
    useSafeAreaInsets: () => ({ top: 59, right: 0, bottom: 34, left: 0 }),
  };
});

afterEach(() => {
  setTourTarget("home-navigation", null);
});

describe("InvisibleHeader", () => {
  it("renders a transparent row: no card surface or bottom border on the bar itself", () => {
    renderWithProviders(<InvisibleHeader homeHref="/(app)" onMenuPress={jest.fn()} />);

    const row = screen.getByTestId("invisible-header");
    expect(row.props.className).not.toContain("bg-");
    expect(row.props.className).not.toContain("border-b");
  });

  it("opens the navigation from the hamburger", () => {
    const onMenuPress = jest.fn();
    renderWithProviders(<InvisibleHeader homeHref="/(app)" onMenuPress={onMenuPress} />);

    const hamburger = screen.getByLabelText("Open navigation");
    expect(hamburger.props.role).toBe("button");
    fireEvent.press(hamburger);
    expect(onMenuPress).toHaveBeenCalledTimes(1);
  });

  it("centers the brand as a home link to the signed-in root", () => {
    renderWithProviders(<InvisibleHeader homeHref="/(app)" onMenuPress={jest.fn()} />);

    expect(screen.getByRole("link", { name: "Go to home" }).props.href).toBe("/(app)");
    expect(screen.getByText("Selftend")).toBeTruthy();
  });

  /**
   * The wordmark is a "go to the top" affordance, not a drill-down. Without `singular`,
   * expo-router pushes a second Home whenever one is already deeper in the stack, so
   * every query on Home runs twice (#989) - the same defect as the nav panel's rows.
   */
  it("returns to the Home already in the stack instead of pushing a second one", () => {
    renderWithProviders(<InvisibleHeader homeHref="/(app)" onMenuPress={jest.fn()} />);

    expect(screen.getByRole("link", { name: "Go to home" }).props.dangerouslySingular).toBe(true);
  });

  it("keeps the brand layer tap-transparent via the pointerEvents PROP", () => {
    renderWithProviders(<InvisibleHeader homeHref="/(app)" onMenuPress={jest.fn()} />);

    // Regression guard: box-none must be the View prop, not a style entry,
    // or the absolutely-positioned brand layer swallows hamburger/menu taps.
    const layer = screen.getByTestId("invisible-header-brand-layer");
    expect(layer.props.pointerEvents).toBe("box-none");
  });

  /**
   * `INVISIBLE_HEADER_HEIGHT` is arithmetic on these classes, and the toast's
   * clamp is arithmetic on it (#1340): past the clamp the toast stops climbing so
   * its top edge lands exactly on this bar's bottom edge. Nothing measures the
   * header at runtime - the toast is root-mounted outside AppShell and has no
   * handle on it - so a padding change here would move the header and leave the
   * clamp behind, silently, with every test still green.
   *
   * Pinned as classes rather than as a rendered height because jest's `View`
   * measures nothing. The classes ARE the height on both platforms.
   */
  it("keeps the classes the exported header height is computed from", () => {
    renderWithProviders(<InvisibleHeader homeHref="/(app)" onMenuPress={jest.fn()} />);

    // py-2 = 8px top and bottom.
    expect(screen.getByTestId("invisible-header").props.className).toContain("py-2");
    // The tallest child, and the only one that decides the row: p-3 (12px) around
    // a size-6 (24px) icon = 48px.
    const hamburger = screen.getByLabelText("Open navigation");
    expect(hamburger.props.className).toContain("p-3");
    expect(within(hamburger).UNSAFE_getByType(Icon).props.className).toContain("size-6");

    expect(INVISIBLE_HEADER_HEIGHT).toBe(8 + 48 + 8);
  });

  it("keeps the signed-out row the same height as the signed-in one", () => {
    // The constant has to hold on BOTH branches or the toast's clamp is wrong on
    // one of them. Signed out there is no hamburger, so the `size-12` spacer is
    // what has to be 48px - the same number the arithmetic above assumes.
    renderWithProviders(<InvisibleHeader homeHref="/" />);

    expect(screen.getByTestId("invisible-header").props.className).toContain("py-2");
    expect(screen.getByTestId("invisible-header-nav-spacer").props.className).toContain("size-12");
    expect(INVISIBLE_HEADER_HEIGHT).toBe(8 + 48 + 8);
  });

  it("renders the account menu", () => {
    renderWithProviders(<InvisibleHeader homeHref="/(app)" onMenuPress={jest.fn()} />);

    expect(screen.getByText("User menu")).toBeTruthy();
  });

  it("registers the hamburger as the home-navigation tour target", () => {
    const { unmount } = renderWithProviders(
      <InvisibleHeader homeHref="/(app)" onMenuPress={jest.fn()} />,
    );

    expect(getTourTarget("home-navigation")).not.toBeNull();
    unmount();
    expect(getTourTarget("home-navigation")).toBeNull();
  });

  // #669: signed out there is no nav — the hamburger slot renders an invisible
  // same-size spacer so the row structure and UserMenu position stay identical.
  describe("signed out (no onMenuPress)", () => {
    it("renders a same-size spacer instead of the hamburger", () => {
      renderWithProviders(<InvisibleHeader homeHref="/" />);

      expect(screen.queryByLabelText("Open navigation")).toBeNull();
      const spacer = screen.getByTestId("invisible-header-nav-spacer");
      // size-12 = the hamburger's footprint (p-3 padding around a size-6 icon).
      expect(spacer.props.className).toContain("size-12");
    });

    it("links the centered brand to the signed-out root", () => {
      renderWithProviders(<InvisibleHeader homeHref="/" />);

      expect(screen.getByRole("link", { name: "Go to home" }).props.href).toBe("/");
    });

    it("keeps the account menu in place", () => {
      renderWithProviders(<InvisibleHeader homeHref="/" />);

      expect(screen.getByText("User menu")).toBeTruthy();
    });
  });

  // #673 accessibility verification pass.
  describe("accessibility", () => {
    // DOM order IS the web Tab order: the absolute brand layer used to render
    // first, putting the logo before the hamburger in keyboard traversal
    // while sitting visually between the buttons.
    it("orders the chrome hamburger → home link in the DOM", () => {
      renderWithProviders(<InvisibleHeader homeHref="/(app)" onMenuPress={jest.fn()} />);

      const labels = within(screen.getByTestId("invisible-header"))
        .getAllByLabelText(/./)
        .map((node) => node.props.accessibilityLabel as string);

      expect(labels).toEqual(["Open navigation", "Go to home"]);
    });

    it("signed out: only the home link is labelled; the spacer is inert", () => {
      renderWithProviders(<InvisibleHeader homeHref="/" />);

      const labels = within(screen.getByTestId("invisible-header"))
        .getAllByLabelText(/./)
        .map((node) => node.props.accessibilityLabel as string);
      expect(labels).toEqual(["Go to home"]);

      const spacer = screen.getByTestId("invisible-header-nav-spacer");
      expect(spacer.props.accessibilityLabel).toBeUndefined();
      expect(spacer.props.focusable).toBeUndefined();
      expect(spacer.props.onPress).toBeUndefined();
    });

    it("pushes the bar below the status bar by the top safe-area inset", () => {
      renderWithProviders(<InvisibleHeader homeHref="/(app)" onMenuPress={jest.fn()} />);

      const bar = screen.getByTestId("invisible-header");
      expect((StyleSheet.flatten(bar.props.style) as { marginTop?: number }).marginTop).toBe(59);
    });
  });
});
