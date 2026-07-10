import { screen } from "@testing-library/react-native";

import LandingScreen from "./landing-screen";
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

describe("LandingScreen", () => {
  it("renders the hero headline as the single top-level heading", () => {
    renderWithProviders(<LandingScreen />);

    expect(screen.getByRole("heading", { name: "Calm, guided self-help." })).toBeTruthy();
  });

  it("shows the hero support line", () => {
    renderWithProviders(<LandingScreen />);

    expect(
      screen.getByText(
        "Free, open-source tools for working with thoughts, moods, and habits — no ads, no subscriptions.",
      ),
    ).toBeTruthy();
  });

  it("links Get started to sign-up", () => {
    renderWithProviders(<LandingScreen />);

    expect(screen.getByRole("link", { name: "Get started" }).props.href).toBe("/(auth)/sign-up");
  });

  it("links Sign in to sign-in", () => {
    renderWithProviders(<LandingScreen />);

    expect(screen.getByRole("link", { name: "Sign in" }).props.href).toBe("/(auth)/sign-in");
  });
});
