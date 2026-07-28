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

    expect(screen.getByRole("heading", { name: "Small tools for heavy days." })).toBeTruthy();
  });

  it("shows the hero support line", () => {
    renderWithProviders(<LandingScreen />);

    expect(
      screen.getByText(
        "Calm, guided self-help - CBT and ACT modules plus eight everyday tools. No ads, no subscriptions.",
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

  it("shows all eight tool pills", () => {
    renderWithProviders(<LandingScreen />);

    for (const name of [
      "Daily check-in",
      "Journal",
      "Breathing",
      "Meditation",
      "Grounding",
      "Gratitude log",
      "Sleep",
      "Habits",
    ]) {
      expect(screen.getByText(name)).toBeTruthy();
    }
  });
});
