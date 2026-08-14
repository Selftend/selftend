import { screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import DbtModuleScreen from "./dbt-module-screen";
import { renderWithProviders } from "@/test/render-with-providers";

// `ScreenHeader` renders the breadcrumb, which reads `usePathname`.
jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  usePathname: () => "/modules/dbt",
  Link: ({ children }: { children: ReactNode }) => children,
}));

/** Every rendered string, in document order. */
function renderedTextInOrder(): string[] {
  const out: string[] = [];
  const walk = (node: unknown): void => {
    if (typeof node === "string") {
      out.push(node);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node && typeof node === "object" && "children" in node) {
      walk((node as { children: unknown }).children);
    }
  };
  walk(screen.toJSON());
  return out;
}

/**
 * This screen's CONTENT was never a placeholder - four DBT skill groups,
 * explained, with the crisis callout under them. Its FRAMING was: an eyebrow
 * reading "Module · DBT", a description ending "On the roadmap." and a card
 * headed "On the roadmap", inside a binary Apple cited under Guideline 2.1 *App
 * Completeness* (#998). #1020 kept the content and rewrote the framing.
 *
 * So these assertions guard both halves. Stripping the roadmap wording while
 * also gutting the four skill groups would leave a screen that promises nothing
 * and says nothing, which is a worse answer to a completeness citation, not a
 * better one.
 */
describe("DbtModuleScreen", () => {
  it("presents itself as an overview, not as a module in waiting", () => {
    renderWithProviders(<DbtModuleScreen />);

    expect(screen.getByText("Overview · DBT")).toBeTruthy();
    expect(screen.getByText("What DBT is")).toBeTruthy();
  });

  it("sends the reader to the modules that do have exercises", () => {
    renderWithProviders(<DbtModuleScreen />);

    expect(screen.getByText(/guided exercises are in the CBT and ACT modules/i)).toBeTruthy();
  });

  it("promises no module that does not exist", () => {
    renderWithProviders(<DbtModuleScreen />);

    expect(renderedTextInOrder().join(" ")).not.toMatch(/roadmap|coming soon|\bsoon\b/i);
  });

  it("still explains all four skill groups", () => {
    renderWithProviders(<DbtModuleScreen />);

    expect(screen.getByText("The four skill groups")).toBeTruthy();
    for (const name of [
      "Mindfulness",
      "Distress tolerance",
      "Emotion regulation",
      "Interpersonal effectiveness",
    ]) {
      expect(screen.getByText(name)).toBeTruthy();
    }
  });
});
