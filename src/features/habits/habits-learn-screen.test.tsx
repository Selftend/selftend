import { fireEvent, screen } from "@testing-library/react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { router } from "expo-router";

import {
  HabitsLearnDetailScreen,
  HabitsLearnIndexScreen,
} from "@/src/features/habits/habits-learn-screen";
import { HABITS_LEARN_CARDS } from "@/src/features/habits/learn";
import { renderWithProviders } from "@/test/render-with-providers";
import { expectRoomPour } from "@/test/room-pour";

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

  it("renders every learn card inside the act room - no field gradient", () => {
    const { UNSAFE_getByType } = renderWithProviders(<HabitsLearnIndexScreen />);

    expect(screen.getByRole("heading", { name: "Habit building - core ideas" })).toBeTruthy();
    // One card row per entry in the source-of-truth list, plus the breadcrumb
    // back button (#495).
    expect(screen.getAllByRole("button")).toHaveLength(HABITS_LEARN_CARDS.length + 1);
    expect(screen.queryByTestId("module-field-gradient")).toBeNull();
    // The root carries the act room re-pour; a wrong or missing room fails here.
    expectRoomPour(UNSAFE_getByType(SafeAreaView), "act");
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

  it("renders the article inside the act room - no field gradient", () => {
    const { UNSAFE_getByType } = renderWithProviders(
      <HabitsLearnDetailScreen slug="two-minute-rule" />,
    );

    expect(screen.getByRole("heading", { name: "The two-minute rule" })).toBeTruthy();
    expect(screen.queryByTestId("module-field-gradient")).toBeNull();
    // The root carries the act room re-pour; a wrong or missing room fails here.
    expectRoomPour(UNSAFE_getByType(SafeAreaView), "act");
  });

  it("falls back to the index for an unknown slug, still on the room pour", () => {
    const { UNSAFE_getByType } = renderWithProviders(<HabitsLearnDetailScreen slug="nope" />);

    expect(screen.getByRole("heading", { name: "Habit building - core ideas" })).toBeTruthy();
    expectRoomPour(UNSAFE_getByType(SafeAreaView), "act");
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
