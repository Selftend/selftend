import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { QueryClient } from "@tanstack/react-query";
import { fireEvent, screen, waitFor, within } from "@testing-library/react-native";
import { router } from "expo-router";

import { ItemCard } from "@/src/features/favorites/item-card";
import { MODULE_ITEMS, TOOL_ITEMS } from "@/src/features/favorites/items";
import { favoriteKeys } from "@/src/features/favorites/queries";
import { addFavorite, listFavorites, removeFavorite } from "@/src/features/favorites/repository";
import type { ToolStatProps } from "@/src/features/home/tool-row-stats";
import { CHROME_ACCENT_MARK, CHROME_MARK, CHROME_TEXT } from "@/src/lib/theme/chrome";
import { createTestQueryClient, renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  usePathname: () => "/tools",
}));

jest.mock("@/src/features/favorites/repository", () => ({
  addFavorite: jest.fn(),
  listFavorites: jest.fn(),
  removeFavorite: jest.fn(),
}));

// The stat line is Home's implementation, read through `ToolStat` (spec §2.3). Stubbed
// here so the card's contract - render the string it is handed, or nothing - is tested
// without mounting eight tools' worth of queries; the strings themselves are covered in
// tool-row-stats.test.tsx.
let mockStatByTool: Record<string, string | null> = {};
jest.mock("@/src/features/home/tool-row-stats", () => ({
  ToolStat: ({ toolKey, children }: { toolKey: string } & ToolStatProps) =>
    children(mockStatByTool[toolKey] ?? null),
}));

const mockList = jest.mocked(listFavorites);
const mockAdd = jest.mocked(addFavorite);
const mockRemove = jest.mocked(removeFavorite);

const USER = "user-1";
const mood = TOOL_ITEMS[0];
const cbt = MODULE_ITEMS[0];

/** A client whose favourites list is ALREADY loaded, so the star is drawn synchronously. */
function loadedClient(rows: { kind: "tool" | "module"; key: string }[]) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(favoriteKeys.list(USER), rows);
  return queryClient;
}

/** The glyph names rendered inside a node, via react-test-renderer (RNTL hides `aria-hidden` icons). */
const glyphsIn = (node: ReturnType<typeof screen.getByTestId>) =>
  node.findAllByType(MaterialIcons).map((icon) => icon.props.name as string);

beforeEach(() => {
  jest.clearAllMocks();
  mockStatByTool = {};
  mockList.mockResolvedValue([]);
  mockAdd.mockResolvedValue();
  mockRemove.mockResolvedValue();
});

describe("ItemCard - shape", () => {
  it("renders a tool as glyph mark → name / subtitle, with no chevron", () => {
    renderWithProviders(<ItemCard item={mood} userId={USER} />, {
      queryClient: loadedClient([]),
    });

    const card = screen.getByTestId("card-tool-mood");
    expect(within(card).getByText("Check-in")).toBeTruthy();
    expect(within(card).getByText("Patterns over time")).toBeTruthy();
    expect(glyphsIn(card)).toEqual(["mood"]);
    expect(glyphsIn(card)).not.toContain("arrow-forward");
  });

  it("renders a module as abbreviation mark → name / short subtitle, no footer, no description", () => {
    renderWithProviders(<ItemCard item={cbt} userId={USER} />, {
      queryClient: loadedClient([]),
    });

    const card = screen.getByTestId("card-module-cbt");
    const texts = within(card)
      .getAllByText(/.+/)
      .map((node) => node.props.children as string);
    expect(texts).toEqual(["CBT", "Cognitive behavioural therapy", "Think · Act · Be"]);
    expect(within(card).queryByText(/Overview/)).toBeNull();
    expect(glyphsIn(card)).toEqual([]);
  });

  it("inks the two marks by role: a glyph is CHROME_MARK, an abbreviation is CHROME_TEXT", () => {
    renderWithProviders(
      <>
        <ItemCard item={mood} userId={USER} />
        <ItemCard item={cbt} userId={USER} />
      </>,
      { queryClient: loadedClient([]) },
    );

    const [glyph] = screen.getByTestId("card-tool-mood").findAllByProps({ name: "mood" });
    expect((glyph.props.className as string).split(/\s+/)).toContain(CHROME_MARK);
    expect((screen.getByText("CBT").props.className as string).split(/\s+/)).toContain(CHROME_TEXT);
  });

  it("carries no accessibilityLabel and no accessibilityHint - the children are the name", () => {
    renderWithProviders(<ItemCard item={mood} userId={USER} />, {
      queryClient: loadedClient([]),
    });

    const card = screen.getByTestId("card-tool-mood");
    expect(card.props.accessibilityLabel).toBeUndefined();
    expect(card.props.accessibilityHint).toBeUndefined();
    expect(card.props.accessibilityRole).toBe("button");
  });

  it("keeps the star OUTSIDE the navigating pressable", () => {
    renderWithProviders(<ItemCard item={mood} userId={USER} />, {
      queryClient: loadedClient([]),
    });

    const card = screen.getByTestId("card-tool-mood");
    expect(within(card).queryByTestId("card-star-tool-mood")).toBeNull();
    expect(screen.getByTestId("card-star-tool-mood")).toBeTruthy();
  });

  it("navigates on the card and never on the star", () => {
    renderWithProviders(<ItemCard item={mood} userId={USER} />, {
      queryClient: loadedClient([]),
    });

    fireEvent.press(screen.getByTestId("card-star-tool-mood"));
    expect(router.push).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId("card-tool-mood"));
    expect(router.push).toHaveBeenCalledWith("/tools/check-in");
  });
});

