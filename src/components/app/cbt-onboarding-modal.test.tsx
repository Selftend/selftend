import { screen } from "@testing-library/react-native";

import { CbtOnboarding } from "@/src/components/app/cbt-onboarding-modal";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-linear-gradient", () => {
  const { View } = require("react-native");
  return { LinearGradient: View };
});

function open() {
  return renderWithProviders(<CbtOnboarding visible onComplete={() => {}} />);
}

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
 * The condition table names GAD, Panic Disorder and Depression beside the CBT
 * techniques used for each, which is the strongest thing in the app that reads as
 * treatment information (#1002). The framing line is what makes "educational, not
 * diagnostic" true on the screen itself. These assertions exist so that deleting or
 * moving it fails CI rather than quietly re-opening the App Review question.
 */
describe("CbtOnboarding", () => {
  it("frames the condition table as educational rather than diagnostic", () => {
    open();

    expect(screen.getByText(/describes what CBT is clinically used for/i)).toBeTruthy();
    expect(screen.getByText(/not a diagnosis, an assessment, or a treatment plan/i)).toBeTruthy();
  });

  it("puts the framing line above the table, not after it", () => {
    open();

    const text = renderedTextInOrder();
    const framing = text.findIndex((s) => s.includes("clinically used for"));
    const firstHeader = text.indexOf("Condition");

    expect(framing).toBeGreaterThanOrEqual(0);
    expect(firstHeader).toBeGreaterThanOrEqual(0);
    expect(framing).toBeLessThan(firstHeader);
  });

  it("still shows the table it is framing", () => {
    open();

    expect(screen.getByText("GAD")).toBeTruthy();
    expect(screen.getByText("Panic Disorder")).toBeTruthy();
    expect(screen.getByText("Depression")).toBeTruthy();
  });
});
