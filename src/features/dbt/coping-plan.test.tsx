import { fireEvent, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { CopingPlanCard } from "./coping-plan-card";
import DbtCopingPlanScreen from "./dbt-coping-plan-screen";
import DbtCopingPlanEditorScreen from "./dbt-coping-plan-editor-screen";
import {
  COPING_PLAN_PICKS,
  FALLBACK_MAX,
  FALLBACK_MIN,
  familiesOf,
  findPick,
} from "./coping-plan-registry";
import { useCopingPlan, useDeleteCopingPlan, useSaveCopingPlan } from "@/src/features/dbt/queries";
import { normalizeCopingPlanDocument } from "@/src/features/dbt/repository";
import type { CopingPlanDocument } from "@/src/features/dbt/types";
import enDbt from "@/src/i18n/locales/en/dbt.json";
import { useNavigationOriginStore } from "@/src/stores/navigation-origin-store";
import { renderWithProviders } from "@/test/render-with-providers";

let mockPathname = "/modules/dbt/coping-plan";

jest.mock("expo-router", () => ({
  router: { canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  usePathname: () => mockPathname,
  useFocusEffect: jest.fn(),
}));

// The sortable list needs Reanimated worklets the jest environment does not
// have; the shipped `routine-editor-screen.test.tsx` stubs it the same way.
// The ORDER of the list is asserted through state rather than through a drag,
// which no test in this repo simulates.
jest.mock("react-native-sortables", () => ({
  __esModule: true,
  default: {
    Flex: ({ children }: { children?: ReactNode }) => <>{children}</>,
    Handle: ({ children }: { children?: ReactNode }) => <>{children}</>,
  },
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/dbt/queries", () => ({
  useCopingPlan: jest.fn(),
  useSaveCopingPlan: jest.fn(),
  useDeleteCopingPlan: jest.fn(),
}));

const mockUseCopingPlan = useCopingPlan as unknown as jest.Mock;
const mockUseSave = useSaveCopingPlan as unknown as jest.Mock;
const mockUseDelete = useDeleteCopingPlan as unknown as jest.Mock;

const saveAsync = jest.fn().mockResolvedValue({});
const deleteAsync = jest.fn().mockResolvedValue(undefined);

function setPlan(plan: CopingPlanDocument | null, overrides: Record<string, unknown> = {}) {
  mockUseCopingPlan.mockReturnValue({
    data: plan === null ? null : { id: "plan-1", userId: "user-1", plan },
    isPending: false,
    isError: false,
    refetch: jest.fn(),
    ...overrides,
  });
}

const item = (
  id: string,
  section: "distract" | "soothe" | "remind",
  pickKey: string,
  position: number,
  homeOnly = false,
) => ({ id, section, kind: "pick" as const, pickKey, homeOnly, position });

beforeEach(() => {
  jest.clearAllMocks();
  mockPathname = "/modules/dbt/coping-plan";
  useNavigationOriginStore.setState({ pending: null });
  mockUseSave.mockReturnValue({ mutateAsync: saveAsync, isPending: false });
  mockUseDelete.mockReturnValue({ mutateAsync: deleteAsync, isPending: false });
  setPlan(null);
});

// ---------------------------------------------------------------------------
// The registry. Keys, not labels, are what a saved plan holds.
// ---------------------------------------------------------------------------
describe("the pick registry", () => {
  it("gives every pick a unique key that resolves to a label in the copy", () => {
    const keys = COPING_PLAN_PICKS.map((pick) => pick.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) {
      expect((enDbt.picks as Record<string, string>)[key]).toBeTruthy();
    }
  });

  it("names a family that has copy, for every pick outside the flat section", () => {
    for (const pick of COPING_PLAN_PICKS) {
      if (pick.family === null) {
        expect(pick.section).toBe("remind");
        continue;
      }
      expect((enDbt.families as Record<string, string>)[pick.family]).toBeTruthy();
    }
  });

  it("groups a section's picks into families in declaration order", () => {
    expect(familiesOf("distract").map((group) => group.family)).toEqual([
      "move",
      "makeOrFix",
      "someoneElse",
      "changeChannel",
      "count",
      "leave",
    ]);
    expect(familiesOf("remind").map((group) => group.family)).toEqual([null]);
  });

  /**
   * ☠️ The whole point of storing keys: an unknown one is survivable. A plan
   * built a year ago, whose pick has since been retired, renders the rest of
   * itself rather than a blank row or a crash.
   */
  it("resolves a retired key to nothing rather than to a blank", () => {
    expect(findPick("no-such-pick")).toBeUndefined();
    expect(findPick(undefined)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// The card.
// ---------------------------------------------------------------------------
describe("the coping plan card", () => {
  const plan: CopingPlanDocument = {
    items: [
      item("a", "distract", "walk", 0),
      item("b", "soothe", "aBlanket", 1, true),
      item("c", "remind", "thisWillPass", 2),
      item("d", "soothe", "anAmbientSound", 3),
    ],
    fallback: ["a", "b", "c"],
  };

  it("leads with the fallback list, named rather than numbered", () => {
    renderWithProviders(<CopingPlanCard plan={plan} />);

    expect(screen.getByText("If that doesn't work, next…")).toBeTruthy();
    expect(screen.getByText("First…")).toBeTruthy();
    expect(screen.getByText("If that doesn't help…")).toBeTruthy();
    expect(screen.getByText("Then…")).toBeTruthy();
  });

  it("marks a rung that only works at home", () => {
    renderWithProviders(<CopingPlanCard plan={plan} />);

    expect(screen.getByText("at home only")).toBeTruthy();
  });

  it("opens a route-bearing pick and records where it came from", () => {
    renderWithProviders(<CopingPlanCard plan={plan} />);

    fireEvent.press(screen.getByText("An ambient sound"));

    expect(useNavigationOriginStore.getState().pending).toEqual({
      origin: "/modules/dbt/coping-plan",
      forPathname: "/tools/meditation",
    });
  });

  /**
   * ☠️ This surface is opened IN a hard moment, and #1985 ruled it the one DBT
   * entry point that carries no crisis bar - it shows the plan, not a warning
   * above the plan. It also records nothing: no "I used this", no last-used
   * date, no count. Both are asserted because both are the kind of thing a
   * later "improvement" adds without noticing what it costs.
   */
  it("carries no crisis bar and offers nothing to complete", () => {
    renderWithProviders(<CopingPlanCard plan={plan} />);

    expect(screen.queryByLabelText("Not for emergencies · Crisis resources")).toBeNull();
    expect(screen.queryByText(/used this|mark as done|complete/i)).toBeNull();
  });

  it("drops an item whose pick has been retired rather than rendering a blank", () => {
    const withGhost: CopingPlanDocument = {
      items: [item("a", "distract", "walk", 0), item("z", "distract", "retired-pick", 1)],
      fallback: [],
    };
    renderWithProviders(<CopingPlanCard plan={withGhost} />);

    expect(screen.getByText("Go for a walk")).toBeTruthy();
    expect(screen.queryByText("retired-pick")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The route screen: card, or the invitation.
// ---------------------------------------------------------------------------
describe("the coping plan screen", () => {
  it("invites the person to build one when there is no plan", () => {
    renderWithProviders(<DbtCopingPlanScreen />);

    expect(screen.getByText("Your coping plan")).toBeTruthy();
    expect(screen.getByText("Build my plan")).toBeTruthy();
  });

  it("shows the plan, and a way back into the builder, when there is one", () => {
    setPlan({ items: [item("a", "distract", "walk", 0)], fallback: [] });
    renderWithProviders(<DbtCopingPlanScreen />);

    expect(screen.getByText("Go for a walk")).toBeTruthy();
    expect(screen.getByText("Edit")).toBeTruthy();
  });

  it("offers a retry, and says why, when the plan could not be read", () => {
    setPlan(null, { isPending: false, isError: true });
    renderWithProviders(<DbtCopingPlanScreen />);

    expect(screen.getByText("That did not load")).toBeTruthy();
    expect(screen.getByText("Try again")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// The builder.
// ---------------------------------------------------------------------------
describe("the coping plan builder", () => {
  beforeEach(() => {
    mockPathname = "/modules/dbt/coping-plan/edit";
  });

  it("carries the crisis bar, unlike the card it produces", () => {
    renderWithProviders(<DbtCopingPlanEditorScreen />);

    expect(screen.getByLabelText("Not for emergencies · Crisis resources")).toBeTruthy();
  });

  it("puts a chosen pick on the plan, by key", async () => {
    renderWithProviders(<DbtCopingPlanEditorScreen />);

    fireEvent.press(screen.getByText("Go for a walk"));
    fireEvent.press(screen.getByText("Save plan"));

    await screen.findByText("Save plan");
    expect(saveAsync).toHaveBeenCalledTimes(1);
    const [{ plan }] = saveAsync.mock.calls[0] as [{ plan: CopingPlanDocument }];
    expect(plan.items).toHaveLength(1);
    expect(plan.items[0]).toMatchObject({ section: "distract", kind: "pick", pickKey: "walk" });
    // ☠️ Never the label: a plan that stored "Go for a walk" would freeze this
    // day's copy into the person's document.
    expect(JSON.stringify(plan)).not.toContain("Go for a walk");
  });

  it("refuses a fallback list that is neither empty nor three to six long", async () => {
    setPlan({
      items: [item("a", "distract", "walk", 0), item("b", "soothe", "aBlanket", 1)],
      fallback: ["a"],
    });
    renderWithProviders(<DbtCopingPlanEditorScreen />);

    fireEvent.press(screen.getByText("Save plan"));

    expect(await screen.findByText("Choose three to six for the list")).toBeTruthy();
    expect(saveAsync).not.toHaveBeenCalled();
  });

  it("saves a plan whose list is exactly the length the card can read", async () => {
    const items = ["walk", "stretch", "shower"].map((key, index) =>
      item(`i${index}`, "distract", key, index),
    );
    setPlan({ items, fallback: items.map((entry) => entry.id) });
    renderWithProviders(<DbtCopingPlanEditorScreen />);

    fireEvent.press(screen.getByText("Save plan"));

    await screen.findByText("Save plan");
    expect(saveAsync).toHaveBeenCalledTimes(1);
    const [{ plan }] = saveAsync.mock.calls[0] as [{ plan: CopingPlanDocument }];
    expect(plan.fallback).toHaveLength(FALLBACK_MIN);
  });

  /**
   * ☠️ An item has to be ON the plan to be on the list. Taking it off the plan
   * has to take it off the list too, or the card renders a rung pointing at
   * nothing - which the repository's normaliser also guards, from the other
   * side.
   */
  it("takes an item off the fallback list when it leaves the plan", () => {
    const document: CopingPlanDocument = {
      items: [item("a", "distract", "walk", 0)],
      fallback: ["a", "gone"],
    };
    expect(normalizeCopingPlanDocument(document).fallback).toEqual(["a"]);
  });

  it("holds the list to the readable maximum", () => {
    expect(FALLBACK_MAX).toBe(6);
    expect(FALLBACK_MIN).toBe(3);
  });
});
