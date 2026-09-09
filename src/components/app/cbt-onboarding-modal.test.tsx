import { screen } from "@testing-library/react-native";

import { CbtOnboarding } from "@/src/components/app/cbt-onboarding-modal";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-linear-gradient", () => {
  const { View } = require("react-native");
  return { LinearGradient: View };
});

function open() {
  return renderWithProviders(<CbtOnboarding visible onComplete={() => {}} onDismiss={() => {}} />);
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
 * The condition table names three diagnoses beside the CBT techniques used for
 * each, which is the strongest thing in the app that reads as treatment
 * information (#1002). The framing line is what makes "educational, not
 * diagnostic" true on the screen itself. These assertions exist so that deleting or
 * moving it fails CI rather than quietly re-opening the App Review question.
 *
 * ☠️ #1867 softened the table for a 13+ readership (ruling: option 3) and these
 * assertions moved with it rather than being deleted. The three changes are the
 * expanded acronym, the de-clinicalised intro, and the dropped "Core Feature"
 * column - each pinned below.
 */
describe("CbtOnboarding", () => {
  it("frames the condition table as educational rather than diagnostic", () => {
    open();

    expect(screen.getByText(/shows what CBT is most often used for/i)).toBeTruthy();
    expect(screen.getByText(/not a diagnosis, an assessment, or a treatment plan/i)).toBeTruthy();
  });

  it("does not present the module as clinical treatment on the screen introducing it", () => {
    open();

    // #1867's second change. The word carried the whole framing, so it is pinned
    // against the sentence that replaced it - a bare absence assertion here would
    // pass just as well on a screen with no table at all.
    const text = renderedTextInOrder();
    expect(text.some((s) => s.includes("most often used for"))).toBe(true);
    expect(text.some((s) => /clinically/i.test(s))).toBe(false);
  });

  it("puts the framing line above the table, not after it", () => {
    open();

    const text = renderedTextInOrder();
    const framing = text.findIndex((s) => s.includes("most often used for"));
    const firstHeader = text.indexOf("Condition");

    expect(framing).toBeGreaterThanOrEqual(0);
    expect(firstHeader).toBeGreaterThanOrEqual(0);
    expect(framing).toBeLessThan(firstHeader);
  });

  it("still shows the table it is framing, with the acronym spelled out", () => {
    open();

    // #1867's first change: `GAD` appeared nowhere else in the app, so for the
    // reader it introduces it was an unfamiliar acronym in the first cell.
    expect(screen.getByText("Generalised Anxiety Disorder")).toBeTruthy();
    expect(screen.queryByText("GAD")).toBeNull();
    expect(screen.getByText("Panic Disorder")).toBeTruthy();
    expect(screen.getByText("Depression")).toBeTruthy();
  });

  it("pairs each condition with its CBT focus and nothing else", () => {
    open();

    // #1867's third change. ☠️ The dropped column is asserted against the two
    // that survive it: a lone `queryByText("Core Feature")).toBeNull()` would
    // pass unconditionally once the string is gone - and would keep passing if
    // the whole table were deleted. The positive assertions are what give the
    // negative ones meaning.
    const text = renderedTextInOrder();
    expect(text).toContain("Condition");
    expect(text).toContain("CBT Focus");
    expect(text).toContain("Embracing uncertainty and present-moment focus");
    expect(text).not.toContain("Core Feature");
    expect(text).not.toContain("Chronic Worry");
  });
});
