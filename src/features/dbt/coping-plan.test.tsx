import { fireEvent, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { ActivityIndicator } from "react-native";

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
    isPaused: false,
    isError: false,
    refetch: jest.fn(),
    ...overrides,
  });
}

/**
 * The query after a read that FAILED before anything landed. `data` is
 * `undefined`, not `null`: query-core never clears data on an error, so
 * `undefined` is the only shape a cold failure has - and `null` is a read that
 * found no plan yet, which the builder can and must mount over (#2236).
 */
function setPlanFailed() {
  mockUseCopingPlan.mockReturnValue({
    data: undefined,
    isPending: false,
    isPaused: false,
    isError: true,
    refetch: jest.fn(),
  });
}

/** The query as it is on a cold arrival: nothing read yet, nothing to seed from. */
function setPlanPending() {
  mockUseCopingPlan.mockReturnValue({
    data: undefined,
    isPending: true,
    isPaused: false,
    isError: false,
    refetch: jest.fn(),
  });
}

/**
 * The query as it is on an OFFLINE arrival (#2231). `networkMode: "online"` is
 * the default for queries here, so the fetch never starts: `status` stays
 * `"pending"` while `fetchStatus` is `"paused"`, which query-core 5 surfaces as
 * `isPending` true, `isPaused` true, and `isFetching`/`isLoading`/`isError` all
 * false. Nothing read, and nothing coming until the connection does.
 */
function setPlanPaused() {
  mockUseCopingPlan.mockReturnValue({
    data: undefined,
    isPending: true,
    isPaused: true,
    isError: false,
    refetch: jest.fn(),
  });
}

const item = (
  id: string,
  section: "distract" | "soothe" | "remind",
  pickKey: string,
  position: number,
  homeOnly = false,
) => ({ id, section, kind: "pick" as const, pickKey, homeOnly, position });

/**
 * A stored plan as the database lets one be stored: the fallback list is three
 * to six ids, never empty (#2194), so a Save over this document is legal.
 */
const readPlan = (): CopingPlanDocument => ({
  items: [
    item("a", "distract", "walk", 0),
    item("b", "soothe", "aBlanket", 1),
    item("c", "remind", "thisWillPass", 2),
  ],
  fallback: ["a", "b", "c"],
});