describe("ItemCard - the stat line", () => {
  it("renders Home's stat string for a tool, under its own testID", () => {
    mockStatByTool = { mood: "3 this week · 7-day average 3.4" };
    renderWithProviders(<ItemCard item={mood} userId={USER} />, {
      queryClient: loadedClient([]),
    });

    expect(screen.getByTestId("card-stat-tool-mood").props.children).toBe(
      "3 this week · 7-day average 3.4",
    );
  });

  it("draws NO stat before the stat has loaded - never a zero", () => {
    mockStatByTool = { mood: null };
    renderWithProviders(<ItemCard item={mood} userId={USER} />, {
      queryClient: loadedClient([]),
    });

    expect(screen.queryByTestId("card-stat-tool-mood")).toBeNull();
    // Two text nodes, name and subtitle: the stat is an absent child, not an empty one.
    expect(within(screen.getByTestId("card-tool-mood")).getAllByText(/.+/)).toHaveLength(2);
  });

  it("gives a module no stat node at all", () => {
    mockStatByTool = { cbt: "would be wrong" };
    renderWithProviders(<ItemCard item={cbt} userId={USER} />, {
      queryClient: loadedClient([]),
    });

    expect(screen.queryByTestId("card-stat-module-cbt")).toBeNull();
    expect(screen.queryByText("would be wrong")).toBeNull();
  });
});

describe("ItemCard - the star", () => {
  it("draws no star until the favourites list has loaded", async () => {
    let resolveList!: (rows: never[]) => void;
    mockList.mockReturnValue(new Promise((resolve) => (resolveList = resolve)));
    renderWithProviders(<ItemCard item={mood} userId={USER} />, {
      queryClient: createTestQueryClient(),
    });

    expect(screen.queryByTestId("card-star-tool-mood")).toBeNull();
    // The card itself is there: only the star withholds its claim.
    expect(screen.getByTestId("card-tool-mood")).toBeTruthy();

    resolveList([]);
    await waitFor(() => expect(screen.getByTestId("card-star-tool-mood")).toBeTruthy());
  });

  it("is hollow and CHROME_MARK when not starred, with an 'add' label and the toggle state off", () => {
    renderWithProviders(<ItemCard item={mood} userId={USER} />, {
      queryClient: loadedClient([]),
    });

    const star = screen.getByTestId("card-star-tool-mood");
    expect(star.props.accessibilityLabel).toBe("Favourite Check-in");
    expect(star.props.accessibilityRole).toBe("button");
    // `toggleButtonStateProps`: aria-pressed on web, aria-selected on native (jest is ios).
    expect(star.props.accessibilityState?.selected).toBe(false);
    expect(glyphsIn(star)).toEqual(["star-outline"]);
    const [icon] = star.findAllByProps({ name: "star-outline" });
    expect((icon.props.className as string).split(/\s+/)).toContain(CHROME_MARK);
  });

  it("is filled and CHROME_ACCENT_MARK when starred, with a 'remove' label and the toggle state on", () => {
    renderWithProviders(<ItemCard item={cbt} userId={USER} />, {
      queryClient: loadedClient([{ kind: "module", key: "cbt" }]),
    });

    const star = screen.getByTestId("card-star-module-cbt");
    expect(star.props.accessibilityLabel).toBe(
      "Remove Cognitive behavioural therapy from favourites",
    );
    expect(star.props.accessibilityState?.selected).toBe(true);
    expect(glyphsIn(star)).toEqual(["star"]);
    const [icon] = star.findAllByProps({ name: "star" });
    expect((icon.props.className as string).split(/\s+/)).toContain(CHROME_ACCENT_MARK);
  });

  it("never uses the heart - that is the gratitude tool's own glyph", () => {
    renderWithProviders(<ItemCard item={TOOL_ITEMS[3]} userId={USER} />, {
      queryClient: loadedClient([{ kind: "tool", key: "gratitude" }]),
    });

    // The gratitude CARD's mark is the heart; its STAR is a star.
    expect(glyphsIn(screen.getByTestId("card-tool-gratitude"))).toEqual(["favorite"]);
    expect(glyphsIn(screen.getByTestId("card-star-tool-gratitude"))).toEqual(["star"]);
  });

  it("flips optimistically on press and is never disabled while the write is in flight", async () => {
    let resolveAdd!: () => void;
    mockAdd.mockReturnValue(new Promise<void>((resolve) => (resolveAdd = resolve)));
    const queryClient = loadedClient([]);
    renderWithProviders(<ItemCard item={mood} userId={USER} />, { queryClient });

    fireEvent.press(screen.getByTestId("card-star-tool-mood"));

    await waitFor(() =>
      expect(screen.getByTestId("card-star-tool-mood").props.accessibilityState?.selected).toBe(
        true,
      ),
    );
    const star = screen.getByTestId("card-star-tool-mood");
    expect(star.props.accessibilityState?.disabled).not.toBe(true);
    expect(star.props.disabled).not.toBe(true);
    expect(mockAdd).toHaveBeenCalledWith(USER, "tool", "mood");

    // A second press while the first is still in flight is the undo, and it is accepted.
    fireEvent.press(star);
    resolveAdd();
    await waitFor(() => expect(mockRemove).toHaveBeenCalledWith(USER, "tool", "mood"));
  });

  it("draws no star for a signed-out render", () => {
    renderWithProviders(<ItemCard item={mood} userId={null} />, {
      queryClient: new QueryClient(),
    });

    expect(screen.queryByTestId("card-star-tool-mood")).toBeNull();
    expect(mockList).not.toHaveBeenCalled();
  });
});
