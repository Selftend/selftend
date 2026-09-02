import { screen } from "@testing-library/react-native";

import LearnScreen from "@/app/(app)/modules/cbt/learn";
import { distortionDefinitions } from "@/src/constants/distortions";
import { setLanguage } from "@/test/i18n-language";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  // ScreenHeader renders the breadcrumb trail, which reads the route.
  usePathname: () => "/modules/cbt/learn",
  Link: ({ children }: { children?: React.ReactNode }) => children,
}));

// The trail is the only link on the screen; with it out of the way, "no link"
// below means the card's door really is a sentence and not plumbing.
jest.mock("@/src/components/app/screen-breadcrumb", () => ({ ScreenBreadcrumb: () => null }));

/** The heading names in document order, so a card's PLACE can be asserted. */
const headingNames = () =>
  screen.getAllByRole("heading").map((node) => {
    const child = node.props.children;
    return Array.isArray(child) ? child.join("") : String(child);
  });

describe("CBT LearnScreen - the pacing-and-mode card (#1671)", () => {
  beforeAll(async () => {
    await setLanguage("en");
  });

  it("teaches pace and mode in one static card, before the thinking patterns", () => {
    renderWithProviders(<LearnScreen />);

    const names = headingNames();
    const card = names.indexOf("How much, and how");

    // The card exists once, and sits with the framework guidance above the
    // catalogue rather than among the patterns (ruling 3 of #1659: one place).
    // The catalogue is the tail of the heading list, one heading per pattern.
    expect(names.filter((name) => name === "How much, and how")).toHaveLength(1);
    expect(card).toBeGreaterThan(names.indexOf("Use gently"));
    expect(card).toBeLessThan(names.length - distortionDefinitions.length);

    // Rhythm, not count: the programme's own pace is the pace.
    expect(screen.getByText(/More records in a day is not more progress/)).toBeTruthy();
    // Mode: from "why" toward the evidence.
    expect(screen.getByText(/what is the evidence/)).toBeTruthy();
    // The door - one sentence, in framework voice, no link plumbing.
    expect(screen.getByText(/worth bringing to a professional/)).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });

  describe("in Bulgarian", () => {
    beforeAll(async () => {
      // Via the helper, never a bare `changeLanguage`: bg's bundles are lazy,
      // and without them these assertions would run against English copy.
      await setLanguage("bg");
    });

    afterAll(async () => {
      await setLanguage("en");
    });

    it("renders the card", () => {
      renderWithProviders(<LearnScreen />);

      expect(screen.getByRole("heading", { name: "Колко, и как" })).toBeTruthy();
      expect(screen.getByText(/Повече записи в един ден не са повече напредък/)).toBeTruthy();
      expect(screen.getByText(/да споделиш със специалист/)).toBeTruthy();
    });
  });
});