/** Press a candidate chip under the fallback heading, by the name it announces. */
const addToList = (label: string) =>
  fireEvent.press(screen.getByLabelText(`Add ${label} to the list`));

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
    setPlanFailed();
    renderWithProviders(<DbtCopingPlanScreen />);

    expect(screen.getByText("That did not load")).toBeTruthy();
    expect(screen.getByText("Try again")).toBeTruthy();
  });

  /**
   * ☠️ #2237, the editor's #2231 on the read screen: a query paused for want
   * of a network is `isPending` too, and a paused query never errors, so a
   * gate keyed on `isPending` alone left an offline arrival on a spinner with
   * the retry beside it unreachable.
   */
  it("says so, and offers the read again, when there is no network to read over", () => {
    setPlanPaused();
    renderWithProviders(<DbtCopingPlanScreen />);

    expect(screen.getByText("That did not load")).toBeTruthy();
    expect(screen.getByText("Try again")).toBeTruthy();
    expect(screen.UNSAFE_queryByType(ActivityIndicator)).toBeNull();
  });

  it("keeps the spinner for a read that is actually happening", () => {
    setPlanPending();
    renderWithProviders(<DbtCopingPlanScreen />);

    expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    expect(screen.queryByText("That did not load")).toBeNull();
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

    // Three picks and all three on the list: the shortest plan the database
    // accepts (#2194), so what this pins is the SHAPE of a saved pick.
    fireEvent.press(screen.getByText("Go for a walk"));
    fireEvent.press(screen.getByText("Stretch"));
    fireEvent.press(screen.getByText("Have a shower"));
    addToList("Go for a walk");
    addToList("Stretch");
    addToList("Have a shower");
    fireEvent.press(screen.getByText("Save plan"));

    await screen.findByText("Save plan");
    expect(saveAsync).toHaveBeenCalledTimes(1);
    const [{ plan }] = saveAsync.mock.calls[0] as [{ plan: CopingPlanDocument }];
    expect(plan.items).toHaveLength(3);
    expect(plan.items[0]).toMatchObject({ section: "distract", kind: "pick", pickKey: "walk" });
    expect(plan.fallback).toEqual(plan.items.map((entry) => entry.id));
    // ☠️ Never the label: a plan that stored "Go for a walk" would freeze this
    // day's copy into the person's document.
    expect(JSON.stringify(plan)).not.toContain("Go for a walk");
  });

  it("refuses a fallback list that is shorter than three", async () => {
    setPlan({
      items: [item("a", "distract", "walk", 0), item("b", "soothe", "aBlanket", 1)],
      fallback: ["a"],
    });
    renderWithProviders(<DbtCopingPlanEditorScreen />);

    fireEvent.press(screen.getByText("Save plan"));

    expect(await screen.findByText("Choose three to six for the list")).toBeTruthy();
    expect(saveAsync).not.toHaveBeenCalled();
  });

  /**
   * ☠️ #2194. The validator used to exempt an EMPTY list, and the database
   * guard (`dbt_coping_plans_guard`) never did: it rejects fewer than three on
   * insert and update alike. A first-time builder who left the list at
   * "Nothing on the list yet" submitted a plan that was always refused, and
   * heard only a title-only "That did not save" with no field named. The
   * client rule is the guard's rule, and the list is named before the write.
   */
  it("refuses an empty fallback list, which the database refuses too", async () => {
    setPlan({ items: [item("a", "distract", "walk", 0)], fallback: [] });
    renderWithProviders(<DbtCopingPlanEditorScreen />);

    fireEvent.press(screen.getByText("Save plan"));

    expect(await screen.findByText("Choose three to six for the list")).toBeTruthy();
    expect(saveAsync).not.toHaveBeenCalled();
  });

  /**
   * ☠️ #2201. The chip's label REPLACES its visible text for a screen reader,
   * so a bare "Add to the list" made every candidate announce the same thing
   * and the list could only be built by tapping blind. Both branches of the
   * label name the item.
   */
  it("names the item on every candidate chip, on and off the list", () => {
    setPlan({
      items: [item("a", "distract", "walk", 0), item("b", "soothe", "aBlanket", 1)],
      fallback: [],
    });
    renderWithProviders(<DbtCopingPlanEditorScreen />);

    expect(screen.getByLabelText("Add Go for a walk to the list")).toBeTruthy();
    expect(screen.getByLabelText("Add A blanket to the list")).toBeTruthy();
    expect(screen.queryAllByLabelText("Add to the list")).toHaveLength(0);

    addToList("Go for a walk");

    // The chip flips to the named remove - the list's own row carries the same
    // label, so there are two of it now and none of the add.
    expect(screen.queryByLabelText("Add Go for a walk to the list")).toBeNull();
    expect(screen.getAllByLabelText("Take Go for a walk off the list")).toHaveLength(2);
    expect(screen.getByLabelText("Add A blanket to the list")).toBeTruthy();
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

  /**
   * ☠️ #2204. The builder holds the whole document in local state, seeded once,
   * and Save is a whole-document replace with no versions and no undo. Rendered
   * against an unresolved query it would seed EMPTY, and the Save a moment
   * later - `existing` having landed by then, so the id is there to update -
   * would write that emptiness over the person's stored plan. A cold arrival is
   * ordinary: the web query cache is memory-only, so a reload or a deep link
   * onto this route mounts against `undefined` every time.
   */
  describe("before the stored plan has been read", () => {
    it("offers nothing to build or save while the plan is still being read", () => {
      setPlanPending();
      renderWithProviders(<DbtCopingPlanEditorScreen />);

      expect(screen.queryByText("Save plan")).toBeNull();
      expect(screen.queryByText("Go for a walk")).toBeNull();
      expect(screen.getByText("Your coping plan")).toBeTruthy();
    });

    it("does not write an empty plan over the stored one when the read lands after mount", async () => {
      setPlanPending();
      const { rerender } = renderWithProviders(<DbtCopingPlanEditorScreen />);

      // The read lands a beat later, exactly as it does on a cold web load.
      setPlan(readPlan());
      rerender(<DbtCopingPlanEditorScreen />);

      fireEvent.press(screen.getByText("Save plan"));

      await screen.findByText("Save plan");
      expect(saveAsync).toHaveBeenCalledTimes(1);
      const [{ plan }] = saveAsync.mock.calls[0] as [{ plan: CopingPlanDocument }];
      expect(plan.items.map((entry) => entry.pickKey)).toEqual([
        "walk",
        "aBlanket",
        "thisWillPass",
      ]);
    });

    it("says the read failed, and refuses to build, rather than offering a blank plan", () => {
      setPlanFailed();
      renderWithProviders(<DbtCopingPlanEditorScreen />);

      expect(screen.getByText("That did not load")).toBeTruthy();
      expect(screen.getByText("Try again")).toBeTruthy();
      expect(screen.queryByText("Save plan")).toBeNull();
    });

    /**
     * ☠️ #2231. A query paused for want of a network is `isPending` too, so a
     * gate keyed on `isPending` alone left an offline arrival on a spinner it
     * could never leave: a paused query never errors, so the retry branch
     * beside it was unreachable. The waiting state has to be reserved for a
     * read that is actually happening.
     */
    it("says so, and offers the read again, when there is no network to read over", () => {
      setPlanPaused();
      renderWithProviders(<DbtCopingPlanEditorScreen />);

      expect(screen.getByText("That did not load")).toBeTruthy();
      expect(screen.getByText("Try again")).toBeTruthy();
      // The loading body carries the edit title; the honest state must have
      // replaced it rather than sat alongside it.
      expect(screen.queryByText("Your coping plan")).toBeNull();
    });

    it("builds nothing, and saves nothing, over a plan it could not read for want of a network", () => {
      setPlanPaused();
      renderWithProviders(<DbtCopingPlanEditorScreen />);

      expect(screen.queryByText("Save plan")).toBeNull();
      expect(screen.queryByText("Go for a walk")).toBeNull();
      expect(saveAsync).not.toHaveBeenCalled();
    });

    /**
     * ☠️ The other half of #2231, and the reason the gate is `isPending &&
     * isPaused` rather than `isPaused`: a BACKGROUND refetch that pauses when
     * the connection drops mid-edit is `isPaused` with `status: "success"`.
     * Treating that as an unread plan would tear the builder down and take
     * everything the person had typed with it.
     */
    it("keeps the builder, and the person's edits, when a background refetch pauses mid-edit", async () => {
      setPlan(readPlan());
      const { rerender } = renderWithProviders(<DbtCopingPlanEditorScreen />);

      fireEvent.press(screen.getByText("Have a shower"));

      // The connection drops: the refetch pauses over data already read.
      setPlan(readPlan(), { isPaused: true });
      rerender(<DbtCopingPlanEditorScreen />);

      expect(screen.queryByText("That did not load")).toBeNull();
      fireEvent.press(screen.getByText("Save plan"));

      await screen.findByText("Save plan");
      const [{ plan }] = saveAsync.mock.calls[0] as [{ plan: CopingPlanDocument }];
      expect(plan.items.map((entry) => entry.pickKey)).toEqual([
        "walk",
        "aBlanket",
        "thisWillPass",
        "shower",
      ]);
    });

    /**
     * ☠️ #2236, the error half of the same gate. A background refetch that
     * FAILS over a plan already read is `isError` with `data` still there -
     * query-core's `isRefetchError` - and a focus refetch failing a minute
     * into an edit is ordinary. Bare `isError` in the gate swapped the builder
     * for the shut door and destroyed everything typed; Try again re-seeded
     * from the stored document, so the session's work was unrecoverable.
     */
    it("keeps the builder, and the person's edits, when a background refetch fails mid-edit", async () => {
      setPlan(readPlan());
      const { rerender } = renderWithProviders(<DbtCopingPlanEditorScreen />);

      fireEvent.press(screen.getByText("Have a shower"));

      // The refetch fails over data already read: status "error", data kept.
      setPlan(readPlan(), { isError: true });
      rerender(<DbtCopingPlanEditorScreen />);

      expect(screen.queryByText("That did not load")).toBeNull();
      fireEvent.press(screen.getByText("Save plan"));

      await screen.findByText("Save plan");
      const [{ plan }] = saveAsync.mock.calls[0] as [{ plan: CopingPlanDocument }];
      expect(plan.items.map((entry) => entry.pickKey)).toEqual([
        "walk",
        "aBlanket",
        "thisWillPass",
        "shower",
      ]);
    });

    /**
     * ☠️ The trap inside #2236: a first-time builder edits over `null` - a
     * read that found no plan - and `null` is not `undefined`. A gate that
     * treated "no document" as "nothing read" would tear down exactly the
     * plan most worth keeping, the one being built from scratch.
     */
    it("keeps a first plan mid-build when the refetch behind it fails", async () => {
      setPlan(null);
      const { rerender } = renderWithProviders(<DbtCopingPlanEditorScreen />);

      fireEvent.press(screen.getByText("Go for a walk"));
      fireEvent.press(screen.getByText("Stretch"));
      fireEvent.press(screen.getByText("Have a shower"));
      addToList("Go for a walk");
      addToList("Stretch");
      addToList("Have a shower");

      setPlan(null, { isError: true });
      rerender(<DbtCopingPlanEditorScreen />);

      expect(screen.queryByText("That did not load")).toBeNull();
      fireEvent.press(screen.getByText("Save plan"));

      await screen.findByText("Save plan");
      expect(saveAsync).toHaveBeenCalledTimes(1);
      const [{ plan }] = saveAsync.mock.calls[0] as [{ plan: CopingPlanDocument }];
      expect(plan.items.map((entry) => entry.pickKey)).toEqual(["walk", "stretch", "shower"]);
      expect(plan.fallback).toHaveLength(3);
    });

    /**
     * ☠️ The opposite bug, and the reason the fix is a gate rather than a
     * re-seeding effect: once the builder is up, a later read must not touch
     * what the person has put on the plan. This one passed before the gate too
     * - it is here to stop a future re-seed from being introduced.
     */
    it("keeps what the person has just added when the query resolves again underneath it", async () => {
      setPlan(readPlan());
      const { rerender } = renderWithProviders(<DbtCopingPlanEditorScreen />);

      fireEvent.press(screen.getByText("Have a shower"));

      // A refetch delivers the stored document again, as a fresh object.
      setPlan(readPlan());
      rerender(<DbtCopingPlanEditorScreen />);

      fireEvent.press(screen.getByText("Save plan"));

      await screen.findByText("Save plan");
      const [{ plan }] = saveAsync.mock.calls[0] as [{ plan: CopingPlanDocument }];
      expect(plan.items.map((entry) => entry.pickKey)).toEqual([
        "walk",
        "aBlanket",
        "thisWillPass",
        "shower",
      ]);
    });
  });
});
