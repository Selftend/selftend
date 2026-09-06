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

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/favorites/queries", () => ({
  useFavorites: () => ({ data: [] }),
  useToggleFavorite: () => ({ mutate: jest.fn() }),
}));

/** Every string rendered inside one card's navigating region, in document order. */
function textsInCard(key: string): string[] {
  return within(screen.getByTestId(`card-module-${key}`))
    .queryAllByText(/.+/)
    .map((node) => node.props.children)
    .filter((child): child is string => typeof child === "string");
}

/**
 * The `/modules` index was the second surface badging DBT "Soon" - the sidebar being
 * the first - and it said it three ways at once: the pill, a footer reading "On the
 * roadmap", and a `schedule` clock face where the other two tiles drew a forward arrow
 * (#1020). #1887's one card then deleted the footer outright, together with the long
 * description and the arrow: the "what it is" slot holds a short fragment now.
 *
 * The tiles are asserted by counting their text nodes rather than by querying for the
 * removed words, so a chip returning under fresh wording fails here.
 */
describe("ModulesScreen", () => {
  // Three nodes: the mark, the name, the fragment. A fourth means a footer, a chip or a
  // status line came back - on ANY of the three, DBT included, now that the footer whose
  // one occupant was "Overview" is gone.
  it.each([
    ["cbt", "CBT", "Cognitive behavioural therapy", "Think · Act · Be"],
    ["act", "ACT", "Acceptance & commitment", "Act on what matters"],
    ["dbt", "DBT", "Dialectical behaviour therapy", "For when feelings run high"],
  ])("gives %s a mark, a name and a fragment, and nothing beside them", (key, mark, name, sub) => {
    renderWithProviders(<ModulesScreen />);

    const texts = textsInCard(key);

    expect(texts).toEqual([mark, name, sub]);
    expect(texts.join(" ")).not.toMatch(/soon|roadmap|beta|in design|overview/i);
  });

  it("renders exactly the three module cards, each with a star, and no tool card", () => {
    renderWithProviders(<ModulesScreen />);

    expect(screen.getAllByTestId(/^card-module-/).map((node) => node.props.testID)).toEqual([
      "card-module-cbt",
      "card-module-act",
      "card-module-dbt",
    ]);
    expect(screen.getAllByTestId(/^card-star-module-/)).toHaveLength(3);
    expect(screen.queryByTestId(/^card-tool-/)).toBeNull();
  });
});
