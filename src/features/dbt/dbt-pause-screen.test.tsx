import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import DbtPauseScreen from "./dbt-pause-screen";
import { useCopingPlan } from "@/src/features/dbt/queries";
import enDbt from "@/src/i18n/locales/en/dbt.json";
import { useNavigationOriginStore } from "@/src/stores/navigation-origin-store";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  usePathname: () => "/modules/dbt/pause",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/dbt/queries", () => ({
  useCopingPlan: jest.fn(),
}));

const mockUseCopingPlan = useCopingPlan as unknown as jest.Mock;

const item = (id: string, pickKey: string, position: number) => ({
  id,
  section: "distract" as const,
  kind: "pick" as const,
  pickKey,
  homeOnly: false,
  position,
});

beforeEach(() => {
  jest.clearAllMocks();
  useNavigationOriginStore.setState({ pending: null });
  mockUseCopingPlan.mockReturnValue({ data: null });
});

/** Walk the flow to the step at `index` (0-based). */
function advanceTo(index: number) {
  for (let step = 0; step < index; step += 1) fireEvent.press(screen.getByText("Next"));
}

describe("Pause and choose", () => {
  it("opens on the danger sentence, identical for everyone, with the door beneath it", () => {
    renderWithProviders(<DbtPauseScreen />);

    expect(screen.getByText("Step 1 of 4")).toBeTruthy();
    expect(screen.getByText(/If anyone is in danger right now/)).toBeTruthy();
    expect(screen.getByLabelText("Not for emergencies · Crisis resources")).toBeTruthy();
  });

  /**
   * ☠️ S2: no DBT surface branches on the person's state. Step one NAMES danger
   * and points at the door; it does not ask, and nothing the person does
   * changes what any later step says. A question here would be the
   * rating-triggered crisis prompt the whole module was specified to refuse.
   */
  it("asks the person nothing about their own safety", () => {
    renderWithProviders(<DbtPauseScreen />);

    const danger = enDbt.pause.steps.danger.body;
    expect(danger).not.toMatch(/\?/);
    expect(danger).not.toMatch(/are you|do you feel|is it safe/i);
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("keeps Stop on every step, and Stop leaves at once", () => {
    renderWithProviders(<DbtPauseScreen />);

    for (let step = 0; step < 4; step += 1) {
      expect(screen.getByText("Stop")).toBeTruthy();
      if (step < 3) fireEvent.press(screen.getByText("Next"));
    }

    fireEvent.press(screen.getByText("Stop"));
    expect(router.back).toHaveBeenCalled();
  });

  it("walks four steps and back again", () => {
    renderWithProviders(<DbtPauseScreen />);

    advanceTo(2);
    expect(screen.getByText("What is actually happening?")).toBeTruthy();
    expect(screen.getByText("What am I about to do?")).toBeTruthy();

    fireEvent.press(screen.getByText("Back"));
    expect(screen.getByText("Stop and breathe")).toBeTruthy();
  });

  it("offers two defaults and a way to build one when there is no plan", () => {
    renderWithProviders(<DbtPauseScreen />);
    advanceTo(3);

    expect(screen.getByText("A paced breathing session")).toBeTruthy();
    expect(screen.getByText("Step outside")).toBeTruthy();
    expect(screen.getByText("Build a plan")).toBeTruthy();
  });

  it("offers the first few rungs of the person's own list when there is one", () => {
    mockUseCopingPlan.mockReturnValue({
      data: {
        id: "plan-1",
        userId: "user-1",
        plan: {
          items: [
            item("a", "walk", 0),
            item("b", "stretch", 1),
            item("c", "shower", 2),
            item("d", "washUp", 3),
          ],
          fallback: ["a", "b", "c", "d"],
        },
      },
    });
    renderWithProviders(<DbtPauseScreen />);
    advanceTo(3);

    expect(screen.getByText("Go for a walk")).toBeTruthy();
    expect(screen.getByText("Stretch")).toBeTruthy();
    expect(screen.getByText("Have a shower")).toBeTruthy();
    // The first three, and only the first three: this is a nudge towards one
    // thing, not the whole plan reproduced inside a flow.
    expect(screen.queryByText("Wash up")).toBeNull();
    expect(screen.getByText("Open my plan")).toBeTruthy();
  });

  it("records where it came from when it hands over to a tool", () => {
    renderWithProviders(<DbtPauseScreen />);
    advanceTo(3);

    fireEvent.press(screen.getByText("A paced breathing session"));

    expect(useNavigationOriginStore.getState().pending).toEqual({
      origin: "/modules/dbt/pause",
      forPathname: "/tools/breathing",
    });
  });
});
