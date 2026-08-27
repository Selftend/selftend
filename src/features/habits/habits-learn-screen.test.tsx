import { fireEvent, screen } from "@testing-library/react-native";

import { router } from "expo-router";

import {
  HabitsLearnDetailScreen,
  HabitsLearnIndexScreen,
} from "@/src/features/habits/habits-learn-screen";
import { HABITS_LEARN_CARDS } from "@/src/features/habits/learn";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    canGoBack: jest.fn(() => true),
    push: jest.fn(),
    replace: jest.fn(),
  },
  usePathname: () => "/tools/habits/learn",
}));

describe("HabitsLearnIndexScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders every learn card", () => {
    renderWithProviders(<HabitsLearnIndexScreen />);

    expect(screen.getByRole("heading", { name: "Habit building - core ideas" })).toBeTruthy();
    // One card row per entry in the source-of-truth list, plus the breadcrumb
    // back button (#495).
    expect(screen.getAllByRole("button")).toHaveLength(HABITS_LEARN_CARDS.length + 1);
  });

  it("navigates to the article when a card is pressed", () => {
    renderWithProviders(<HabitsLearnIndexScreen />);

    fireEvent.press(screen.getByRole("button", { name: "The 1% compounding effect" }));

    expect(router.push).toHaveBeenCalledWith({
      pathname: "/tools/habits/learn/[slug]",
      params: { slug: "compounding" },
    });
  });
});

describe("HabitsLearnDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the article", () => {
    renderWithProviders(<HabitsLearnDetailScreen slug="two-minute-rule" />);

    expect(screen.getByRole("heading", { name: "The two-minute rule" })).toBeTruthy();
  });

  it("falls back to the index for an unknown slug", () => {
    renderWithProviders(<HabitsLearnDetailScreen slug="nope" />);

    expect(screen.getByRole("heading", { name: "Habit building - core ideas" })).toBeTruthy();
  });

  it("navigates to a related card and back to habits", () => {
    renderWithProviders(<HabitsLearnDetailScreen slug="two-minute-rule" />);

    // The active article is excluded from its own related list.
    expect(screen.queryByRole("button", { name: "The two-minute rule" })).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Never miss twice" }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/tools/habits/learn/[slug]",
      params: { slug: "never-miss-twice" },
    });

    fireEvent.press(screen.getByText("Back to habits"));
    expect(router.push).toHaveBeenCalledWith("/tools/habits");
  });
});
