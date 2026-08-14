import { screen, within } from "@testing-library/react-native";
import type { ReactNode } from "react";

import ModulesScreen from "./modules-screen";
import { renderWithProviders } from "@/test/render-with-providers";

// `ScreenHeader` renders the breadcrumb, which reads `usePathname`.
jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  usePathname: () => "/modules",
  Link: ({ children }: { children: ReactNode }) => children,
}));

/** Every string rendered inside one tile, in document order. Icons are `aria-hidden`. */
function textsInTile(accessibilityLabel: string): string[] {
  const tile = screen.getByLabelText(accessibilityLabel);
  return within(tile)
    .queryAllByText(/.+/)
    .map((node) => node.props.children)
    .filter((child): child is string => typeof child === "string");
}

/**
 * The `/modules` index was the second surface badging DBT "Soon" - the sidebar
 * being the first - and it said it three ways at once: the pill, a footer
 * reading "On the roadmap", and a `schedule` clock face where the other two
 * tiles drew a forward arrow (#1020).
 *
 * The tiles are asserted by counting their text nodes rather than by querying
 * for the removed words, so a chip returning under fresh wording fails here.
 */
describe("ModulesScreen", () => {
  // Three nodes: the mark, the name, the description. Their footer slot renders
  // an empty string, which `/.+/` does not match - so a fourth node here means a
  // chip or a status line came back.
  it.each([
    ["CBT", "Cognitive behavioral therapy"],
    ["ACT", "Acceptance & commitment"],
  ])("gives %s a name and a description, with no status beside them", (mark, name) => {
    renderWithProviders(<ModulesScreen />);

    const texts = textsInTile(name);

    expect(texts).toHaveLength(3);
    expect(texts.slice(0, 2)).toEqual([mark, name]);
    expect(texts.join(" ")).not.toMatch(/soon|roadmap|beta|in design/i);
  });

  // DBT keeps a footer where the other two are empty, because it is the one
  // tile that is not a programme. "Overview" describes the screen the tile
  // actually leads to; "On the roadmap" described a module that does not exist.
  it("marks DBT as an overview rather than as something still coming", () => {
    renderWithProviders(<ModulesScreen />);

    const texts = textsInTile("Dialectical behavior therapy");

    expect(texts).toHaveLength(4);
    expect(texts[0]).toBe("DBT");
    expect(texts[3]).toBe("Overview");
    expect(texts.join(" ")).not.toMatch(/soon|roadmap/i);
  });

  it("says on the tile itself that DBT is an overview of the approach", () => {
    renderWithProviders(<ModulesScreen />);

    expect(screen.getByText(/An overview of the approach\./)).toBeTruthy();
  });

  it("still lists all three modules", () => {
    renderWithProviders(<ModulesScreen />);

    for (const name of [
      "Cognitive behavioral therapy",
      "Acceptance & commitment",
      "Dialectical behavior therapy",
    ]) {
      expect(screen.getByLabelText(name)).toBeTruthy();
    }
  });
});
