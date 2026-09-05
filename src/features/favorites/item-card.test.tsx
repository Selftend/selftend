import { fireEvent, screen, within } from "@testing-library/react-native";
import { router } from "expo-router";

import { ItemCard } from "@/src/features/favorites/item-card";
import { MODULES, TOOLS } from "@/src/features/favorites/items";
import { useToggleFavorite } from "@/src/features/favorites/queries";
import { HUE_NAMES } from "@/src/lib/design-tokens";
import { CHROME_ACCENT_MARK, CHROME_MARK, CHROME_TEXT } from "@/src/lib/theme/chrome";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  usePathname: () => "/",
}));

jest.mock("@/src/features/favorites/queries", () => ({
  useToggleFavorite: jest.fn(),
}));

let mockStat: string | null = null;
jest.mock("@/src/features/home/tool-row-stats", () => {
  const { Text } = require("react-native");
  return {
    ToolStat: ({ toolKey }: { toolKey: string }) =>
      mockStat === null ? null : <Text testID={`card-stat-tool-${toolKey}`}>{mockStat}</Text>,
  };
});

const mockPush = router.push as jest.Mock;
const mockUseToggle = useToggleFavorite as jest.MockedFunction<typeof useToggleFavorite>;
const mutate = jest.fn();

const MOOD = TOOLS[0];
const CBT = MODULES[0];

beforeEach(() => {
  jest.clearAllMocks();
  mockStat = null;
  mockUseToggle.mockReturnValue({ mutate } as unknown as ReturnType<typeof useToggleFavorite>);
});

/** Every className string rendered inside a node. */
function classNamesIn(node: ReturnType<typeof screen.getByTestId>) {
  return node
    .findAll((child) => typeof child.props?.className === "string")
    .map((child) => child.props.className as string);
}

describe("ItemCard structure (#1887)", () => {
  it("renders the star as a SIBLING of the navigating region, never inside it", () => {
    renderWithProviders(<ItemCard item={MOOD} userId="user-1" favorites={[]} />);

    const region = screen.getByTestId("card-tool-mood");
    expect(within(region).queryByTestId("card-star-tool-mood")).toBeNull();
    expect(screen.getByTestId("card-star-tool-mood")).toBeTruthy();
  });

  it("gives the navigating region no accessibilityLabel and no accessibilityHint", () => {
    renderWithProviders(<ItemCard item={MOOD} userId="user-1" favorites={[]} />);

    const region = screen.getByTestId("card-tool-mood");
    expect(region.props.accessibilityLabel).toBeUndefined();
    expect(region.props.accessibilityHint).toBeUndefined();
    // The children ARE the name: the stat line is part of what one press acts on.
    expect(within(region).getByText("Check-in")).toBeTruthy();
    expect(within(region).getByText("Patterns over time")).toBeTruthy();
  });

  it("navigates to the item's route from the region, not from the star", () => {
    renderWithProviders(<ItemCard item={MOOD} userId="user-1" favorites={[]} />);

    fireEvent.press(screen.getByTestId("card-star-tool-mood"));
    expect(mockPush).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId("card-tool-mood"));
    expect(mockPush).toHaveBeenCalledWith("/tools/check-in");
  });

  it("draws the stat once loaded, on the tool's own testID", () => {
    mockStat = "3 this week";
    renderWithProviders(<ItemCard item={MOOD} userId="user-1" favorites={[]} />);

    expect(screen.getByTestId("card-stat-tool-mood")).toHaveTextContent("3 this week");
  });

  /**
   * A module card carries NO stat — an absent child, not a blank slot. Stated as a
   * count of the region's text nodes (mark, name, what-it-is) so a fourth node under
   * any wording fails here.
   */
  it("gives a module card exactly three text nodes and no stat node", () => {
    mockStat = "would be drawn on a tool";
    renderWithProviders(<ItemCard item={CBT} userId="user-1" favorites={[]} />);

    const texts = within(screen.getByTestId("card-module-cbt"))
      .queryAllByText(/.+/)
      .map((node) => node.props.children)
      .filter((child): child is string => typeof child === "string");
    expect(texts).toEqual(["CBT", "Cognitive behavioural therapy", "Think · Act · Be"]);
    expect(screen.queryByTestId(/^card-stat-/)).toBeNull();
  });

  it("inks a tool's glyph as a mark and a module's abbreviation as text, with no hue", () => {
    const hue = new RegExp(
      String.raw`(?<![\w-])(text|bg|border)-(${HUE_NAMES.join("|")})(-ink)?(?![\w-])`,
    );

    renderWithProviders(<ItemCard item={MOOD} userId="user-1" favorites={[]} />);
    const toolClasses = classNamesIn(screen.getByTestId("card-tool-mood"));
    expect(toolClasses.some((name) => name.split(/\s+/).includes(CHROME_MARK))).toBe(true);
    expect(toolClasses.filter((name) => hue.test(name))).toEqual([]);

    screen.unmount();

    renderWithProviders(<ItemCard item={CBT} userId="user-1" favorites={[]} />);
    const abbreviation = screen.getByText("CBT");
    expect((abbreviation.props.className as string).split(/\s+/)).toContain(CHROME_TEXT);
    expect(classNamesIn(screen.getByTestId("card-module-cbt")).filter((n) => hue.test(n))).toEqual(
      [],
    );
  });
});

