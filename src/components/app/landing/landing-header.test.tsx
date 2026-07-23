import { fireEvent, screen } from "@testing-library/react-native";

import { LandingHeader } from "./landing-header";
import { useThemeStore } from "@/src/stores/theme-store";
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
      children: React.ReactElement;
    }) => React.cloneElement(React.Children.only(children), { href }),
  };
});

afterEach(() => {
  useThemeStore.setState({ preference: "system" });
});

describe("LandingHeader", () => {
  it("shows the brand", () => {
    renderWithProviders(<LandingHeader />);

    expect(screen.getByText("Selftend")).toBeTruthy();
  });

  it("links the auth CTAs", () => {
    renderWithProviders(<LandingHeader />);

    expect(screen.getByRole("link", { name: "Sign in" }).props.href).toBe("/(auth)/sign-in");
    expect(screen.getByRole("link", { name: "Get started" }).props.href).toBe("/(auth)/sign-up");
  });

  it("switches to the dark theme from light", () => {
    renderWithProviders(<LandingHeader />);

    fireEvent.press(screen.getByLabelText("Switch to the dark theme"));

    expect(useThemeStore.getState().preference).toBe("dark");
  });

  it("switches back to the light theme from dark", () => {
    useThemeStore.setState({ preference: "dark" });
    renderWithProviders(<LandingHeader />);

    fireEvent.press(screen.getByLabelText("Switch to the light theme"));

    expect(useThemeStore.getState().preference).toBe("light");
  });
});
