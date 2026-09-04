import { screen, within } from "@testing-library/react-native";
import type { ReactNode } from "react";

import ModulesScreen from "./modules-screen";
import { MODULE_ITEMS } from "@/src/features/favorites/items";
import { favoriteKeys } from "@/src/features/favorites/queries";
import { createTestQueryClient, renderWithProviders } from "@/test/render-with-providers";

// `ScreenHeader` renders the breadcrumb, which reads `usePathname`.
jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  usePathname: () => "/modules",
  Link: ({ children }: { children: ReactNode }) => children,
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/favorites/repository", () => ({
  addFavorite: jest.fn(),
  listFavorites: jest.fn().mockResolvedValue([]),
  removeFavorite: jest.fn(),
}));

/** A favourites list already loaded, so the stars are drawn on the first render. */
function render() {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(favoriteKeys.list("user-1"), [{ kind: "module", key: "act" }]);
  return renderWithProviders(<ModulesScreen />, { queryClient });
}

/** Every string rendered inside one card's navigating region, in document order. Icons are `aria-hidden`. */
function textsInTile(key: string): string[] {
  const tile = screen.getByTestId(`card-module-${key}`);
  return within(tile)
    .queryAllByText(/.+/)
    .map((node) => node.props.children)
    .filter((child): child is string => typeof child === "string");
}

/**
 * The `/modules` index was the second surface badging DBT "Soon" - the sidebar being the
 * first - and it said it three ways at once: a pill, a footer reading "On the roadmap",
 * and a clock face where the other tiles drew a forward arrow (#1020). #1955 then
 * replaced the tile with the one card: the footer, the long description and the arrow
 * are gone from all three, and a short subtitle sits where the description was.
 *
 * The cards are asserted by COUNTING their text nodes rather than by querying for the
 * removed words, so a chip, a footer or a description returning under fresh wording
 * fails here.
 */
describe("ModulesScreen", () => {
  // Three nodes: the mark, the name, the subtitle. A fourth means a footer, a
  // description or a status line came back.
  it.each([
    ["cbt", "CBT", "Cognitive behavioural therapy", "Think · Act · Be"],
    ["act", "ACT", "Acceptance & commitment", "Act on what matters"],
    ["dbt", "DBT", "Dialectical behaviour therapy", "Four skill groups"],
  ])("gives %s a mark, a name and a short subtitle, and nothing else", (key, mark, name, sub) => {
    render();

    const texts = textsInTile(key);

    expect(texts).toEqual([mark, name, sub]);
    expect(texts.join(" ")).not.toMatch(/soon|roadmap|beta|in design|overview|evidence/i);
  });

  it("renders the three modules in CBT, ACT, DBT order, each with a star", () => {
    render();

    expect(screen.getAllByTestId(/^card-module-/).map((card) => card.props.testID)).toEqual(
      MODULE_ITEMS.map((item) => `card-module-${item.key}`),
    );
    for (const item of MODULE_ITEMS) {
      expect(screen.getByTestId(`card-star-module-${item.key}`)).toBeTruthy();
    }
    expect(screen.getByTestId("card-star-module-act").props.accessibilityState?.selected).toBe(
      true,
    );
    expect(screen.getByTestId("card-star-module-cbt").props.accessibilityState?.selected).toBe(
      false,
    );
  });

  it("gives no module a stat line", () => {
    render();

    expect(screen.queryAllByTestId(/^card-stat-/)).toEqual([]);
  });

  it("still describes the page above the cards", () => {
    render();

    expect(screen.getByText(/Structured therapeutic programmes/)).toBeTruthy();
    expect(screen.getByText(/Not sure where to start/)).toBeTruthy();
  });
});