describe("the star (#1888)", () => {
  it("draws no star at all while the favourites have not loaded", () => {
    renderWithProviders(<ItemCard item={MOOD} userId="user-1" favorites={undefined} />);

    expect(screen.queryByTestId("card-star-tool-mood")).toBeNull();
    // The region is still there — only the claim is withheld.
    expect(screen.getByTestId("card-tool-mood")).toBeTruthy();
  });

  // React Native folds the `aria-selected` the helper emits on native into
  // `accessibilityState.selected` before the host node sees it (the same fold
  // disclosure.test.tsx documents for `aria-expanded`).
  it("names the item, reads unselected and takes the muted mark while off", () => {
    renderWithProviders(<ItemCard item={MOOD} userId="user-1" favorites={[]} />);

    const off = screen.getByTestId("card-star-tool-mood");
    expect(off.props.accessibilityLabel).toBe("Favourite Check-in");
    expect(off.props.accessibilityState.selected).toBe(false);
    expect(classNamesIn(off).some((name) => name.split(/\s+/).includes(CHROME_MARK))).toBe(true);
  });

  it("names the removal, reads selected and takes the accent mark while on", () => {
    renderWithProviders(
      <ItemCard item={MOOD} userId="user-1" favorites={[{ kind: "tool", key: "mood" }]} />,
    );

    const on = screen.getByTestId("card-star-tool-mood");
    expect(on.props.accessibilityLabel).toBe("Remove Check-in from favourites");
    expect(on.props.accessibilityState.selected).toBe(true);
    expect(classNamesIn(on).some((name) => name.split(/\s+/).includes(CHROME_ACCENT_MARK))).toBe(
      true,
    );
  });

  it("toggles to the opposite state on press, through one scoped mutation per item", () => {
    renderWithProviders(<ItemCard item={MOOD} userId="user-1" favorites={[]} />);
    expect(mockUseToggle).toHaveBeenCalledWith("user-1", "tool", "mood");

    fireEvent.press(screen.getByTestId("card-star-tool-mood"));
    expect(mutate).toHaveBeenCalledWith(true);

    screen.unmount();
    mutate.mockClear();

    renderWithProviders(
      <ItemCard item={MOOD} userId="user-1" favorites={[{ kind: "tool", key: "mood" }]} />,
    );
    fireEvent.press(screen.getByTestId("card-star-tool-mood"));
    expect(mutate).toHaveBeenCalledWith(false);
  });

  it("is never disabled - a pending star would block the undo press", () => {
    renderWithProviders(<ItemCard item={MOOD} userId="user-1" favorites={[]} />);

    expect(screen.getByTestId("card-star-tool-mood").props.disabled).toBeFalsy();
  });
});
